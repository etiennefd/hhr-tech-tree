"use client";

// Add type declaration for global mouse position
declare global {
  interface Window {
    mouseX: number;
    mouseY: number;
  }
}

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
  memo,
} from "react";
import dynamic from "next/dynamic";
import CurvedConnections from "../components/connections/CurvedConnections";
import type { ConnectionType } from "../components/connections/CurvedConnections";
import BrutalistNode from "../components/nodes/BrutalistNode";
import { SearchResult } from "./SearchBox";
import { TechNode } from "@/types/tech-node";
import { FilterState } from "@/types/filters";
import { cacheManager, CACHE_VERSION } from "@/utils/cache";
import Link from 'next/link';
import { debounce } from 'lodash';

// Timeline scale boundaries
const YEAR_INDUSTRIAL = 1750;
const YEAR_EARLY_MODERN = 1500;
const YEAR_LATE_ANTIQUITY = -200;
const YEAR_MIDDLE_ANTIQUITY = -1000;
const YEAR_EARLY_ANTIQUITY = -5000;
const YEAR_NEOLITHIC = -10000;
const YEAR_UPPER_PALEOLITHIC = -50000;
const YEAR_MIDDLE_PALEOLITHIC = -100000;

// Timeline intervals for each period
const INTERVAL_INDUSTRIAL = 1;
const INTERVAL_EARLY_MODERN = 5;
const INTERVAL_LATE_ANTIQUITY = 20;
const INTERVAL_MIDDLE_ANTIQUITY = 50;
const INTERVAL_EARLY_ANTIQUITY = 100;
const INTERVAL_NEOLITHIC = 500;
const INTERVAL_UPPER_PALEOLITHIC = 1000;
const INTERVAL_MIDDLE_PALEOLITHIC = 5000;
const INTERVAL_EARLY_PALEOLITHIC = 100000;

// 1. Move these constants outside the component to avoid recreating them
const NODE_WIDTH = 160;
const VERTICAL_SPACING = 50;
const YEAR_WIDTH = 240;
const PADDING = 120;
const INFO_BOX_HEIGHT = 500; // Add this constant for the info box height

// Add these constants near the other constants
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 1;

// Add these constants near other constants
const ZOOM_DEBOUNCE_MS = 16; // About 1 frame at 60fps

// 2. Lazy load non-critical components
const TechTreeMinimap = dynamic(() => import("./Minimap"), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-4 right-4 bg-white/80 border border-black p-2">
      Loading map...
    </div>
  ),
});

const DynamicSearchBox = dynamic(
  () => import("./SearchBox").then((mod) => ({ default: mod.SearchBox })),
  {
    ssr: false,
    loading: () => null,
  }
);

const DynamicFilterBox = dynamic(
  () => import("./FilterBox").then((mod) => ({ default: mod.FilterBox })),
  {
    ssr: false,
    loading: () => null,
  }
);

interface Link {
  source: string;
  target: string;
  type: ConnectionType;
  details?: string;
}

interface NodePosition {
  y: number;
  height: number;
}

interface MinimapNode {
  id: string;
  x: number;
  y: number;
  year: number;
}

// Add these interfaces near the other interfaces
interface Touch {
  clientX: number;
  clientY: number;
}

interface TouchState {
  touches: Touch[];
  scale: number;
  startDistance?: number;
}

// Add these to your existing interfaces section
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

function getTimelineSegment(year: number) {
  if (year >= YEAR_INDUSTRIAL) return year;
  if (year >= YEAR_EARLY_MODERN)
    return Math.floor(year / INTERVAL_EARLY_MODERN) * INTERVAL_EARLY_MODERN;
  if (year >= YEAR_LATE_ANTIQUITY)
    return Math.floor(year / INTERVAL_LATE_ANTIQUITY) * INTERVAL_LATE_ANTIQUITY;
  if (year >= YEAR_MIDDLE_ANTIQUITY)
    return (
      Math.floor(year / INTERVAL_MIDDLE_ANTIQUITY) * INTERVAL_MIDDLE_ANTIQUITY
    );
  if (year >= YEAR_EARLY_ANTIQUITY)
    return (
      Math.floor(year / INTERVAL_EARLY_ANTIQUITY) * INTERVAL_EARLY_ANTIQUITY
    );
  if (year >= YEAR_NEOLITHIC)
    return Math.floor(year / INTERVAL_NEOLITHIC) * INTERVAL_NEOLITHIC;
  if (year >= YEAR_UPPER_PALEOLITHIC)
    return (
      Math.floor(year / INTERVAL_UPPER_PALEOLITHIC) * INTERVAL_UPPER_PALEOLITHIC
    );
  if (year >= YEAR_MIDDLE_PALEOLITHIC)
    return (
      Math.floor(year / INTERVAL_MIDDLE_PALEOLITHIC) *
      INTERVAL_MIDDLE_PALEOLITHIC
    );
  return (
    Math.floor(year / INTERVAL_EARLY_PALEOLITHIC) * INTERVAL_EARLY_PALEOLITHIC
  );
}

function getTimelineYears(minYear: number, maxYear: number): number[] {
  const years: number[] = [];
  let current = getTimelineSegment(minYear);

  while (current <= maxYear) {
    years.push(current);

    if (current >= YEAR_INDUSTRIAL) current += INTERVAL_INDUSTRIAL;
    else if (current >= YEAR_EARLY_MODERN) current += INTERVAL_EARLY_MODERN;
    else if (current >= YEAR_LATE_ANTIQUITY) current += INTERVAL_LATE_ANTIQUITY;
    else if (current >= YEAR_MIDDLE_ANTIQUITY)
      current += INTERVAL_MIDDLE_ANTIQUITY;
    else if (current >= YEAR_EARLY_ANTIQUITY)
      current += INTERVAL_EARLY_ANTIQUITY;
    else if (current >= YEAR_NEOLITHIC) current += INTERVAL_NEOLITHIC;
    else if (current >= YEAR_UPPER_PALEOLITHIC)
      current += INTERVAL_UPPER_PALEOLITHIC;
    else if (current >= YEAR_MIDDLE_PALEOLITHIC)
      current += INTERVAL_MIDDLE_PALEOLITHIC;
    else current += INTERVAL_EARLY_PALEOLITHIC;
  }

  return years;
}

function calculateXPosition(
  year: number,
  minYear: number,
  PADDING: number,
  YEAR_WIDTH: number
) {
  const alignedYear = getTimelineSegment(year);
  const alignedMinYear = getTimelineSegment(minYear);

  let spaces = 0;
  let current = alignedMinYear;

  while (current < alignedYear) {
    if (current >= YEAR_INDUSTRIAL) current += INTERVAL_INDUSTRIAL;
    else if (current >= YEAR_EARLY_MODERN) current += INTERVAL_EARLY_MODERN;
    else if (current >= YEAR_LATE_ANTIQUITY) current += INTERVAL_LATE_ANTIQUITY;
    else if (current >= YEAR_MIDDLE_ANTIQUITY)
      current += INTERVAL_MIDDLE_ANTIQUITY;
    else if (current >= YEAR_EARLY_ANTIQUITY)
      current += INTERVAL_EARLY_ANTIQUITY;
    else if (current >= YEAR_NEOLITHIC) current += INTERVAL_NEOLITHIC;
    else if (current >= YEAR_UPPER_PALEOLITHIC)
      current += INTERVAL_UPPER_PALEOLITHIC;
    else if (current >= YEAR_MIDDLE_PALEOLITHIC)
      current += INTERVAL_MIDDLE_PALEOLITHIC;
    else current += INTERVAL_EARLY_PALEOLITHIC;
    spaces += 1;
  }

  return PADDING + spaces * YEAR_WIDTH;
}

const IntroBox = memo(() => {
  const [counts, setCounts] = useState({ nodes: 0, links: 0 });
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };
  const numberStyle = { 
    color: darkerBlue, 
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" 
  };

  // Get counts from cache and data
  useEffect(() => {
    const getCounts = async () => {
      try {
        // First try to get cached data
        const cachedData = await cacheManager.get();
        if (cachedData?.detailData) {
          setCounts({
            nodes: cachedData.detailData.nodes.length,
            links: cachedData.detailData.links.length
          });
        } else if (cachedData?.basicData) {
          setCounts({
            nodes: cachedData.basicData.nodes.length,
            links: cachedData.basicData.links.length
          });
        }

        // Then fetch fresh data
        const response = await fetch("/api/inventions");
        const freshData = await response.json();
        setCounts({
          nodes: freshData.nodes.length,
          links: freshData.links.length
        });
      } catch (error) {
        console.error("Failed to fetch counts:", error);
      }
    };
    getCounts();
  }, []);

  return (
    <div className="absolute left-4 top-12 p-6 w-[400px] z-50">
      <h1 className="text-2xl font-bold mb-2" style={{ color: darkerBlue }}>
        HISTORICAL TECH TREE
      </h1>
      <p className="text-sm mb-4" style={{ color: darkerBlue }}>
        A project by{" "}
        <a
          href="https://www.hopefulmons.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          Étienne Fortier-Dubois
        </a>
      </p>

      <p className="text-sm mb-4" style={{ color: darkerBlue }}>
        The tech tree is an interactive visualization of technological history from 3
        million years ago to today. A work in progress, it currently contains{" "}
        <span style={numberStyle}>{counts.nodes}</span> technologies and{" "}
        <span style={numberStyle}>{counts.links}</span> connections
        between them.
      </p>

      <div className="text-sm space-x-4">
        <Link href="/about" style={linkStyle}>
          Read more
        </Link>
        <Link href="/contribute" style={linkStyle}>
          Contribute
        </Link>
      </div>
    </div>
  );
});

IntroBox.displayName = "IntroBox";

// Add this helper function near other utility functions, before the TechTreeViewer component
const cleanLocationForTooltip = (location: string | undefined): string | undefined => {
  if (!location) return undefined;
  return location.replace(/ \(unspecified\)/g, '');
};

export function TechTreeViewer() {
  const [isLoading, setIsLoading] = useState(true);
  const [isError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<TechNode | null>(null);
  const [filteredNodes, setFilteredNodes] = useState<TechNode[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [data, setData] = useState<{ nodes: TechNode[]; links: Link[] }>({
    nodes: [],
    links: [],
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(
    null
  );
  const [totalHeight, setTotalHeight] = useState(1000); // Default height
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    fields: new Set(),
    countries: new Set(),
    cities: new Set(),
  });
  const [highlightedAncestors, setHighlightedAncestors] = useState<Set<string>>(
    new Set()
  );
  const [highlightedDescendants, setHighlightedDescendants] = useState<
    Set<string>
  >(new Set());
  const currentNodesRef = useRef<TechNode[]>([]);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isMobile, setIsMobile] = useState(false);
  const touchStateRef = useRef<TouchState>({ touches: [], scale: 1 });
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const getXPosition = useCallback(
    (year: number) => {
      if (!data.nodes.length) return 0;
      const minYear = Math.min(...data.nodes.map((n) => n.year));
      return calculateXPosition(year, minYear, PADDING, YEAR_WIDTH);
    },
    [data.nodes]
  );

  const horizontalScrollContainerRef = useRef<HTMLDivElement>(null);
  const verticalScrollContainerRef = useRef<HTMLDivElement>(null);

  const calculateNodePositions = useCallback(
    (nodes: TechNode[]): TechNode[] => {
      if (!nodes.length) return [];

      // Add a seeded random number generator
      const seededRandom = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        // Create a decimal between 0 and 1 using the hash
        return (Math.abs(hash) % 1000) / 1000;
      };

      function estimateNodeHeight(node: TechNode): number {
        // Base heights for fixed elements
        const IMAGE_HEIGHT = 80; // Image container
        const PADDING = 24; // Total vertical padding
        const BORDERS = 2; // Top + bottom borders

        let height = IMAGE_HEIGHT + PADDING + BORDERS;

        // Title height (assuming ~15 chars per line at current width)
        const titleLines = Math.ceil(node.title.length / 15);
        height += titleLines * 24; // Line height for title text

        // Subtitle if present
        if (node.subtitle) {
          const subtitleLines = Math.ceil(node.subtitle.length / 20);
          height += subtitleLines * 16; // Smaller line height for subtitle
        }

        // Year display badge
        height += 28; // Fixed height for year container

        // Field tags (assuming 2 tags per line)
        const fieldLines = Math.ceil(node.fields.length / 2);
        height += fieldLines * 24;

        return height;
      }

      const minYear = Math.min(...nodes.map((n) => n.year));
      const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);
      const positionedNodes: TechNode[] = [];
      const yearGroups = new Map();

      // Ensure minimum distance from top of viewport
      const ABSOLUTE_MIN_Y = 50;

      // Define fixed vertical bands (pixels from top) - compressed by ~2.5x
      const VERTICAL_BANDS: Record<string, number> = {
        // Food & Agriculture (0-300)
        Food: Math.max(150, ABSOLUTE_MIN_Y),
        Agriculture: Math.max(200, ABSOLUTE_MIN_Y),

        // Life Sciences (300-500)
        Biology: 300,
        Medicine: 350,
        Sanitation: 400,

        // Physical Sciences (500-800)
        Physics: 500,
        Chemistry: 550,
        Astronomy: 600,
        Meteorology: 700,
        Optics: 750,

        // Energy & Electronics (800-1000)
        Electricity: 800,
        Electronics: 850,
        Energy: 900,
        Lighting: 950,

        // Construction/Materials (1000-1300)
        Construction: 1000,
        Mining: 1050,
        Metallurgy: 1100,
        Manufacturing: 1150,
        Textiles: 1200,
        Hydraulics: 1250,

        // Transportation/Movement (1300-1600)
        Transportation: 1300,
        Flying: 1350,
        Sailing: 1400,
        Space: 1450,
        Cartography: 1500,

        // Computing/Math (1600-1800)
        Mathematics: 1600,
        Measurement: 1650,
        Timekeeping: 1700,
        Computing: 1750,

        // Safety/Protection/Governance (1800-2100)
        Security: 1800,
        Weaponry: 1850,
        Finance: 1900,
        Governance: 2000,

        // Culture (2100-2400)
        Communication: 2100,
        "Visual media": 2150,
        Recreation: 2200,
        Music: 2250,

        // Miscellaneous
        Misc: 2300,
      };

      // Group nodes by year
      sortedNodes.forEach((node) => {
        const alignedYear = getTimelineSegment(node.year);
        if (!yearGroups.has(alignedYear)) {
          yearGroups.set(alignedYear, []);
        }
        yearGroups.get(alignedYear).push(node);
      });

      yearGroups.forEach((nodesInYear, year) => {
        const x = calculateXPosition(year, minYear, PADDING, YEAR_WIDTH);
        const usedPositions: NodePosition[] = []; // Will store {y, height} objects
        const MIN_VERTICAL_GAP = VERTICAL_SPACING;

        nodesInYear.sort((a: TechNode, b: TechNode) => {
          const aPos = a.fields?.[0]
            ? VERTICAL_BANDS[a.fields[0]] || 1200
            : 1200;
          const bPos = b.fields?.[0]
            ? VERTICAL_BANDS[b.fields[0]] || 1200
            : 1200;
          return aPos - bPos;
        });

        nodesInYear.forEach((node: TechNode) => {
          const nodeHeight = estimateNodeHeight(node);

          // Create seed string for base position
          const baseSeedString = `base-${node.id}-${node.title}-${
            node.year
          }-${node.fields.join(",")}`;

          // Special handling for stone tools node
          let basePosition;
          if (node.title.toLowerCase() === "stone tool") {
            // Position stone tools node below the info box
            basePosition = INFO_BOX_HEIGHT;
          } else {
            // Get base position from primary field, ensuring minimum Y
            basePosition = Math.max(
              ABSOLUTE_MIN_Y,
              (node.fields?.[0] ? VERTICAL_BANDS[node.fields[0]] || 1200 : 1200) +
                (seededRandom(baseSeedString) - 0.5) * 100
            );
          }

          const isOverlapping = (testPosition: number): boolean => {
            if (testPosition < ABSOLUTE_MIN_Y) return true;

            const testBottom = testPosition + nodeHeight;

            return usedPositions.some(({ y: usedY, height: usedHeight }) => {
              const usedBottom = usedY + usedHeight;
              return !(
                testBottom < usedY ||
                testPosition > usedBottom + MIN_VERTICAL_GAP
              );
            });
          };

          let finalPosition = basePosition;
          let attempts = 0;
          const maxAttempts = 20;
          const searchRadius = MIN_VERTICAL_GAP * 2;

          while (isOverlapping(finalPosition) && attempts < maxAttempts) {
            const step = Math.ceil(attempts / 2) * (MIN_VERTICAL_GAP / 2);
            const direction = attempts % 2 === 0 ? 1 : -1;

            if (step > searchRadius) {
              finalPosition = basePosition + direction * searchRadius;
            } else {
              finalPosition = basePosition + direction * step;
            }
            finalPosition = Math.max(ABSOLUTE_MIN_Y, finalPosition);
            attempts++;
          }

          if (isOverlapping(finalPosition) && usedPositions.length > 0) {
            const lastPosition = usedPositions[usedPositions.length - 1];
            finalPosition = Math.max(
              ABSOLUTE_MIN_Y,
              lastPosition.y + lastPosition.height + MIN_VERTICAL_GAP
            );
          }

          // Use different seed string for final offset to get different randomization
          const offsetSeedString = `offset-${node.id}-${node.title}-${
            node.year
          }-${node.fields.join(",")}`;
          const randomOffset = (seededRandom(offsetSeedString) - 0.5) * 50;
          finalPosition = Math.max(
            ABSOLUTE_MIN_Y,
            finalPosition + randomOffset
          );

          while (isOverlapping(finalPosition)) {
            finalPosition += MIN_VERTICAL_GAP / 8;
          }

          usedPositions.push({ y: finalPosition, height: nodeHeight });
          positionedNodes.push({
            ...node,
            x,
            y: finalPosition,
          });
        });
      });

      const maxY = Math.max(
        ...positionedNodes.map(
          (node) => (node.y ?? 0) + estimateNodeHeight(node)
        )
      );
      setTotalHeight(maxY);

      return positionedNodes;
    },
    []
  );

  // EFFECTS

  // 3. Optimize initial data fetching
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      let cachedData = null; // Move declaration outside try block
      try {
        // Check cache first for immediate display
        cachedData = await cacheManager.get();

        if (!cachedData) {
          setIsLoading(true);
        }

        if (cachedData?.detailData) {
          // If we have detailed data in cache, use it and skip basic data fetch
          const positionedDetailNodes = calculateNodePositions(
            cachedData.detailData.nodes
          );
          setData({ ...cachedData.detailData, nodes: positionedDetailNodes });
          setFilteredNodes(positionedDetailNodes);
          setIsLoading(false);
        } else if (cachedData?.basicData) {
          // If we only have basic data, use it temporarily
          const positionedNodes = calculateNodePositions(
            cachedData.basicData.nodes
          );
          setData({ ...cachedData.basicData, nodes: positionedNodes });
          setFilteredNodes(positionedNodes);
          setIsLoading(false);
        }

        // If we don't have detailed cached data, fetch fresh basic data
        if (!cachedData?.detailData) {
          const basicResponse = await fetch("/api/inventions", {
            signal: controller.signal,
            priority: "high",
          });
          if (!basicResponse.ok)
            throw new Error(`HTTP error! status: ${basicResponse.status}`);
          const basicData = await basicResponse.json();

          if (!isMounted) return;

          // Only update if we don't have detailed data yet
          if (!cachedData?.detailData) {
            const positionedNodes = calculateNodePositions(basicData.nodes);
            setData({ ...basicData, nodes: positionedNodes });
            setFilteredNodes(positionedNodes);
            setIsLoading(false);

            // Cache basic data
            await cacheManager.set({
              version: CACHE_VERSION,
              timestamp: Date.now(),
              basicData,
            });
          }
        }

        // Always fetch fresh detailed data
        const detailResponse = await fetch("/api/inventions?detail=true", {
          signal: controller.signal,
        });
        if (!detailResponse.ok)
          throw new Error(`HTTP error! status: ${detailResponse.status}`);
        const detailData = await detailResponse.json();

        if (!isMounted) return;

        // Compare current and new data before updating
        const hasChanges = detailData.nodes.some(
          (newNode: TechNode, index: number) => {
            const currentNode = currentNodesRef.current[index];
            if (!currentNode) return true;

            // Compare relevant fields that would affect display
            return (
              newNode.title !== currentNode.title ||
              newNode.year !== currentNode.year ||
              newNode.fields.join(",") !== currentNode.fields.join(",") ||
              newNode.image !== currentNode.image
            );
          }
        );

        // Only update if there are actual changes
        if (hasChanges) {
          const positionedDetailNodes = calculateNodePositions(
            detailData.nodes
          );
          setData({ ...detailData, nodes: positionedDetailNodes });
          setFilteredNodes(positionedDetailNodes);
          currentNodesRef.current = positionedDetailNodes;
        }

        // Cache complete fresh data
        await cacheManager.set({
          version: CACHE_VERSION,
          timestamp: Date.now(),
          basicData: detailData,
          detailData,
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Error loading data:", error);
        setIsLoading(false);
        if (!cachedData) {
          // Now cachedData is in scope
          setData({ nodes: [], links: [] });
          setFilteredNodes([]);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [calculateNodePositions]);

  // Window resize handler
  // Window resize handler only
  useEffect(() => {
    const handleResize = () => {
      setContainerDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleViewportChange = useCallback(
    (newScrollLeft: number, newScrollTop: number) => {
      if (horizontalScrollContainerRef.current) {
        horizontalScrollContainerRef.current.scrollTo({
          left: newScrollLeft,
          behavior: "instant",
        });
      }

      if (verticalScrollContainerRef.current) {
        verticalScrollContainerRef.current.scrollTo({
          top: newScrollTop,
          behavior: "instant",
        });
      }
    },
    []
  );

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add handler for clicks outside nodes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".tech-node") &&
        !target.closest(".node-tooltip") &&
        !target.closest(".connection") &&
        !target.closest(".minimap")
      ) {
        setSelectedNodeId(null);
        setSelectedLinkIndex(null);
        setHoveredNode(null);
        setHoveredNodeId(null);
        setHoveredLinkIndex(null);
        setHighlightedAncestors(new Set());
        setHighlightedDescendants(new Set());
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNodeClick = useCallback(
    (title: string) => {
      const node = data.nodes.find((n) => n.title === title);
      if (!node) return;

      // Clear states immediately to hide tooltip
      setSelectedLinkIndex(null);
      setHoveredLinkIndex(null);
      setHoveredNode(null);
      setHoveredNodeId(null);
      setHighlightedAncestors(new Set());
      setHighlightedDescendants(new Set());

      if (selectedNodeId === node.id) {
        setSelectedNodeId(null);
        return;
      }

      setSelectedNodeId(node.id);

      const verticalContainer = verticalScrollContainerRef.current;
      if (!verticalContainer || !horizontalScrollContainerRef.current) return;

      // Calculate scroll positions accounting for zoom
      const xPosition = getXPosition(node.year);
      const horizontalPosition = isMobile
        ? (xPosition * zoom) - (window.innerWidth / 2)
        : xPosition - (window.innerWidth / 2);

      const yPosition = node.y ?? 0;
      const verticalPosition = isMobile
        ? (yPosition * zoom) - (verticalContainer.clientHeight / 2) + (150 * zoom)
        : yPosition - verticalContainer.clientHeight / 2 + 150;

      // Execute scrolls
      horizontalScrollContainerRef.current.scrollTo({
        left: Math.max(0, horizontalPosition),
        behavior: "smooth",
      });

      verticalContainer.scrollTo({
        top: Math.max(0, verticalPosition),
        behavior: "smooth",
      });

      // Set selected node after a short delay to allow for smooth scrolling
      setTimeout(() => {
        setSelectedNodeId(node.id);
      }, 100);
    },
    [data.nodes, selectedNodeId, getXPosition, isMobile, zoom]
  );

  // Helper function to check if a node is adjacent to selected node
  const isAdjacentToSelected = useCallback(
    (nodeId: string) => {
      if (!selectedNodeId) return false;
      return data.links.some(
        (link) =>
          (link.source === selectedNodeId && link.target === nodeId) ||
          (link.target === selectedNodeId && link.source === nodeId)
      );
    },
    [selectedNodeId, data.links]
  );

  // Memoized helper functions

  const formatYear = useCallback((year: number) => {
    if (year === 0) return "1"; // Year 0 doesn't exist
    const absYear = Math.abs(year);
    return year < 0 ? `${absYear} BCE` : `${year}`;
  }, []);

  const shouldHighlightLink = useCallback(
    (link: Link, index: number) => {
      // If a node is selected
      if (selectedNodeId) {
        return link.source === selectedNodeId || link.target === selectedNodeId;
      }
      // If a link is selected
      if (selectedLinkIndex !== null) {
        return index === selectedLinkIndex;
      }
      // If a node is being hovered
      if (hoveredNodeId) {
        return link.source === hoveredNodeId || link.target === hoveredNodeId;
      }
      // If a link is being hovered
      if (hoveredLinkIndex === index) return true;
      return false;
    },
    [hoveredLinkIndex, hoveredNodeId, selectedNodeId, selectedLinkIndex]
  );

  const isNodeConnectedToSelectedLink = useCallback(
    (nodeId: string) => {
      if (selectedLinkIndex === null) return false;
      const selectedLink = data.links[selectedLinkIndex];
      return selectedLink.source === nodeId || selectedLink.target === nodeId;
    },
    [selectedLinkIndex, data.links]
  );

  const containerWidth = useMemo(
    () =>
      Math.max(
        data.nodes.length
          ? getXPosition(Math.max(...data.nodes.map((n) => n.year))) + PADDING
          : containerDimensions.width,
        containerDimensions.width
      ),
    [data.nodes, getXPosition, containerDimensions.width]
  );

  const getNodeConnections = useCallback(
    (nodeId: string) => {
      const validConnectionTypes = (link: Link) =>
        !["Independently invented", "Concurrent development"].includes(
          link.type
        );

      const ancestors = data.links
        .filter((link) => link.target === nodeId && validConnectionTypes(link) && link.type !== "Obsolescence")
        .map((link) => data.nodes.find((n) => n.id === link.source))
        .filter((n): n is TechNode => n !== undefined)
        // Sort ancestors by year (most recent first)
        .sort((a, b) => b.year - a.year);

      const children = data.links
        .filter((link) => link.source === nodeId && validConnectionTypes(link) && link.type !== "Obsolescence")
        .map((link) => data.nodes.find((n) => n.id === link.target))
        .filter((n): n is TechNode => n !== undefined)
        // Sort children by year (earliest first)
        .sort((a, b) => a.year - b.year);

      // Add replaced and replacedBy
      const replaced = data.links
        .filter((link) => link.target === nodeId && link.type === "Obsolescence")
        .map((link) => data.nodes.find((n) => n.id === link.source))
        .filter((n): n is TechNode => n !== undefined)
        .sort((a, b) => a.year - b.year);

      const replacedBy = data.links
        .filter((link) => link.source === nodeId && link.type === "Obsolescence")
        .map((link) => data.nodes.find((n) => n.id === link.target))
        .filter((n): n is TechNode => n !== undefined)
        .sort((a, b) => b.year - a.year);

      return { ancestors, children, replaced, replacedBy };
    },
    [data.links, data.nodes]
  );

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .fast-smooth-scroll {
        scroll-behavior: smooth;
        scroll-timeline: none;
        scroll-behavior-instant-stop: true;
      }
  
      .scrolling .tech-node,
      .scrolling path,
      .scrolling .connection,
      .scrolling g,
      .scrolling line,
      .scrolling circle,
      .scrolling rect,
      .scrolling text {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Keyboard shortcut to left and right ends (cmd+arrows)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Command (Mac) or Control (Windows) is pressed
      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (!isModifierPressed || !horizontalScrollContainerRef.current) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault(); // Prevent default browser behavior
          horizontalScrollContainerRef.current.scrollTo({
            left: 0,
            behavior: "smooth",
          });
          break;

        case "ArrowRight":
          event.preventDefault(); // Prevent default browser behavior
          horizontalScrollContainerRef.current.scrollTo({
            left: horizontalScrollContainerRef.current.scrollWidth,
            behavior: "smooth",
          });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    // Add your existing style element content
    const style = document.createElement("style");
    style.textContent = `
      body {
        background-color: rgb(254 252 232); /* This is the Tailwind yellow-50 color */
      }
      .fast-smooth-scroll {
        scroll-behavior: smooth;
        scroll-timeline: none;
        scroll-behavior-instant-stop: true;
      }
    
      .scrolling .tech-node,
      .scrolling path,
      .scrolling .connection,
      .scrolling g,
      .scrolling line,
      .scrolling circle,
      .scrolling rect,
      .scrolling text {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add this memoized search index
  const searchIndex = useMemo(() => {
    const index = new Map<
      string,
      {
        node: TechNode;
        searchableText: string;
        fields: Set<string>;
      }
    >();

    data.nodes.forEach((node) => {
      const searchableText = [
        node.title,
        node.subtitle,
        node.description,
        node.inventors?.join(" "),
        node.organizations?.join(" "),
        node.fields.join(" "),
        node.details,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      index.set(node.id, {
        node,
        searchableText,
        fields: new Set([
          "title:" + node.title.toLowerCase(),
          ...(node.subtitle ? ["subtitle:" + node.subtitle.toLowerCase()] : []),
          ...(node.inventors?.map((inv) => "inventor:" + inv.toLowerCase()) ||
            []),
          ...(node.organizations?.map((org) => "org:" + org.toLowerCase()) ||
            []),
          ...node.fields.map((field) => "field:" + field.toLowerCase()),
        ]),
      });
    });

    return index;
  }, [data.nodes]);

  // Replace the existing handleSearch with this optimized version
  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results: SearchResult[] = [];
      const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const addedNodes = new Set<string>();

      // Early return for year searches
      const yearMatch = query.match(/^-?\d+(?:\s*(?:BC|BCE))?$/i);
      if (yearMatch) {
        const year = parseInt(query.replace(/\s*(?:BC|BCE)/i, ""));
        const isBCE = query.toLowerCase().includes("bc");
        const adjustedYear = isBCE ? -year : year;

        // Only add year navigation for valid years
        if (adjustedYear !== 0) {
          const years = data.nodes.map((n) => n.year);
          const minYear = Math.min(...years);
          const maxYear = Math.max(...years);

          if (adjustedYear >= minYear && adjustedYear <= maxYear) {
            results.push({
              type: "year",
              text: `Go to year ${isBCE ? `${year} BCE` : year}`,
              matchScore: 1000, // Give year results a very high score
              year: adjustedYear,
            });
          }
        }
      }

      // Continue with text search
      for (const [nodeId, { node, searchableText, fields }] of searchIndex) {
        if (results.length >= 10) break;
        if (addedNodes.has(nodeId)) continue;

        const matchesAllTerms = searchTerms.every(
          (term) =>
            searchableText.includes(term) ||
            Array.from(fields).some((field) => field.includes(term))
        );

        if (matchesAllTerms) {
          let score = 0;
          const lowerTitle = node.title.toLowerCase();
          const lowerSubtitle = node.subtitle?.toLowerCase() || "";

          // Prioritize exact matches in title/subtitle
          if (lowerTitle.includes(query.toLowerCase())) {
            score += 10;
          }
          if (lowerSubtitle.includes(query.toLowerCase())) {
            score += 5;
          }

          if (score > 0) {
            results.push({
              type: "node",
              node,
              text: node.title,
              subtext: `${formatYear(node.year)}${
                node.subtitle ? ` – ${node.subtitle}` : ""
              }`,
              matchScore: score,
            });
            addedNodes.add(nodeId);
            continue;
          }

          // Check other fields only if necessary
          if (!addedNodes.has(nodeId)) {
            if (
              node.inventors?.some((inv) =>
                inv.toLowerCase().includes(query.toLowerCase())
              )
            ) {
              results.push({
                type: "person",
                node,
                text: node.inventors.join(", "),
                subtext: `Invented ${node.title} (${formatYear(node.year)})`,
                matchScore: 5,
              });
              addedNodes.add(nodeId);
              continue;
            }

            if (
              node.organizations?.some((org) =>
                org.toLowerCase().includes(query.toLowerCase())
              )
            ) {
              results.push({
                type: "organization",
                node,
                text: node.organizations.join(", "),
                subtext: `Developed ${node.title} (${formatYear(node.year)})`,
                matchScore: 3,
              });
              addedNodes.add(nodeId);
            }
          }
        }
      }

      results.sort((a, b) => b.matchScore - a.matchScore);
      setSearchResults(results.slice(0, 10));
    },
    [searchIndex, data.nodes, formatYear]
  );

  // Update handleSelectResult to account for zoom level
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      if (result.type === "year" && result.year) {
        if (horizontalScrollContainerRef.current) {
          const xPosition = getXPosition(result.year);
          const horizontalPosition = isMobile
            ? (xPosition * zoom) - (window.innerWidth / 2)
            : xPosition - (window.innerWidth / 2);

          horizontalScrollContainerRef.current.scrollTo({
            left: Math.max(0, horizontalPosition),
            behavior: "smooth",
          });
        }
      } else if (result.node) {
        handleNodeClick(result.node.title);
      }
    },
    [getXPosition, handleNodeClick, isMobile, zoom]
  );

  const isNodeFiltered = useCallback(
    (node: TechNode): boolean => {
      // If no filters are active, show all nodes
      if (
        !filters.fields.size &&
        !filters.countries.size &&
        !filters.cities.size
      ) {
        return true;
      }

      // Check if node matches any active filters
      if (
        filters.fields.size &&
        node.fields.some((field) => filters.fields.has(field))
      ) {
        return true;
      }

      // Check countries
      if (filters.countries.size) {
        const nodeCountries = [
          ...(node.countryHistorical?.split(",").map((c) => c.trim()) || []),
          ...(node.countryModern
            ?.split(",")
            .map((c) => c.trim())
            .filter(Boolean) || []),
        ];
        if (nodeCountries.some((country) => filters.countries.has(country))) {
          return true;
        }
      }

      // Check cities
      if (filters.cities.size && node.city) {
        const nodeCities = node.city.split(",").map((c) => c.trim());
        if (nodeCities.some((city) => filters.cities.has(city))) {
          return true;
        }
      }

      return false;
    },
    [filters]
  );

  const isLinkVisible = useCallback(
    (link: Link): boolean => {
      const sourceNode = data.nodes.find((n) => n.id === link.source);
      const targetNode = data.nodes.find((n) => n.id === link.target);

      if (!sourceNode || !targetNode) return false;

      return isNodeFiltered(sourceNode) || isNodeFiltered(targetNode);
    },
    [data.nodes, isNodeFiltered]
  );

  const getAvailableFilters = useMemo(
    () => ({
      fields: Array.from(new Set(data.nodes.flatMap((n) => n.fields))).sort(),
      countries: Array.from(
        new Set(
          data.nodes.flatMap((n) => [
            ...(n.countryHistorical
              ?.split(",")
              .map((c) => c.trim())
              .filter(Boolean) || []),
            ...(n.countryModern
              ?.split(",")
              .map((c) => c.trim())
              .filter(Boolean) || []),
          ])
        )
      ).sort(),
      cities: Array.from(
        new Set(
          data.nodes.flatMap((n) =>
            n.city
              ? n.city
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
              : []
          )
        )
      ).sort(),
    }),
    [data.nodes]
  );

  // Create a Set of filtered node IDs, but only when filters are active
  const filteredNodeIds = useMemo(() => {
    const hasActiveFilters =
      filters.fields.size > 0 ||
      filters.countries.size > 0 ||
      filters.cities.size > 0;

    if (!hasActiveFilters) {
      return new Set<string>(); // Explicitly type the empty set
    }

    return new Set<string>(
      data.nodes.filter((node) => isNodeFiltered(node)).map((node) => node.id)
    );
  }, [filters, data.nodes, isNodeFiltered]);

  // Add this near the top of the component
  const prefetchedNodes = useRef(new Set<string>());

  // Update the prefetchNode function
  const prefetchNode = useCallback(async (nodeId: string) => {
    // Skip if already prefetched
    if (prefetchedNodes.current.has(nodeId)) return;
    prefetchedNodes.current.add(nodeId);

    try {
      const response = await fetch(`/api/inventions/${nodeId}`);
      if (!response.ok) {
        if (response.status !== 404) {  // Don't log 404s as they're expected
          console.warn(`Failed to prefetch node ${nodeId}: ${response.status}`);
        }
        return;
      }
      const nodeData = await response.json();
      
      setData((prevData) => ({
        ...prevData,
        nodes: prevData.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...nodeData } : node
        ),
      }));
    } catch (error) {
      console.warn(`Failed to prefetch node ${nodeId}:`, error);
    }
  }, []);

  // Update handleNodeHover to limit prefetching
  const handleNodeHover = useCallback(
    (node: TechNode) => {
      setHoveredNode(node);
      setHoveredNodeId(node.id);

      // Only prefetch immediate neighbors
      const connectedNodeIds = data.links
        .filter((link) => link.source === node.id || link.target === node.id)
        .map((link) => (link.source === node.id ? link.target : link.source))
        // Limit the number of simultaneous prefetch requests
        .slice(0, 5);

      connectedNodeIds.forEach(prefetchNode);
    },
    [data.links, prefetchNode]
  );

  // Add cleanup for prefetch cache
  useEffect(() => {
    const nodes = prefetchedNodes.current;
    const cleanupInterval = setInterval(() => {
      nodes.clear();
    }, 60000);

    return () => {
      clearInterval(cleanupInterval);
      nodes.clear();
    };
  }, []);

  // Add this helper function to get nodes connected by a selected link
  const getSelectedConnectionNodes = useCallback(() => {
    if (selectedLinkIndex === null) return new Set<string>();
    const selectedLink = data.links[selectedLinkIndex];
    return new Set([selectedLink.source, selectedLink.target]);
  }, [selectedLinkIndex, data.links]);

  // Add this helper function near your other helper functions
  const getAdjacentNodeIds = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return new Set<string>();

      return new Set(
        data.links
          .filter((link) => link.source === nodeId || link.target === nodeId)
          .map((link) => (link.source === nodeId ? link.target : link.source))
      );
    },
    [data.links]
  );

  // Add these helper functions near your other utility functions
  const getAllAncestors = useCallback(
    (nodeId: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(nodeId)) return visited;
      visited.add(nodeId);

      // Find all direct ancestors
      const directAncestors = data.links
        .filter(
          (link) =>
            link.target === nodeId &&
            // Exclude independent inventions and concurrent developments
            !["Independently invented", "Concurrent development"].includes(
              link.type
            )
        )
        .map((link) => link.source);

      // Recursively get ancestors of ancestors
      directAncestors.forEach((ancestorId) => {
        getAllAncestors(ancestorId, visited);
      });

      return visited;
    },
    [data.links]
  );

  const getAllDescendants = useCallback(
    (nodeId: string, visited = new Set<string>()): Set<string> => {
      if (visited.has(nodeId)) return visited;
      visited.add(nodeId);

      // Find all direct descendants
      const directDescendants = data.links
        .filter(
          (link) =>
            link.source === nodeId &&
            // Exclude independent inventions and concurrent developments
            !["Independently invented", "Concurrent development"].includes(
              link.type
            )
        )
        .map((link) => link.target);

      // Recursively get descendants of descendants
      directDescendants.forEach((descendantId) => {
        getAllDescendants(descendantId, visited);
      });

      return visited;
    },
    [data.links]
  );

  // Add this effect after your other useEffect hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get the element under the mouse pointer
      const elementUnderMouse = document.elementFromPoint(
        window.mouseX || 0,
        window.mouseY || 0
      );
      const isTimelineOrMinimap =
        elementUnderMouse?.closest(".timeline") ||
        elementUnderMouse?.closest(".minimap");

      if (
        isTimelineOrMinimap &&
        (e.key === "ArrowUp" || e.key === "ArrowDown")
      ) {
        e.preventDefault();
      }
    };

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      window.mouseX = e.clientX;
      window.mouseY = e.clientY;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Add this effect to detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update the touch handlers to handle both dragging and pinch zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Only prevent default for pinch zoom
      e.preventDefault();
      // Pinch zoom logic
      touchStateRef.current = {
        touches: Array.from(e.touches),
        scale: zoom,
      };
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      touchStateRef.current.startDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    } else if (e.touches.length === 1) {
      // Single touch drag logic
      dragStateRef.current = {
        isDragging: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        scrollLeft: horizontalScrollContainerRef.current?.scrollLeft || 0,
        scrollTop: verticalScrollContainerRef.current?.scrollTop || 0,
      };
    }
  }, [zoom]);

  const debouncedSetZoom = useMemo(
    () => debounce((newZoom: number) => {
      setZoom(newZoom);
    }, ZOOM_DEBOUNCE_MS),
    [setZoom]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Only prevent default for pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (touchStateRef.current.startDistance) {
        const scale = touchStateRef.current.scale * (currentDistance / touchStateRef.current.startDistance);
        const newZoom = Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
        debouncedSetZoom(newZoom);
      }
    }
  }, [zoom, debouncedSetZoom]);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = { touches: [], scale: zoom };
  }, [zoom]);

  // Add cleanup effect here, before any returns
  useEffect(() => {
    return () => {
      debouncedSetZoom.cancel();
    };
  }, [debouncedSetZoom]);

  // Add this effect near your other keyboard-related effects
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Clear all selections and highlights
        setSelectedNodeId(null);
        setSelectedLinkIndex(null);
        setHoveredNode(null);
        setHoveredNodeId(null);
        setHoveredLinkIndex(null);
        setHighlightedAncestors(new Set());
        setHighlightedDescendants(new Set());
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, []);

  // Add loading state UI
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Add error state UI
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Tech Tree</h2>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // 4. Optimize initial render
  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-yellow-50">
        <div className="text-lg font-mono tracking-wide animate-pulse">
          Loading visualization...
        </div>
      </div>
    );
  }

  // 5. Defer non-critical UI elements
  return (
    <div className="h-screen bg-yellow-50">
      {/* Defer loading of controls until after main content */}
      {!isLoading && (
        <div
          className="fixed top-16 right-4 flex flex-col items-end gap-4"
          style={{ zIndex: 1000 }}
        >
          <Suspense fallback={null}>
            <Suspense fallback={null}>
              {isClient && (
                <div className="bg-transparent md:bg-white/80 md:backdrop-blur md:border md:border-black md:rounded-none md:shadow-md md:p-4 relative z-30">
                  <DynamicSearchBox
                    onSearch={handleSearch}
                    results={searchResults}
                    onSelectResult={handleSelectResult}
                  />
                </div>
              )}
            </Suspense>
            <Suspense fallback={null}>
              {isClient && (
                <div className="bg-transparent md:bg-white/80 md:backdrop-blur md:border md:border-black md:rounded-none md:shadow-md md:p-4 relative z-20">
                  <DynamicFilterBox
                    filters={filters}
                    onFilterChange={setFilters}
                    availableFilters={getAvailableFilters}
                  />
                </div>
              )}
            </Suspense>
          </Suspense>
        </div>
      )}

      <div
        ref={horizontalScrollContainerRef}
        className="overflow-x-auto overflow-y-hidden h-screen bg-yellow-50"
        style={{ 
          overscrollBehaviorY: "none",
          touchAction: isMobile ? "pan-x pan-y pinch-zoom" : "auto",
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        onScroll={(e) => {
          const horizontalScroll = e.currentTarget.scrollLeft;
          setScrollPosition((prev) => ({
            ...prev,
            left: horizontalScroll,
          }));
        }}
      >
        <div 
          style={{ 
            width: containerWidth,
            minHeight: '100vh',
            transform: isMobile ? `scale(${zoom})` : undefined,
            transformOrigin: isMobile ? "0 0" : undefined,
            willChange: 'transform', // Add hardware acceleration hint
            backfaceVisibility: 'hidden', // Optimize rendering
          }}
        >
          {/* Timeline */}
          <div
            className="h-8 bg-yellow-50 border-b sticky top-0 timeline"
            style={{
              width: '100%',
              zIndex: 100,
              position: "relative",
            }}
          >
            {/* Timeline content */}
            {(() => {
              if (!data.nodes.length) return null;
              const years = data.nodes.map((n) => n.year);
              const minYear = Math.min(...years);
              const maxYear = Math.max(...years);
              const timelineYears = getTimelineYears(minYear, maxYear);

              return timelineYears.map((year) => (
                <div
                  key={year}
                  className="absolute text-sm text-gray-600 font-mono"
                  style={{
                    left: `${getXPosition(year)}px`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {formatYear(year)}
                </div>
              ));
            })()}
          </div>

          {/* Vertical scroll container */}
          <div
            ref={verticalScrollContainerRef}
            className="overflow-y-auto overflow-x-hidden"
            style={{
              height: isMobile ? `${window.innerHeight / zoom}px` : "calc(100vh - 32px)",
              overscrollBehaviorY: "contain",
              position: "relative",
              touchAction: isMobile ? "pan-x pan-y pinch-zoom" : "auto",
              WebkitOverflowScrolling: "touch",
              minHeight: isMobile ? `${Math.max(totalHeight, window.innerHeight) / zoom}px` : undefined,
            }}
            onScroll={(e) => {
              const verticalScroll = e.currentTarget.scrollTop;
              setScrollPosition((prev) => ({
                ...prev,
                top: verticalScroll,
              }));
            }}
          >
            <div
              style={{
                width: '100%',
                height: isMobile ? `${Math.max(totalHeight, window.innerHeight) / zoom}px` : `${totalHeight}px`,
                position: "relative",
                marginBottom: "64px",
              }}
            >
              {/* Add IntroBox here instead */}
              <IntroBox />

              {/* SVG connections */}
              <svg
                className="absolute inset-0 w-full h-full"
                style={{
                  zIndex: 1,
                }}
              >
                {data.links.map((link, index) => {
                  const sourceNode = data.nodes.find(
                    (n) => n.id === link.source
                  );
                  const targetNode = data.nodes.find(
                    (n) => n.id === link.target
                  );

                  if (!sourceNode || !targetNode) return null;
                  return (
                    <CurvedConnections
                      key={index}
                      sourceNode={{
                        x: getXPosition(sourceNode.year),
                        y: sourceNode.y || 150,
                      }}
                      targetNode={{
                        x: getXPosition(targetNode.year),
                        y: targetNode.y || 150,
                      }}
                      sourceIndex={data.nodes.indexOf(sourceNode)}
                      targetIndex={data.nodes.indexOf(targetNode)}
                      connectionType={link.type}
                      isHighlighted={shouldHighlightLink(link, index)}
                      opacity={(() => {
                        // If a node is selected
                        if (selectedNodeId) {
                          // If this is a connection between highlighted nodes
                          if (
                            (highlightedAncestors.has(link.source) &&
                              highlightedAncestors.has(link.target)) ||
                            (highlightedDescendants.has(link.source) &&
                              highlightedDescendants.has(link.target))
                          ) {
                            return 1;
                          }
                          // If this is a connection to/from the selected node
                          if (shouldHighlightLink(link, index)) {
                            return 1;
                          }
                          return 0.2;
                        }
                        // If a link is selected
                        if (selectedLinkIndex !== null) {
                          return index === selectedLinkIndex ? 1 : 0.2;
                        }
                        // If filters are applied
                        if (
                          filters.fields.size ||
                          filters.countries.size ||
                          filters.cities.size
                        ) {
                          return isLinkVisible(link) ? 1 : 0.2;
                        }
                        return 1;
                      })()}
                      onMouseEnter={() => {
                        setHoveredLinkIndex(index);
                      }}
                      onMouseLeave={() => setHoveredLinkIndex(null)}
                      sourceTitle={sourceNode.title}
                      targetTitle={targetNode.title}
                      details={link.details}
                      isSelected={selectedLinkIndex === index}
                      onSelect={() => {
                        setSelectedLinkIndex((current) =>
                          current === index ? null : index
                        );
                        setSelectedNodeId(null);
                      }}
                      onNodeClick={(title) => {
                        handleNodeClick(title);
                      }}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              <div className="relative" style={{ zIndex: 10 }}>
                {filteredNodes.map((node) => (
                  <BrutalistNode
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    isAdjacent={isAdjacentToSelected(node.id)}
                    onClick={() => {
                      if (node.id === selectedNodeId) {
                        setSelectedNodeId(null);
                      } else {
                        setSelectedNodeId(node.id);
                        setSelectedLinkIndex(null);
                      }
                    }}
                    onMouseEnter={() => {
                      if (node.id !== selectedNodeId) {
                        handleNodeHover(node);
                      }
                    }}
                    onMouseLeave={() => {
                      if (node.id !== selectedNodeId) {
                        setHoveredNode(null);
                        setHoveredNodeId(null);
                      }
                    }}
                    width={NODE_WIDTH}
                    style={{
                      position: "absolute",
                      left: `${getXPosition(node.year)}px`,
                      top: `${node.y}px`,
                      opacity: (() => {
                        // If a node is selected
                        if (selectedNodeId) {
                          if (node.id === selectedNodeId) return 1;
                          if (isAdjacentToSelected(node.id)) return 1;
                          if (highlightedAncestors.has(node.id)) return 1;
                          if (highlightedDescendants.has(node.id)) return 1;
                          return 0.2;
                        }
                        // If a link is selected
                        if (selectedLinkIndex !== null) {
                          return isNodeConnectedToSelectedLink(node.id)
                            ? 1
                            : 0.2;
                        }
                        // If filters are applied
                        if (
                          filters.fields.size ||
                          filters.countries.size ||
                          filters.cities.size
                        ) {
                          return isNodeFiltered(node) ? 1 : 0.2;
                        }
                        // Default state - fully visible
                        return 1;
                      })(),
                      transition: "opacity 0.2s ease-in-out",
                    }}
                  />
                ))}
              </div>

              {/* Tooltips */}
              <div className="relative" style={{ zIndex: 100 }}>
                {filteredNodes.map(
                  (node) =>
                    (hoveredNode?.id === node.id ||
                      selectedNodeId === node.id) && (
                      <div
                        key={`tooltip-${node.id}`}
                        className="absolute bg-white border border-black rounded-none p-3 shadow-md node-tooltip"
                        style={{
                          left: `${getXPosition(node.year)}px`,
                          top: `${(node.y ?? 0) + 100}px`,
                          transform: "translate(-50%, 0)",
                          width: "14rem",
                          zIndex: 100,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => {
                          // Keep the hover state active when hovering the tooltip
                          setHoveredNode(node);
                          setHoveredNodeId(node.id);
                        }}
                        onMouseLeave={() => {
                          // Only clear hover state if the node isn't selected
                          if (selectedNodeId !== node.id) {
                            setHoveredNode(null);
                            setHoveredNodeId(null);
                          }
                        }}
                      >
                        <p className="text-xs mb-1">
                          <strong>Date:</strong> {formatYear(node.year)}
                          {node.dateDetails && ` (${node.dateDetails})`}
                        </p>
                        {node.inventors &&
                          node.inventors.length > 0 &&
                          node.inventors.filter((inv) => inv !== "unknown")
                            .length > 0 && (
                            <p className="text-xs mb-1">
                              <strong>
                                {node.type === "Discovery"
                                  ? `Discoverer${
                                      node.inventors.length > 1 ? "s" : ""
                                    }`
                                  : `Inventor${
                                      node.inventors.length > 1 ? "s" : ""
                                    }`}
                                :
                              </strong>{" "}
                              {node.inventors.includes("unknown")
                                ? "possibly " +
                                  node.inventors
                                    .filter((inv) => inv !== "unknown")
                                    .join(", ")
                                : node.inventors.join(", ")}
                            </p>
                          )}
                        {node.organizations &&
                          node.organizations.length > 0 && (
                            <p className="text-xs mb-1">
                              <strong>
                                {node.organizations.length > 1
                                  ? "Organizations"
                                  : "Organization"}
                                :
                              </strong>{" "}
                              {node.organizations.join(", ")}
                            </p>
                          )}
                        {node.formattedLocation && (
                          <p className="text-xs mb-1">
                            <strong>Location:</strong> {cleanLocationForTooltip(node.formattedLocation)}
                          </p>
                        )}
                        {node.details && (
                          <p className="text-xs mb-2">{node.details}</p>
                        )}

                        {/* Updated connections section */}
                        {(() => {
                          const { ancestors, children, replaced, replacedBy } = getNodeConnections(
                            node.id
                          );
                          return (
                            <>
                              {ancestors.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Built upon:</strong>
                                  <div className="ml-2">
                                    {ancestors.map((ancestor: TechNode, index: number) => {
                                      // Find the link to check its type
                                      const link = data.links.find(
                                        l => l.source === ancestor.id && l.target === node.id
                                      );
                                      // Only show (possibly) for speculative connections
                                      const suffix = link?.type === "Speculative" ? " (possibly)" : "";
                                      
                                      return (
                                        <div
                                          key={`ancestor-${node.id}-${ancestor.id}-${index}`}
                                          className="flex"
                                        >
                                          <span className="flex-shrink-0 mr-1">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(ancestor.title);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {ancestor.title}{suffix}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {children.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Led to:</strong>
                                  <div className="ml-2">
                                    {children.map((child: TechNode, index: number) => {
                                      // Find the link to check its type
                                      const link = data.links.find(
                                        l => l.source === node.id && l.target === child.id
                                      );
                                      // Only show (possibly) for speculative connections
                                      const suffix = link?.type === "Speculative" ? " (possibly)" : "";
                                      
                                      return (
                                        <div
                                          key={`child-${node.id}-${child.id}-${index}`}
                                          className="flex"
                                        >
                                          <span className="flex-shrink-0 mr-1">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(child.title);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {child.title}{suffix}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {replaced.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Replaced:</strong>
                                  <div className="ml-2">
                                    {replaced.map((replacedNode: TechNode, index: number) => (
                                      <div
                                        key={`replaced-${node.id}-${replacedNode.id}-${index}`}
                                        className="flex"
                                      >
                                        <span className="flex-shrink-0 mr-1">•</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNodeClick(replacedNode.title);
                                          }}
                                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                          type="button"
                                        >
                                          {replacedNode.title}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {replacedBy.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Replaced by:</strong>
                                  <div className="ml-2">
                                    {replacedBy.map((replacedByNode: TechNode, index: number) => (
                                      <div
                                        key={`replacedBy-${node.id}-${replacedByNode.id}-${index}`}
                                        className="flex"
                                      >
                                        <span className="flex-shrink-0 mr-1">•</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNodeClick(replacedByNode.title);
                                          }}
                                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                          type="button"
                                        >
                                          {replacedByNode.title}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Update the tooltip section with modified click handlers */}
                        {(() => {
                          const nodeId = selectedNodeId || hoveredNode?.id;
                          if (!nodeId) return null;

                          const ancestors = getAllAncestors(nodeId);
                          const descendants = getAllDescendants(nodeId);
                          ancestors.delete(nodeId);
                          descendants.delete(nodeId);

                          return (
                            <div className="text-xs mt-2">
                              {/* Show ancestry controls only if there are ancestors or descendants */}
                              {(ancestors.size > 0 || descendants.size > 0) && (
                                <div className="mb-1">
                                  {ancestors.size > 0 &&
                                  descendants.size > 0 ? (
                                    <>
                                      Highlight all{" "}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // First ensure the node is selected
                                          if (!selectedNodeId) {
                                            setSelectedNodeId(nodeId);
                                          }
                                          setHighlightedAncestors(ancestors);
                                          setHighlightedDescendants(new Set());
                                        }}
                                        className="text-blue-600 hover:underline cursor-pointer"
                                      >
                                        ancestors
                                      </button>
                                      {" / "}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // First ensure the node is selected
                                          if (!selectedNodeId) {
                                            setSelectedNodeId(nodeId);
                                          }
                                          setHighlightedDescendants(
                                            descendants
                                          );
                                          setHighlightedAncestors(new Set());
                                        }}
                                        className="text-blue-600 hover:underline cursor-pointer"
                                      >
                                        descendants
                                      </button>
                                    </>
                                  ) : ancestors.size > 0 ? (
                                    <>
                                      Highlight all{" "}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // First ensure the node is selected
                                          if (!selectedNodeId) {
                                            setSelectedNodeId(nodeId);
                                          }
                                          setHighlightedAncestors(ancestors);
                                          setHighlightedDescendants(new Set());
                                        }}
                                        className="text-blue-600 hover:underline cursor-pointer"
                                      >
                                        ancestors
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      Highlight all{" "}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // First ensure the node is selected
                                          if (!selectedNodeId) {
                                            setSelectedNodeId(nodeId);
                                          }
                                          setHighlightedDescendants(
                                            descendants
                                          );
                                          setHighlightedAncestors(new Set());
                                        }}
                                        className="text-blue-600 hover:underline cursor-pointer"
                                      >
                                        descendants
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Always show Wikipedia link if it exists, regardless of connections */}
                              {node.wikipedia && (
                                <div>
                                  View on{" "}
                                  <a
                                    href={node.wikipedia}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:underline cursor-pointer"
                                  >
                                    Wikipedia
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Only show minimap on non-mobile devices */}
        {!isMobile && (
          <TechTreeMinimap
            nodes={data.nodes.map(
              (node): MinimapNode => ({
                id: node.id,
                x: getXPosition(node.year),
                y: node.y || 0,
                year: node.year,
              })
            )}
            containerWidth={containerWidth}
            totalHeight={totalHeight}
            viewportWidth={containerDimensions.width}
            viewportHeight={containerDimensions.height}
            scrollLeft={scrollPosition.left}
            scrollTop={scrollPosition.top}
            onViewportChange={handleViewportChange}
            filteredNodeIds={filteredNodeIds}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            selectedConnectionNodeIds={getSelectedConnectionNodes()}
            adjacentNodeIds={getAdjacentNodeIds(selectedNodeId)}
            highlightedAncestors={highlightedAncestors}
            highlightedDescendants={highlightedDescendants}
          />
        )}
      </div>
    </div>
  );
}

// 6. Export with memo to prevent unnecessary re-renders
export default memo(TechTreeViewer);

// 7. Keep the NoSSR wrapper
export const TechTreeViewerNoSSR = dynamic(
  () => Promise.resolve(memo(TechTreeViewer)),
  {
    ssr: false,
  }
);
