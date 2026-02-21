"use client";

// Add type declaration for global mouse position
declare global {
  interface Window {
    mouseX: number;
    mouseY: number;
    lastNodeVisibilityLog?: number;
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
import BrutalistNode from "../components/nodes/BrutalistNode";
import { SearchResult } from "./SearchBox";
import { TechNode } from "@/types/tech-node";
import { FilterState } from "@/types/filters";
import { cacheManager, CACHE_VERSION } from "@/utils/cache";
import { SpatialIndex } from "@/utils/SpatialIndex";
// Import useSearchParams
import { useSearchParams } from 'next/navigation';
import { DebugOverlay } from "@/app/components/utils/DebugOverlay";
import IntroBox from "@/app/components/utils/IntroBox";
import { 
  TechTreeLink, 
  TechTreeNodePosition, 
  TechTreeMinimapNode, 
  TechTreeVisibleElements 
} from "@/types/techTreeTypes";
import {
  escapeRegExp,
  cleanLocationForTooltip,
  validateImageUrl,
  fetchWithRetry,
  throttle
} from './utils/helpers';
import {
  performanceMarks,
  memoEffectiveness,
  logPerformance
} from './utils/performance';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';

// Timeline scale boundaries
const YEAR_INDUSTRIAL = 1750;
const YEAR_EARLY_MODERN = 1500;
const YEAR_ANTIQUITY_AND_MEDIEVAL = -400;
const YEAR_IRON_AGE = -1000;
const YEAR_COPPER_AND_BRONZE_AGE = -5000;
const YEAR_NEOLITHIC = -10000;
const YEAR_UPPER_PALEOLITHIC = -50000;
const YEAR_MIDDLE_PALEOLITHIC = -100000;

// Define fixed timeline boundaries for early rendering
const TIMELINE_MIN_YEAR = -3300000;
const TIMELINE_MAX_YEAR = 2024; // Or adjust to a future year if needed

// Define a screen width threshold for small screens
const SMALL_SCREEN_WIDTH_THRESHOLD = 640;

// Timeline intervals for each period
const INTERVAL_INDUSTRIAL = 1;
const INTERVAL_EARLY_MODERN = 5;
const INTERVAL_ANTIQUITY_AND_MEDIEVAL = 20;
const INTERVAL_IRON_AGE = 50;
const INTERVAL_COPPER_AND_BRONZE_AGE = 100;
const INTERVAL_NEOLITHIC = 500;
const INTERVAL_UPPER_PALEOLITHIC = 1000;
const INTERVAL_MIDDLE_PALEOLITHIC = 5000;
const INTERVAL_EARLY_PALEOLITHIC = 100000;

// Core layout constants
const NODE_WIDTH = 160;
const VERTICAL_SPACING = 50;
const YEAR_WIDTH = 240;
const PADDING = 120;
const INFO_BOX_HEIGHT = 500;
export const CACHE_VIEWPORT_BUFFER_FOR_NODES = 700;

// Search result limits
const MAX_SEARCH_RESULTS = 30;

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

function getTimelineSegment(year: number) {
  if (year >= YEAR_INDUSTRIAL) return year;
  if (year >= YEAR_EARLY_MODERN)
    return Math.floor(year / INTERVAL_EARLY_MODERN) * INTERVAL_EARLY_MODERN;
  if (year >= YEAR_ANTIQUITY_AND_MEDIEVAL)
    return Math.floor(year / INTERVAL_ANTIQUITY_AND_MEDIEVAL) * INTERVAL_ANTIQUITY_AND_MEDIEVAL;
  if (year >= YEAR_IRON_AGE)
    return (
      Math.floor(year / INTERVAL_IRON_AGE) * INTERVAL_IRON_AGE
    );
  if (year >= YEAR_COPPER_AND_BRONZE_AGE)
    return (
      Math.floor(year / INTERVAL_COPPER_AND_BRONZE_AGE) * INTERVAL_COPPER_AND_BRONZE_AGE
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
    else if (current >= YEAR_ANTIQUITY_AND_MEDIEVAL) current += INTERVAL_ANTIQUITY_AND_MEDIEVAL;
    else if (current >= YEAR_IRON_AGE)
      current += INTERVAL_IRON_AGE;
    else if (current >= YEAR_COPPER_AND_BRONZE_AGE)
      current += INTERVAL_COPPER_AND_BRONZE_AGE;
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
    else if (current >= YEAR_ANTIQUITY_AND_MEDIEVAL) current += INTERVAL_ANTIQUITY_AND_MEDIEVAL;
    else if (current >= YEAR_IRON_AGE)
      current += INTERVAL_IRON_AGE;
    else if (current >= YEAR_COPPER_AND_BRONZE_AGE)
      current += INTERVAL_COPPER_AND_BRONZE_AGE;
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

// Deterministic seeded random function
function seededRandom(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Create a decimal between 0 and 1 using the hash
  return (Math.abs(hash) % 1000) / 1000;
}

export function TechTreeViewer() {
  // Get search params
  const searchParams = useSearchParams();
  const router = useRouter();

  // Client-side initialization
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add state for drag navigation
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartScroll, setDragStartScroll] = useState({ left: 0, top: 0 });
  const dragStartedFromNode = useRef(false);
  const wasDragging = useRef(false);

  // Add mouse event handlers for drag navigation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag if left mouse button is pressed
    if (e.button !== 0) return;

    // Don't initiate drag when clicking inside a tooltip (allow text selection)
    const target = e.target as HTMLElement;
    if (target.closest('.node-tooltip')) return;

    // Check if the click started on a node
    dragStartedFromNode.current = target.closest('[data-node-id]') !== null;
    wasDragging.current = false;

    // Prevent text selection and node interaction
    e.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartScroll({
      left: horizontalScrollContainerRef.current?.scrollLeft || 0,
      top: horizontalScrollContainerRef.current?.scrollTop || 0
    });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !horizontalScrollContainerRef.current) return;

    // Mark that we've started dragging
    wasDragging.current = true;

    // Prevent any interactions while dragging
    e.preventDefault();
    
    const dx = dragStart.x - e.clientX;
    const dy = dragStart.y - e.clientY;

    horizontalScrollContainerRef.current.scrollLeft = dragStartScroll.left + dx;
    horizontalScrollContainerRef.current.scrollTop = dragStartScroll.top + dy;
  }, [isDragging, dragStart, dragStartScroll]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Restore normal selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    setIsDragging(false);
  }, []);

  // Add effect to handle mouse events
  useEffect(() => {
    if (isClient) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Add click handler to prevent node selection after drag
      const handleClick = (e: MouseEvent) => {
        if (wasDragging.current) {
          e.preventDefault();
          e.stopPropagation();
          wasDragging.current = false;
        }
      };
      
      document.addEventListener('click', handleClick, true);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('click', handleClick, true);
        // Clean up styles in case component unmounts during drag
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isClient, handleMouseMove, handleMouseUp]);

  const [isLoading, setIsLoading] = useState(true);
  const [isError] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<TechNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [data, setData] = useState<{ nodes: TechNode[]; links: TechTreeLink[] }>({
    nodes: [],
    links: [],
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(null);
  const [selectedLinkKey, setSelectedLinkKey] = useState<string | null>(null);
  const [totalHeight, setTotalHeight] = useState(1000);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    fields: new Set(),
    subfields: new Set(),
    countries: new Set(),
    cities: new Set(),
  });
  const [highlightedAncestors, setHighlightedAncestors] = useState<Set<string>>(new Set());
  const [highlightedDescendants, setHighlightedDescendants] = useState<Set<string>>(new Set());
  const currentNodesRef = useRef<TechNode[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  // Add state for connection visibility mode
  const [showAllConnections, setShowAllConnections] = useState(false);
  const horizontalScrollContainerRef = useRef<HTMLDivElement>(null);
  const verticalScrollContainerRef = useRef<HTMLDivElement>(null);
  // Add settings menu state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'all' | 'optimized' | 'minimal'>(() => {
    // Initialize from localStorage if available, otherwise default to 'optimized'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('techTreeConnectionMode');
      return (saved as 'all' | 'optimized' | 'minimal') || 'optimized';
    }
    return 'optimized';
  });
  const [showImages, setShowImages] = useState(() => {
    // Initialize from localStorage if available, otherwise default to true
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('techTreeShowImages');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Add effect to save display options to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('techTreeConnectionMode', connectionMode);
      localStorage.setItem('techTreeShowImages', showImages.toString());
    }
  }, [connectionMode, showImages]);

  // Add click-outside handler for settings menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add scroll prevention for settings button
  useEffect(() => {
    const settingsButton = document.querySelector('.settings-button');
    if (!settingsButton) return;

    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    settingsButton.addEventListener('wheel', preventScroll, { passive: false });
    settingsButton.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      settingsButton.removeEventListener('wheel', preventScroll);
      settingsButton.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Initialize spatial index with smaller cell size
  const spatialIndexRef = useRef(new SpatialIndex(100)); // Reduced from 250 to 100
  
  // Add refs for virtualization
  const nodesContainerRef = useRef<HTMLDivElement>(null);
  const connectionsContainerRef = useRef<SVGSVGElement>(null);
  
  // Refs for search and filter box containers to manage wheel events
  const searchBoxContainerRef = useRef<HTMLDivElement>(null);
  const filterBoxContainerRef = useRef<HTMLDivElement>(null);

  // Add ref for the jump button
  const jumpButtonRef = useRef<HTMLButtonElement>(null);
  const prefetchedNodeDetails = useRef<Map<string, Partial<TechNode>>>(new Map());

  // Add state for visible viewport
  const [visibleViewport, setVisibleViewport] = useState({
    left: 0,
    right: window.innerWidth,  // Initialize with window dimensions instead of zeros
    top: 0,
    bottom: window.innerHeight, // Initialize with window dimensions instead of zeros
  });
  // Create a deferred version of the viewport for stable calculations
  const [deferredViewportState, setDeferredViewport] = useState({
    left: 0,
    right: window.innerWidth,
    top: 0,
    bottom: window.innerHeight,
  });

  // Add viewport update tracking
  const lastViewportUpdate = useRef(0);
  const VIEWPORT_UPDATE_THROTTLE = 100; // ms

  // Add cache refs for ancestors and descendants
  const descendantsCache = useRef<Map<string, Set<string>>>(new Map());
  const ancestorsCache = useRef<Map<string, Set<string>>>(new Map());

  // Add this near the other state variables
  const [cachedNodeIds, setCachedNodeIds] = useState<Set<string>>(new Set());
  const cachedNodesTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});
  const CACHE_DURATION = 60000; // Keep nodes in cache for 1 minute after they leave viewport

  // Add this near the other state variables
  const [cachedConnectionIndices, setCachedConnectionIndices] = useState<Set<number>>(new Set());
  const cachedConnectionsTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});

  // Add scroll positions cache
  const scrollPositionsCache = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Add cleanup for scroll positions cache
  useEffect(() => {
    return () => {
      scrollPositionsCache.current.clear();
    };
  }, []);

  // Calculate if the screen is small based on width
  const isSmallScreen = useMemo(() => {
    // Ensure width is positive before checking
    return containerDimensions.width > 0 && containerDimensions.width < SMALL_SCREEN_WIDTH_THRESHOLD;
  }, [containerDimensions.width]);

  // Log the detected dimensions and screen size category for debugging
  useEffect(() => {
    if (isClient) { // Only log on the client
    }
  }, [containerDimensions.width, containerDimensions.height, isSmallScreen, isClient]);

  const getXPosition = useCallback(
    (year: number) => {
      // Still calculate minYear from data for node positioning
      // Return 0 if data isn't loaded yet to avoid errors
      if (!data.nodes.length) return 0;
      const minYear = Math.min(...data.nodes.map((n) => n.year));
      return calculateXPosition(year, minYear, PADDING, YEAR_WIDTH);
    },
    [data.nodes]
  );

  const calculateNodePositions = useCallback(
    (nodes: TechNode[]): TechNode[] => {
      if (!nodes.length) return [];

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
      const ABSOLUTE_MIN_Y = 100;

      // Define fixed vertical bands (pixels from top)
      const VERTICAL_BANDS: Record<string, number> = {
        Food: Math.max(100, ABSOLUTE_MIN_Y),
        Agriculture: Math.max(150, ABSOLUTE_MIN_Y),
        Biology: Math.max(200, ABSOLUTE_MIN_Y),
        Medicine: Math.max(250, ABSOLUTE_MIN_Y),
        Sanitation: 300,
        Physics: 400,
        Chemistry: 450,
        Astronomy: 500,
        Meteorology: 550,
        Optics: 600,
        Electricity: 650,
        Electronics: 700,
        Energy: 750,
        Lighting: 800,
        Construction: 850,
        Mining: 900,
        Metallurgy: 950,
        Manufacturing: 1000,
        Textiles: 1050,
        Hydraulics: 1100,
        Transportation: 1150,
        Flying: 1200,
        Sailing: 1250,
        Diving: 1300,
        Space: 1350,
        Geography: 1400,
        Mathematics: 1450,
        Measurement: 1500,
        Timekeeping: 1550,
        Computing: 1600,
        Finance: 1650,
        Safety: 1700,
        Security: 1750,
        Weaponry: 1800,
        Communication: 1850,
        "Visual media": 1900,
        Recreation: 1950,
        Music: 2000,
        Misc: 2050,
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
        const MIN_VERTICAL_GAP = VERTICAL_SPACING;

        // Sort nodes by their primary field's band (lowest band = top)
        nodesInYear.sort((a: TechNode, b: TechNode) => {
          const aPos = a.fields?.[0]
            ? VERTICAL_BANDS[a.fields[0]] || 1200
            : 1200;
          const bPos = b.fields?.[0]
            ? VERTICAL_BANDS[b.fields[0]] || 1200
            : 1200;
          return aPos - bPos;
        });

        // Stack nodes from the top band position, no overlap
        let currentY: number | null = null;
        const nodeYs: number[] = [];
        const nodeHeights: number[] = [];
        // First, stack deterministically
        nodesInYear.forEach((node: TechNode, idx: number) => {
          const nodeHeight = estimateNodeHeight(node);
          let basePosition;
          if (node.title.toLowerCase() === "stone tool") {
            basePosition = INFO_BOX_HEIGHT;
          } else {
            basePosition = Math.max(
              ABSOLUTE_MIN_Y,
              (node.fields?.[0] ? VERTICAL_BANDS[node.fields[0]] || 1200 : 1200)
            );
          }
          let y;
          if (currentY === null) {
            y = basePosition;
          } else {
            y = Math.max(currentY + MIN_VERTICAL_GAP, basePosition);
          }
          nodeYs.push(y);
          nodeHeights.push(nodeHeight);
          currentY = y + nodeHeight;
        });
        // Then, apply safe jitter
        nodesInYear.forEach((node: TechNode, idx: number) => {
          let y = nodeYs[idx];
          const nodeHeight = nodeHeights[idx];
          // Use a larger jitter for more visible effect
          const desiredJitter = 20;
          const rand = seededRandom(node.id);
          let jitter = -desiredJitter + rand * (2 * desiredJitter);
          // Clamp jitter so it doesn't cause overlap
          if (idx > 0) {
            const prevY = nodeYs[idx - 1];
            const prevHeight = nodeHeights[idx - 1];
            const minY = prevY + prevHeight + MIN_VERTICAL_GAP;
            if (y + jitter < minY) {
              jitter = minY - y;
            }
          }
          if (idx < nodesInYear.length - 1) {
            const nextY = nodeYs[idx + 1];
            const maxY = nextY - MIN_VERTICAL_GAP - nodeHeight;
            if (y + jitter > maxY) {
              jitter = maxY - y;
            }
          }
          y += jitter;
          positionedNodes.push({
            ...node,
            x,
            y,
          });
        });
      });

      const maxY = Math.max(
        ...positionedNodes.map(
          (node) => (node.y ?? 0) + estimateNodeHeight(node)
        )
      );
      setTotalHeight(maxY + 100); // With buffer of 100 px for tooltips

      return positionedNodes;
    }, []);

  // Add resetView function
  const resetView = useCallback(() => {
    if (horizontalScrollContainerRef.current) {
      horizontalScrollContainerRef.current.scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  // EFFECTS

  // 3. Optimize initial data fetching
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      let isMounted = true;
      const controller = new AbortController();

      try {
        // In development, always fetch fresh data
        if (process.env.NODE_ENV === 'development') {
          setIsLoading(true);
          const detailResponse = await fetchWithRetry("/api/inventions?detail=true", 3, 1000);
          const detailData = await detailResponse.json();

          if (!isMounted) return;

          const validatedDetailNodes = detailData.nodes?.map((node: TechNode) => ({
            ...node,
            // Only validate image URLs if we're showing images
            image: showImages ? validateImageUrl(node.image) : undefined
          })) || [];

          const positionedDetailNodes = calculateNodePositions(validatedDetailNodes);

          setData({ 
            nodes: positionedDetailNodes, 
            links: detailData.links || [] 
          });
          currentNodesRef.current = positionedDetailNodes;

          // Update spatial index
          const minX = Math.min(...positionedDetailNodes.map(n => n.x || Infinity));
          const maxX = Math.max(...positionedDetailNodes.map(n => n.x || -Infinity));
          const minY = Math.min(...positionedDetailNodes.map(n => n.y || Infinity));
          const maxY = Math.max(...positionedDetailNodes.map(n => n.y || -Infinity));
          
          const width = maxX - minX;
          const height = maxY - minY;
          const cellSize = Math.max(100, Math.min(250, Math.sqrt((width * height) / 150)));
          
          spatialIndexRef.current = new SpatialIndex(cellSize);
          positionedDetailNodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
              spatialIndexRef.current.addNode(node.id, { x: node.x, y: node.y });
            }
          });

          setIsLoading(false);
          return;
        }

        // In production, check cache first
        const cachedData = await cacheManager.get();
        
        if (cachedData?.detailData) {
          // If we have detailed data in cache, use it
          const validatedNodes = cachedData.detailData.nodes?.map((node: TechNode) => ({
            ...node,
            // Only validate image URLs if we're showing images
            image: showImages ? validateImageUrl(node.image) : undefined
          })) || [];
          
          const positionedDetailNodes = calculateNodePositions(validatedNodes);
          
          setData({ 
            nodes: positionedDetailNodes, 
            links: cachedData.detailData.links || [] 
          });
          currentNodesRef.current = positionedDetailNodes;

          // Reset and populate spatial index
          spatialIndexRef.current = new SpatialIndex(100);
          positionedDetailNodes.forEach((node: TechNode) => {
            if (node.x !== undefined && node.y !== undefined) {
              spatialIndexRef.current.addNode(node.id, { x: node.x, y: node.y });
            }
          });
          setIsLoading(false);
          return; // Exit early if we have detailed cached data
        }

        setIsLoading(true);

        // If we don't have detailed cached data, fetch fresh data
        const detailResponse = await fetchWithRetry("/api/inventions?detail=true", 3, 1000);
        const detailData = await detailResponse.json();

        if (!isMounted) return;

        const validatedDetailNodes = detailData.nodes?.map((node: TechNode) => ({
          ...node,
          // Only validate image URLs if we're showing images
          image: showImages ? validateImageUrl(node.image) : undefined
        })) || [];

        const positionedDetailNodes = calculateNodePositions(validatedDetailNodes);

        setData({ 
          nodes: positionedDetailNodes, 
          links: detailData.links || [] 
        });
        currentNodesRef.current = positionedDetailNodes;

        // Cache the detailed data
        await cacheManager.set({
          version: CACHE_VERSION,
          timestamp: Date.now(),
          basicData: detailData,
          detailData: detailData
        });

        // Update spatial index
        const minX = Math.min(...positionedDetailNodes.map(n => n.x || Infinity));
        const maxX = Math.max(...positionedDetailNodes.map(n => n.x || -Infinity));
        const minY = Math.min(...positionedDetailNodes.map(n => n.y || Infinity));
        const maxY = Math.max(...positionedDetailNodes.map(n => n.y || -Infinity));
        
        const width = maxX - minX;
        const height = maxY - minY;
        const cellSize = Math.max(100, Math.min(250, Math.sqrt((width * height) / 150)));
        
        spatialIndexRef.current = new SpatialIndex(cellSize);
        positionedDetailNodes.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            spatialIndexRef.current.addNode(node.id, { x: node.x, y: node.y });
          }
        });

      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error loading data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      return () => {
        isMounted = false;
        controller.abort();
      };
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []); // Changed from [calculateNodePositions]

  // Make sure containerDimensions are initialized with window size
  useEffect(() => {
    const updateContainerDimensions = () => {
      setContainerDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial dimensions
    updateContainerDimensions();

    // Set up listener for resize
    window.addEventListener('resize', updateContainerDimensions);

    return () => {
      window.removeEventListener('resize', updateContainerDimensions);
    };
  }, []);

  // Initialize viewport properly on first load and component mount
  useEffect(() => {
    if (containerDimensions.width > 0 && containerDimensions.height > 0) {
      // Initialize with proper dimensions
      const initialViewport = {
        left: 0,
        right: containerDimensions.width,
        top: 0,
        bottom: containerDimensions.height,
      };
      
      setVisibleViewport(initialViewport);
      setDeferredViewport(initialViewport);
    }
  }, [containerDimensions]);

  // Update the scrollPosition state based on onScroll event
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target === horizontalScrollContainerRef.current ||
        target === document.documentElement
      ) {
        const newScrollPosition = {
          left:
            horizontalScrollContainerRef.current?.scrollLeft ||
            window.scrollX ||
            document.documentElement.scrollLeft ||
            0,
          top:
            horizontalScrollContainerRef.current?.scrollTop ||
            window.scrollY ||
            document.documentElement.scrollTop ||
            0,
        };

        setScrollPosition(newScrollPosition);
      }
    };

    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Add logging to handleViewportChange (minimap click handler)
  const handleViewportChange = useCallback(
    (newScrollLeft: number, newScrollTop: number) => {
      // Our main container handles both horizontal and vertical scrolling
      // So we need to apply both coordinates to the same container
      if (horizontalScrollContainerRef.current) {
        horizontalScrollContainerRef.current.scrollTo({
          left: newScrollLeft,
          top: newScrollTop,
          behavior: "instant",
        });
        
        // Force update the scroll position state to ensure minimap sync
        setScrollPosition({
          left: newScrollLeft,
          top: newScrollTop
        });
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Track when first API request completes
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const result = originalFetch.apply(this, args);
        return result;
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);

  // Add handler for clicks outside nodes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check for tooltip elements more specifically
      const isTooltip = 
        !!target.closest(".fixed") || 
        !!target.closest(".bg-white") || 
        target.tagName === 'BUTTON' || 
        !!target.closest('button');
      
      const isInteractive = 
        !!target.closest(".tech-node") ||
        !!target.closest(".node-tooltip") ||
        !!target.closest(".connection") ||
        !!target.closest(".minimap") ||
        isTooltip;
      
      // Only log on actual clicks that change selection state
      if (!isInteractive) {
        setSelectedNodeId(null);
        setSelectedLinkIndex(null);
        setSelectedLinkKey(null);
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
    (title: string, isFromTooltip: boolean = false) => {
      performanceMarks.start('nodeClick');

      const node = data.nodes.find((n) => n.title === title);
      if (!node) return;

      // If clicking the same node, just deselect it
      if (selectedNodeId === node.id) {
        setSelectedNodeId(null);
        // Explicitly clear hover state on deselect
        setHoveredNode(null);
        setHoveredNodeId(null);
        // Clear highlights as well
        setHighlightedAncestors(new Set());
        setHighlightedDescendants(new Set());
        // Clear URL param on deselect
        router.replace('/', { scroll: false });
        performanceMarks.end('nodeClick');
        performanceMarks.log('nodeClick');
        return;
      }

      // Update selection state FIRST, before scrolling
      // This ensures the node is selected before any scrolling happens
      setSelectedNodeId(node.id);
      setSelectedLinkIndex(null);
      setSelectedLinkKey(null);
      setHoveredLinkIndex(null);
      setHighlightedAncestors(new Set());
      setHighlightedDescendants(new Set());

      // Update URL with selected node for deep linking
      router.replace(`/?node=${node.id}`, { scroll: false });

      // If mobile, explicitly set hover state to show tooltip immediately
      if (isMobile) {
        setHoveredNode(node);
        setHoveredNodeId(node.id);
      }

      // Calculate scroll position once
      const xPosition = getXPosition(node.year);
      const horizontalPosition = xPosition - (window.innerWidth / 2);
      const yPosition = node.y ?? 0;
      const verticalPosition = yPosition - containerDimensions.height / 2 + 150;

      // Start scrolling AFTER selection state is updated
      const container = horizontalScrollContainerRef.current;
      if (container) {
        container.scrollTo({
          left: Math.max(0, horizontalPosition),
          top: Math.max(0, verticalPosition),
          behavior: "smooth",
        });
      }

      performanceMarks.end('nodeClick');
      performanceMarks.log('nodeClick');
    },
    [data.nodes, selectedNodeId, getXPosition, containerDimensions.height, isMobile, router]
  );

  const handleJumpToNearest = useCallback(() => {
    if (!data.nodes.length || !horizontalScrollContainerRef.current || !containerDimensions.width || !containerDimensions.height) return;

    const viewportCenterX = scrollPosition.left + containerDimensions.width / 2;
    const viewportCenterY = scrollPosition.top + containerDimensions.height / 2;

    let nearestNode: TechNode | null = null;
    let minDistanceSq = Infinity;

    data.nodes.forEach((node: TechNode) => {
      if (node.y === undefined) return; // y is essential for positioning

      const nodeX = getXPosition(node.year); // x is derived via getXPosition
      const distanceSq = Math.pow(nodeX - viewportCenterX, 2) + Math.pow(node.y - viewportCenterY, 2);

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        nearestNode = node;
      }
    });

    if (nearestNode !== null && (nearestNode as TechNode).y !== undefined) {
      const nn = nearestNode as TechNode; // Assign to a new const with the asserted type
      const targetScrollLeft = getXPosition(nn.year) - containerDimensions.width / 2;
      const targetScrollTop = nn.y! - containerDimensions.height / 2; // Use non-null assertion

      horizontalScrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScrollLeft),
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }
  }, [data.nodes, scrollPosition, containerDimensions, horizontalScrollContainerRef, getXPosition]);

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

  // Helper function to get a unique key for a connection
  const getLinkKey = useCallback((link: TechTreeLink) => `${link.source}-${link.target}`, []);

  const shouldHighlightLink = useCallback(
    (link: TechTreeLink, index: number) => {
      // If a node is selected
      if (selectedNodeId) {
        return link.source === selectedNodeId || link.target === selectedNodeId;
      }
      // If a link is selected
      if (selectedLinkKey !== null) {
        return getLinkKey(link) === selectedLinkKey;
      }
      // If a node is being hovered
      if (hoveredNodeId) {
        return link.source === hoveredNodeId || link.target === hoveredNodeId;
      }
      // If a link is being hovered
      if (hoveredLinkIndex === index) return true;
      return false;
    },
    [hoveredLinkIndex, hoveredNodeId, selectedNodeId, selectedLinkKey, getLinkKey]
  );

  const isNodeConnectedToSelectedLink = useCallback(
    (nodeId: string) => {
      if (selectedLinkKey === null) return false;
      const [sourceId, targetId] = selectedLinkKey.split('-');
      return sourceId === nodeId || targetId === nodeId;
    },
    [selectedLinkKey]
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
      // First get all special connections
      const replaced = data.links
        .filter((link) => link.target === nodeId && link.type === "Obsolescence")
        .map((link) => ({
          node: data.nodes.find((n) => n.id === link.source),
          link
        }))
        .filter((item): item is { node: TechNode; link: TechTreeLink } => item.node !== undefined)
        .sort((a, b) => a.node.year - b.node.year);

      const replacedBy = data.links
        .filter((link) => link.source === nodeId && link.type === "Obsolescence")
        .map((link) => ({
          node: data.nodes.find((n) => n.id === link.target),
          link
        }))
        .filter((item): item is { node: TechNode; link: TechTreeLink } => item.node !== undefined)
        .sort((a, b) => b.node.year - a.node.year);

      const independentlyInvented = data.links
        .filter((link) => 
          (link.source === nodeId || link.target === nodeId) && 
          link.type === "Independently invented"
        )
        .map((link) => {
          const otherNodeId = link.source === nodeId ? link.target : link.source;
          return {
            node: data.nodes.find((n) => n.id === otherNodeId),
            link
          };
        })
        .filter((item): item is { node: TechNode; link: TechTreeLink } => item.node !== undefined)
        .sort((a, b) => a.node.year - b.node.year);

      const concurrentDevelopment = data.links
        .filter((link) => 
          (link.source === nodeId || link.target === nodeId) && 
          link.type === "Concurrent development"
        )
        .map((link) => {
          const otherNodeId = link.source === nodeId ? link.target : link.source;
          return {
            node: data.nodes.find((n) => n.id === otherNodeId),
            link
          };
        })
        .filter((item): item is { node: TechNode; link: TechTreeLink } => item.node !== undefined)
        .sort((a, b) => a.node.year - b.node.year);

      // Create sets of IDs for special connections to exclude
      const specialNodeIds = new Set([
        ...replaced.map(item => item.node.id),
        ...replacedBy.map(item => item.node.id),
        ...independentlyInvented.map(item => item.node.id),
        ...concurrentDevelopment.map(item => item.node.id)
      ]);

      // Get regular connections, excluding any that are in special categories
      const ancestors = data.links
        .filter((link) => 
          link.target === nodeId && 
          !specialNodeIds.has(link.source) &&
          !["Obsolescence", "Independently invented", "Concurrent development"].includes(link.type)
        )
        .map((link) => ({
          node: data.nodes.find((n) => n.id === link.source),
          link
        }))
        .filter((item): item is { node: TechNode; link: TechTreeLink } => item.node !== undefined)
        // Sort ancestors by year (most recent first)
        .sort((a, b) => b.node.year - a.node.year);

      const children = data.links
        .filter((link) => 
          link.source === nodeId && 
          !specialNodeIds.has(link.target) &&
          !["Obsolescence", "Independently invented", "Concurrent development"].includes(link.type)
        )
        .map((link) => ({
          node: data.nodes.find((n) => n.id === link.target),
          link
        }))
        .filter((item): item is { node: TechNode; link: TechTreeLink } => item.node !== undefined)
        // Sort children by year (earliest first)
        .sort((a, b) => a.node.year - b.node.year);

      return { 
        ancestors, 
        children, 
        replaced, 
        replacedBy,
        independentlyInvented,
        concurrentDevelopment
      };
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
        node.subfields?.join(" "),
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
          ...(node.inventors?.filter(inv => inv.toLowerCase() !== 'unknown').map((inv) => "inventor:" + inv.toLowerCase()) ||
            []),
          ...(node.organizations?.map((org) => "org:" + org.toLowerCase()) ||
            []),
          ...node.fields.map((field) => "field:" + field.toLowerCase()),
          ...(node.subfields?.map((subfield) => "subfield:" + subfield.toLowerCase()) || []),
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
        if (results.length >= MAX_SEARCH_RESULTS) break;
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
          const lowerTrimmedQuery = query.toLowerCase().trim();

          // Prioritize matches in title/subtitle with new scoring
          const titleFullWordRegex = new RegExp(`\\b${escapeRegExp(lowerTrimmedQuery)}\\b`);
          if (titleFullWordRegex.test(lowerTitle)) {
            score += 15; // Highest score for full word match
          } else if (lowerTitle.startsWith(lowerTrimmedQuery)) {
            score += 10; // Medium score for startsWith
          } else if (lowerTitle.includes(lowerTrimmedQuery)) {
            score += 5; // Base score for includes
          }

          const subtitleFullWordRegex = new RegExp(`\\b${escapeRegExp(lowerTrimmedQuery)}\\b`);
          if (subtitleFullWordRegex.test(lowerSubtitle)) {
            score += 8; // Highest score for subtitle full word match
          } else if (lowerSubtitle.startsWith(lowerTrimmedQuery)) {
            score += 5; // Medium score for subtitle startsWith
          } else if (lowerSubtitle.includes(lowerTrimmedQuery)) {
            score += 2; // Base score for subtitle includes
          }

          if (score > 0) {
            results.push({
              type: "node",
              node,
              text: node.title,
              // Use original formatYear call
              subtext: `${formatYear(node.year)} ${
                node.subtitle ? ` – ${node.subtitle}` : ""
              }`,
              matchScore: score,
            });
            addedNodes.add(nodeId);
            continue;
          }

          // Check other fields only if necessary
          if (!addedNodes.has(nodeId)) {
            const actualInventors = node.inventors?.filter(inv => inv.toLowerCase() !== 'unknown') || [];
            const matchingInventors = actualInventors.filter(inv => inv.toLowerCase().includes(query.toLowerCase()));

            if (matchingInventors.length > 0) {
              results.push({
                type: "person",
                node,
                text: matchingInventors.join(", "),
                // Use original formatYear call
                subtext: `${node.type === "Discovery" ? "Discovered" : "Invented"} ${node.title} (${formatYear(node.year)})`,
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
                // Use original formatYear call
                subtext: `Developed ${node.title} (${formatYear(node.year)})`,
                matchScore: 3,
              });
              addedNodes.add(nodeId);
            }
          }
        }
      }

      results.sort((a, b) => b.matchScore - a.matchScore);
      setSearchResults(results.slice(0, MAX_SEARCH_RESULTS));
    },
    // Restore original dependencies
    [searchIndex, data.nodes, formatYear]
  );

  // Update handleSelectResult to account for zoom level
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      if (result.type === "year" && result.year) {
        if (horizontalScrollContainerRef.current) {
          const xPosition = getXPosition(result.year);
          const horizontalPosition = xPosition - (window.innerWidth / 2);

          horizontalScrollContainerRef.current.scrollTo({
            left: Math.max(0, horizontalPosition),
            behavior: "smooth",
          });
        }
      } else if (result.node) {
        handleNodeClick(result.node.title);
      }
    },
    [getXPosition, handleNodeClick]
  );

  const isNodeFiltered = useCallback(
    (node: TechNode) => {
      // Apply field filters
      if (filters.fields.size > 0) {
        const nodeFields = node.fields || [];
        if (!nodeFields.some((field) => filters.fields.has(field))) {
          return false;
        }
      }

      // Apply subfield filters
      if (filters.subfields.size > 0) {
        const nodeSubfields = node.subfields || [];
        if (!nodeSubfields.some((subfield) => filters.subfields.has(subfield))) {
          return false;
        }
      }

      // Apply country filters
      if (filters.countries.size > 0) {
        // Combine historical and modern countries
        const nodeCountries = [
          ...(node.countryHistorical?.split(",").map((c) => c.trim()) || []),
          ...(node.countryModern
            ?.split(",")
            .map((c) => c.trim())
            .filter(Boolean) || []),
        ];
        if (!nodeCountries.some((country: string) => filters.countries.has(country))) {
          return false;
        }
      }

      // Apply city filters
      if (filters.cities.size > 0) {
        const nodeCities = node.city ? node.city.split(",").map((c) => c.trim()) : [];
        if (!nodeCities.some((city: string) => filters.cities.has(city))) {
          return false;
        }
      }

      return true;
    },
    [filters.fields, filters.subfields, filters.countries, filters.cities]
  );

  const isLinkVisible = useCallback(
    (link: TechTreeLink): boolean => {
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
      subfields: Array.from(new Set(data.nodes.flatMap((n) => n.subfields || []))).sort(),
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
      filters.subfields.size > 0 ||
      filters.countries.size > 0 ||
      filters.cities.size > 0;

    if (!hasActiveFilters) {
      return new Set<string>();
    }

    return new Set<string>(
      data.nodes.filter((node) => isNodeFiltered(node)).map((node) => node.id)
    );
  }, [filters, data.nodes, isNodeFiltered]);

  const selectedConnectionNodeIds = useMemo(() => {
    if (selectedLinkKey === null) return new Set<string>();
    // Parse the selectedLinkKey to get source and target
    const [source, target] = selectedLinkKey.split('-');
    return new Set([source, target]);
  }, [selectedLinkKey]);

  const adjacentNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return new Set(
      data.links
        .filter((link) => link.source === selectedNodeId || link.target === selectedNodeId)
        .map((link) => (link.source === selectedNodeId ? link.target : link.source))
    );
  }, [selectedNodeId, data.links]);

  // Add this near the top of the component
  const prefetchedNodes = useRef(new Set<string>());
  const prefetchQueue = useRef<string[]>([]);
  const isPrefetching = useRef(false);

  // Process the prefetch queue one by one to avoid overwhelming the network
  const processPrefetchQueue = useCallback(async () => {
    // No-op since we have all data
  }, []);

  // Update the prefetchNode function to use the queue
  const prefetchNode = useCallback((nodeId: string, priority = false) => {
    // No-op since we have all data
  }, []);

  // Function to prefetch important nodes proactively
  const prefetchImportantNodes = useCallback(() => {
    // No-op since we have all data
  }, [selectedNodeId, selectedLinkKey, data.links, highlightedAncestors, highlightedDescendants]);

  // Add this effect to prefetch data for connected nodes when a node is selected
  useEffect(() => {
    // No-op since we have all data
  }, [prefetchImportantNodes]);

  useEffect(() => {
    // No-op since we have all data
  }, [data.nodes, prefetchNode]);

  // Add this effect to prefetch data for nodes connected by a selected link
  useEffect(() => {
    if (selectedLinkKey === null) return;
    
    // Get node IDs from the selectedLinkKey
    const [source, target] = selectedLinkKey.split('-');
    
    // Prefetch both source and target nodes
    prefetchNode(source);
    prefetchNode(target);
    
  }, [selectedLinkKey, prefetchNode]);

  // Add this effect to prefetch nodes when filters are applied
  useEffect(() => {
    // Skip if no filters are applied
    const hasActiveFilters = filters.fields.size > 0 || filters.subfields.size > 0 || filters.countries.size > 0 || filters.cities.size > 0;
    if (!hasActiveFilters) return;
        
    // Find nodes that match the current filters
    const matchingNodes = data.nodes.filter(node => {
      // Check if node matches field filters
      const matchesFields = filters.fields.size === 0 || 
        node.fields?.some(field => filters.fields.has(field));
      
      // Check if node matches subfield filters
      const matchesSubfields = filters.subfields.size === 0 || 
        node.subfields?.some(subfield => filters.subfields.has(subfield));
      
      // Check if node matches country filters
      const matchesCountries = filters.countries.size === 0 || 
        (node.formattedLocation && filters.countries.has(cleanLocationForTooltip(node.formattedLocation) || '')) ||
        (node.countryModern && filters.countries.has(node.countryModern)) ||
        (node.countryHistorical && filters.countries.has(node.countryHistorical));
      
      // Check if node matches city filters
      const matchesCity = filters.cities.size === 0 || 
        (node.city && filters.cities.has(node.city)) ||
        (node.formattedLocation && filters.cities.has(cleanLocationForTooltip(node.formattedLocation) || ''));
      
      return matchesFields && matchesSubfields && matchesCountries && matchesCity;
    });

    // Limit the number of nodes to prefetch to avoid overwhelming the API
    const nodesToPrefetch = matchingNodes.slice(0, 20);
        
    // Prefetch the matching nodes in parallel
    const prefetchPromises = nodesToPrefetch
      .filter(node => !prefetchedNodes.current.has(node.id))
      .map(node => prefetchNode(node.id));
        
    // Execute all prefetch requests
    Promise.all(prefetchPromises).then(() => {
    }).catch(error => {
      console.warn('Error prefetching filtered nodes:', error);
    });
    
    // Also prefetch connections between these nodes
    const filteredNodeIds = new Set(nodesToPrefetch.map(node => node.id));
    
    // Find all connections where both source and target are in the filtered nodes
    // or where one node is in the filtered set and the other is a direct connection
    const relevantConnections = data.links.filter(link => {
      // Direct connections between filtered nodes
      const isDirectConnection = filteredNodeIds.has(link.source) && filteredNodeIds.has(link.target);
      
      // One-hop connections (where only one end is in the filtered set)
      const isOneHopConnection = 
        (filteredNodeIds.has(link.source) || filteredNodeIds.has(link.target));
      
      return isDirectConnection || isOneHopConnection;
    });
    
    // Update the cache to include these connections
    setCachedConnectionIndices(prev => {
      const updated = new Set(prev);
      relevantConnections.forEach(link => {
        const index = data.links.findIndex(l => l === link);
        if (index !== -1) {
          updated.add(index);
          
          // Also prefetch the nodes at both ends of the connection
          if (!filteredNodeIds.has(link.source)) {
            prefetchNode(link.source);
          }
          if (!filteredNodeIds.has(link.target)) {
            prefetchNode(link.target);
          }
        }
      });
      return updated;
    });
    
  }, [filters, data.nodes, data.links, prefetchNode, cleanLocationForTooltip]);

  // Effect to handle initial node selection from URL parameter
  const hasScrolledToInitialNode = useRef(false);
  useEffect(() => {
    // Only run once after data is loaded and if we haven't scrolled yet
    if (!isLoading && data.nodes.length > 0 && !hasScrolledToInitialNode.current) {
      hasScrolledToInitialNode.current = true; // Mark as done immediately to prevent re-runs
      // Support both ?node= (new) and ?initialNodeId= (legacy) params
      const nodeId = searchParams.get('node') || searchParams.get('initialNodeId');
      if (nodeId) {
        const nodeToSelect = data.nodes.find(node => node.id === nodeId);
        if (nodeToSelect) {
          // Use a slight delay to ensure the layout is stable before scrolling
          setTimeout(() => {
             handleNodeClick(nodeToSelect.title);
          }, 100); // 100ms delay, adjust if needed
        }
      }
    }
  }, [isLoading, data.nodes, searchParams, handleNodeClick]);

  // Update handleNodeHover to limit prefetching and handle mobile devices differently
  const handleNodeHover = useCallback(
    (node: TechNode) => {
      // On mobile, don't update hover state as we'll go straight to selection
      if (!isMobile) {
        setHoveredNode(node);
        setHoveredNodeId(node.id);
      }

      // Only prefetch if we're showing images
      if (showImages) {
        // Only prefetch immediate neighbors
        const connectedNodeIds = data.links
          .filter((link) => link.source === node.id || link.target === node.id)
          .map((link) => (link.source === node.id ? link.target : link.source))
          // Limit the number of simultaneous prefetch requests
          .slice(0, 5);

        let prefetchedOnHoverCount = 0;
        // Use for...of instead of forEach to avoid TypeScript errors
        for (const nodeId of connectedNodeIds) {
          prefetchNode(nodeId);
          prefetchedOnHoverCount++;
        }
      }
    },
    [data.links, prefetchNode, isMobile, showImages]
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
    if (selectedLinkKey === null) return new Set<string>();
    const [source, target] = selectedLinkKey.split('-');
    return new Set([source, target]);
  }, [selectedLinkKey]);

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
      performanceMarks.start('getAllAncestors');
      
      // Check cache first
      if (ancestorsCache.current.has(nodeId)) {
        const cached = ancestorsCache.current.get(nodeId)!;
        performanceMarks.end('getAllAncestors');
        performanceMarks.log('getAllAncestors');
        return cached;
      }
      
      if (visited.has(nodeId)) {
        performanceMarks.end('getAllAncestors');
        performanceMarks.log('getAllAncestors');
        return visited;
      }
      visited.add(nodeId);

      // Find all direct ancestors
      const directAncestors = data.links
        .filter(
          (link) =>
            link.target === nodeId &&
            !["Independently invented", "Concurrent development"].includes(
              link.type
            )
        )
        .map((link) => link.source);

      // Recursively get ancestors of ancestors
      directAncestors.forEach((ancestorId) => {
        getAllAncestors(ancestorId, visited);
      });

      // Cache the result
      ancestorsCache.current.set(nodeId, visited);
      
      performanceMarks.end('getAllAncestors');
      performanceMarks.log('getAllAncestors');
      return visited;
    },
    [data.links]
  );

  const getAllDescendants = useCallback(
    (nodeId: string, visited = new Set<string>()): Set<string> => {
      performanceMarks.start('getAllDescendants');
      
      // Check cache first
      if (descendantsCache.current.has(nodeId)) {
        const cached = descendantsCache.current.get(nodeId)!;
        performanceMarks.end('getAllDescendants');
        performanceMarks.log('getAllDescendants');
        return cached;
      }
      
      if (visited.has(nodeId)) {
        performanceMarks.end('getAllDescendants');
        performanceMarks.log('getAllDescendants');
        return visited;
      }
      visited.add(nodeId);

      // Find all direct descendants
      const directDescendants = data.links
        .filter(
          (link) =>
            link.source === nodeId &&
            !["Independently invented", "Concurrent development"].includes(
              link.type
            )
        )
        .map((link) => link.target);

      // Recursively get descendants of descendants
      directDescendants.forEach((descendantId) => {
        getAllDescendants(descendantId, visited);
      });

      // Cache the result
      descendantsCache.current.set(nodeId, visited);
      
      performanceMarks.end('getAllDescendants');
      performanceMarks.log('getAllDescendants');
      return visited;
    },
    [data.links]
  );

  // Add cleanup for caches when data changes
  useEffect(() => {
    descendantsCache.current.clear();
    ancestorsCache.current.clear();
  }, [data.links]);

  // Remove unused touch handlers
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
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobileDevice = width <= SMALL_SCREEN_WIDTH_THRESHOLD;
      const isIPadDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      setIsIPad(isIPadDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle Escape key to deselect and clear URL
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Clear all selections and highlights
      setSelectedNodeId(null);
      setSelectedLinkIndex(null);
      setSelectedLinkKey(null);
      setHoveredNode(null);
      setHoveredNodeId(null);
      setHoveredLinkIndex(null);
      setHighlightedAncestors(new Set());
      setHighlightedDescendants(new Set());
      // Clear URL param
      router.replace('/', { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  // Remove all touch handlers
  // Remove all zoom-related code

  // Add effect to initialize viewport
  useEffect(() => {
    if (horizontalScrollContainerRef.current && verticalScrollContainerRef.current) {
      const horizontalScroll = horizontalScrollContainerRef.current.scrollLeft;
      const verticalScroll = verticalScrollContainerRef.current.scrollTop;
      
      const newViewport = {
        left: horizontalScroll,
        right: horizontalScroll + containerDimensions.width,
        top: verticalScroll,
        bottom: verticalScroll + containerDimensions.height,
      };

      setVisibleViewport(newViewport);
    }
  }, [containerDimensions.width, containerDimensions.height]);

  // Simplified isNodeInViewport function
  const isNodeInViewport = useCallback(
    (node: TechNode) => {
      // Nodes without position data can't be in viewport
      if (node.x === undefined || node.y === undefined) {
        return false;
      }

      // Use a reasonable buffer for better user experience
      const buffer = Math.min(window.innerWidth / 3, 350);
      const bufferedViewport = {
        left: deferredViewportState.left - buffer,
        right: deferredViewportState.right + buffer,
        top: deferredViewportState.top - buffer,
        bottom: deferredViewportState.bottom + buffer,
      };

      // Simple bounds check
      const isVisible = (
        node.x >= bufferedViewport.left &&
        node.x <= bufferedViewport.right &&
        node.y >= bufferedViewport.top &&
        node.y <= bufferedViewport.bottom
      );
      
      return isVisible;
    },
    [deferredViewportState, scrollPosition]
  );

  // Add strict visibility check with minimal buffer
  const isNodeStrictlyInViewport = useCallback(
    (node: TechNode) => {
      // Nodes without position data can't be in viewport
      if (node.x === undefined || node.y === undefined) {
        return false;
      }

      // Use a small buffer for better user experience
      const buffer = 10; // Much smaller buffer than the display buffer
      const strictViewport = {
        left: deferredViewportState.left - buffer,
        right: deferredViewportState.right + buffer,
        top: deferredViewportState.top - buffer,
        bottom: deferredViewportState.bottom + buffer,
      };

      // Calculate node bounds (using NODE_WIDTH and estimated height)
      const nodeLeft = node.x - NODE_WIDTH / 2;
      const nodeRight = node.x + NODE_WIDTH / 2;
      const nodeTop = node.y;
      const nodeBottom = node.y + 200; // Approximate node height

      // Calculate intersection area
      const intersectionLeft = Math.max(nodeLeft, strictViewport.left);
      const intersectionRight = Math.min(nodeRight, strictViewport.right);
      const intersectionTop = Math.max(nodeTop, strictViewport.top);
      const intersectionBottom = Math.min(nodeBottom, strictViewport.bottom);

      // If there's no intersection, node is not visible
      if (intersectionLeft >= intersectionRight || intersectionTop >= intersectionBottom) {
        return false;
      }

      // Calculate intersection area
      const intersectionArea = (intersectionRight - intersectionLeft) * (intersectionBottom - intersectionTop);
      const nodeArea = NODE_WIDTH * 200; // Approximate node area

      // Node is considered visible if at least 30% of its area is in viewport
      return intersectionArea / nodeArea > 0.3;
    },
    [deferredViewportState]
  );

  // Add memoized strictly visible nodes
  const strictlyVisibleNodes = useMemo(() => {
    return data.nodes.filter(node => isNodeStrictlyInViewport(node));
  }, [data.nodes, isNodeStrictlyInViewport]);

  // Simplified isConnectionInViewport function
  const isConnectionInViewport = useCallback(
    (link: TechTreeLink, index: number) => {
      // Get the source and target nodes
      const sourceNode = data.nodes.find(n => n.id === link.source);
      const targetNode = data.nodes.find(n => n.id === link.target);
      
      // If we can't find either node with valid positions, connection can't be in viewport
      if (!sourceNode?.x || !sourceNode?.y || !targetNode?.x || !targetNode?.y) {
        return false;
      }

      // Use a larger buffer specifically for connections to prevent them from disappearing during scrolling
      const buffer = Math.min(window.innerWidth / 2, 500);
      const bufferedViewport = {
        left: deferredViewportState.left - buffer,
        right: deferredViewportState.right + buffer,
        top: deferredViewportState.top - buffer,
        bottom: deferredViewportState.bottom + buffer,
      };

      // Connection is visible if either end is in viewport
      const isSourceInViewport = 
        sourceNode.x >= bufferedViewport.left &&
        sourceNode.x <= bufferedViewport.right &&
        sourceNode.y >= bufferedViewport.top &&
        sourceNode.y <= bufferedViewport.bottom;
      
      const isTargetInViewport = 
        targetNode.x >= bufferedViewport.left &&
        targetNode.x <= bufferedViewport.right &&
        targetNode.y >= bufferedViewport.top &&
        targetNode.y <= bufferedViewport.bottom;
      
      // Also check if connection crosses viewport even if endpoints are outside
      if (!isSourceInViewport && !isTargetInViewport) {
        // Calculate control points for the bezier curve (simplified approximation)
        const isSameYear = Math.abs(sourceNode.x - targetNode.x) < 160;
        const controlPointOffset = Math.min(Math.abs(sourceNode.x - targetNode.x) * 0.5, 200);
        
        let cx1, cy1, cx2, cy2;
        
        if (isSameYear) {
          // For same-year connections (s-curve)
          const horizontalOffset = 200;
          cx1 = sourceNode.x + horizontalOffset;
          cy1 = sourceNode.y - Math.sign(sourceNode.y - targetNode.y) * 50;
          cx2 = targetNode.x - horizontalOffset;
          cy2 = targetNode.y - Math.sign(targetNode.y - sourceNode.y) * 50;
        } else {
          // For regular connections
          cx1 = sourceNode.x + controlPointOffset;
          cy1 = sourceNode.y;
          cx2 = targetNode.x - controlPointOffset;
          cy2 = targetNode.y;
        }
        
        // Check if bounding box of the curve intersects the viewport
        const curveBoundingBox = {
          left: Math.min(sourceNode.x, targetNode.x, cx1, cx2),
          right: Math.max(sourceNode.x, targetNode.x, cx1, cx2),
          top: Math.min(sourceNode.y, targetNode.y, cy1, cy2),
          bottom: Math.max(sourceNode.y, targetNode.y, cy1, cy2),
        };
        
        // Return true if the bounding box of the curve intersects the viewport
        return !(
          curveBoundingBox.right < bufferedViewport.left ||
          curveBoundingBox.left > bufferedViewport.right ||
          curveBoundingBox.bottom < bufferedViewport.top ||
          curveBoundingBox.top > bufferedViewport.bottom
        );
      }
      
      return isSourceInViewport || isTargetInViewport;
    },
    [deferredViewportState, data.nodes]
  );

  // Add debounced viewport update
  const viewportUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const VIEWPORT_UPDATE_DEBOUNCE = 50; // ms

  const debouncedViewportUpdate = useCallback((newViewport: typeof visibleViewport) => {
    if (viewportUpdateTimeoutRef.current) {
      clearTimeout(viewportUpdateTimeoutRef.current);
    }

    viewportUpdateTimeoutRef.current = setTimeout(() => {
      setVisibleViewport(newViewport);
      // Also update the deferred viewport state for visibility calculations
      setDeferredViewport(newViewport);
    }, VIEWPORT_UPDATE_DEBOUNCE);
  }, []);

  // Modify the viewport update handler
  const updateViewportState = useCallback((scrollLeft: number, scrollTop: number) => {
    const newViewport = {
      left: scrollLeft,
      right: scrollLeft + containerDimensions.width,
      top: scrollTop,
      bottom: scrollTop + containerDimensions.height
    };

    debouncedViewportUpdate(newViewport);
  }, [containerDimensions.width, containerDimensions.height, debouncedViewportUpdate]);

  // Add cleanup for the debounce timeout
  useEffect(() => {
    return () => {
      if (viewportUpdateTimeoutRef.current) {
        clearTimeout(viewportUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Update the scroll handler to find containers at the right time
  useEffect(() => {
    // Store local references to avoid read-only ref issues
    let hContainer: HTMLDivElement | null = null;
    let vContainer: HTMLDivElement | null = null;
    
    const findContainers = () => {
      // First try the refs
      if (horizontalScrollContainerRef.current) {
        hContainer = horizontalScrollContainerRef.current;
      }
      if (verticalScrollContainerRef.current) {
        vContainer = verticalScrollContainerRef.current;
      }
      
      // Try to find horizontal container if not found yet
      if (!hContainer) {
        const foundH = document.querySelector('.overflow-x-auto') || 
                       document.querySelector('[ref=horizontalScrollContainerRef]') ||
                       document.querySelector('div[style*="overflow-x"]');
        if (foundH) {
          hContainer = foundH as HTMLDivElement;
        }
      }
      
      // Try to find vertical container if not found yet
      if (!vContainer) {
        const foundV = document.querySelector('.overflow-y-auto') ||
                       document.querySelector('[ref=verticalScrollContainerRef]') ||
                       document.querySelector('div[style*="overflow-y"]');
        if (foundV) {
          vContainer = foundV as HTMLDivElement;
        }
      }

      return { hContainer, vContainer };
    };
    
    // Create scroll handler with debounced viewport update
    const handleScroll = () => {
      const { hContainer, vContainer } = findContainers();
      if (!hContainer) return;
      
      const scrollLeft = hContainer.scrollLeft;
      const scrollTop = vContainer ? vContainer.scrollTop : window.scrollY;
      
      updateViewportState(scrollLeft, scrollTop);
    };
    
    // Set up a MutationObserver to watch for container availability
    const observer = new MutationObserver(() => {
      const { hContainer, vContainer } = findContainers();
      if (hContainer && vContainer) {
        observer.disconnect();
        
        // Attach event listeners directly to the containers
        hContainer.addEventListener('scroll', handleScroll);
        vContainer.addEventListener('scroll', handleScroll);
        
        // Force an update now that we have containers
        handleScroll();
      }
    });
    
    // Start observing the document for container creation
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also watch for resize events
    window.addEventListener('resize', handleScroll);
    
    return () => {
      // Clean up event listeners
      const { hContainer, vContainer } = findContainers();
      if (hContainer) {
        hContainer.removeEventListener('scroll', handleScroll);
      }
      if (vContainer) {
        vContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [containerDimensions, updateViewportState]);

  // Add this memoized function for calculating node opacity
  const getNodeOpacity = useCallback(
    (node: TechNode) => {
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
        return isNodeConnectedToSelectedLink(node.id) ? 1 : 0.2;
      }
      // If filters are applied
      if (filters.fields.size || filters.subfields.size || filters.countries.size || filters.cities.size) {
        return isNodeFiltered(node) ? 1 : 0.2;
      }
      // Default state - fully visible
      return 1;
    },
    [selectedNodeId, selectedLinkIndex, filters, isAdjacentToSelected, isNodeConnectedToSelectedLink, isNodeFiltered, highlightedAncestors, highlightedDescendants]
  );

  // Add this memoized function for calculating link opacity
  const getLinkOpacity = useCallback(
    (link: TechTreeLink, index: number) => {
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
        if (link.source === selectedNodeId || link.target === selectedNodeId) {
          return 1;
        }
        return 0.2;
      }
      // If a link is selected
      if (selectedLinkKey !== null) {
        return getLinkKey(link) === selectedLinkKey ? 1 : 0.2;
      }
      // If filters are applied
      if (filters.fields.size || filters.subfields.size || filters.countries.size || filters.cities.size) {
        return isLinkVisible(link) ? 1 : 0.2;
      }
      return 1;
    },
    [selectedNodeId, selectedLinkKey, filters, highlightedAncestors, highlightedDescendants, isLinkVisible, getLinkKey]
  );

  // Add performance measurement refs
  const memoRecalculationCount = useRef({ nodes: 0, connections: 0 });

  // Add these near other state/ref declarations
  const lastCalculationTime = useRef(0);
  const lastCalculationFrame = useRef(0);
  const calculationTrigger = useRef<'selection' | 'highlight' | 'filter' | 'viewport' | 'cache' | 'initial' | 'unknown'>('initial');
  const previousCalculation = useRef<TechTreeVisibleElements>({
    visibleNodes: [],
    visibleConnections: [],
    nodeVisibleConnections: 0,
    stickyVisibleConnections: 0,
    invisibleViewportConnections: 0
  });
  const lastSelectionState = useRef({ nodeId: null as string | null, linkIndex: null as number | null });

  // Update selection trigger to be more precise
  useEffect(() => {
    // Only trigger if selection actually changed
    if (selectedNodeId !== lastSelectionState.current.nodeId || 
        selectedLinkIndex !== lastSelectionState.current.linkIndex) {
      calculationTrigger.current = 'selection';
      lastSelectionState.current = { nodeId: selectedNodeId, linkIndex: selectedLinkIndex };
      
      // Force a new frame for selection changes
      lastCalculationFrame.current = -1;
    }
  }, [selectedNodeId, selectedLinkIndex]);

  // Add these near the top of the component with other refs
  const connectionLookupCache = useRef<Map<string, Set<number>>>(new Map());
  const nodeConnectionCache = useRef<Map<string, Set<string>>>(new Map());
  const lastFrameData = useRef<{
    selectedNodeId: string | null;
    selectedLinkIndex: number | null;
    highlightedAncestors: string;
    highlightedDescendants: string;
    filteredNodeIds: string;
    viewport: { left: number; right: number; top: number; bottom: number };
    showAllConnections: boolean; // Add to frame data for memo comparison
    connectionMode: 'all' | 'optimized' | 'minimal';
  } | null>(null);

  // Add this helper function to get connections for a node
  const getNodeConnectionIndices = useCallback((nodeId: string): Set<number> => {
    if (connectionLookupCache.current.has(nodeId)) {
      return connectionLookupCache.current.get(nodeId)!;
    }
    
    const connections = new Set<number>();
    data.links.forEach((link, index) => {
      if (link.source === nodeId || link.target === nodeId) {
        connections.add(index);
      }
    });
    
    connectionLookupCache.current.set(nodeId, connections);
    return connections;
  }, [data.links]);

  // Add this helper function to get connected nodes
  const getConnectedNodes = useCallback((nodeId: string): Set<string> => {
    if (nodeConnectionCache.current.has(nodeId)) {
      return nodeConnectionCache.current.get(nodeId)!;
    }
    
    const connectedNodes = new Set<string>();
    data.links.forEach(link => {
      if (link.source === nodeId) {
        connectedNodes.add(link.target);
      } else if (link.target === nodeId) {
        connectedNodes.add(link.source);
      }
    });
    
    nodeConnectionCache.current.set(nodeId, connectedNodes);
    return connectedNodes;
  }, [data.links]);

  // Create stable dependency values for set comparisons
  const stableHighlightedAncestorsString = useMemo(
    () => Array.from(highlightedAncestors).sort().join(','),
    [highlightedAncestors]
  );
  
  const stableHighlightedDescendantsString = useMemo(
    () => Array.from(highlightedDescendants).sort().join(','),
    [highlightedDescendants]
  );
  
  const stableFilteredNodeIdsString = useMemo(
    () => Array.from(filteredNodeIds).sort().join(','),
    [filteredNodeIds]
  );

  // Update visibleElements memo with performance logging
  const visibleElements = useMemo<TechTreeVisibleElements>(() => {
    const startTime = performance.now();
    performanceMarks.start('visibleElements');

    const stableViewport = {
      left: Math.floor(deferredViewportState.left / 100) * 100,
      right: Math.ceil(deferredViewportState.right / 100) * 100,
      top: Math.floor(deferredViewportState.top / 100) * 100,
      bottom: Math.ceil(deferredViewportState.bottom / 100) * 100
    };

    const currentFrameData = {
      selectedNodeId,
      selectedLinkIndex,
      highlightedAncestors: stableHighlightedAncestorsString,
      highlightedDescendants: stableHighlightedDescendantsString,
      filteredNodeIds: stableFilteredNodeIdsString,
      viewport: stableViewport,
      showAllConnections,
      connectionMode // Add connectionMode to frame data
    };

    if (lastFrameData.current &&
        currentFrameData.selectedNodeId === lastFrameData.current.selectedNodeId &&
        currentFrameData.selectedLinkIndex === lastFrameData.current.selectedLinkIndex &&
        currentFrameData.highlightedAncestors === lastFrameData.current.highlightedAncestors &&
        currentFrameData.highlightedDescendants === lastFrameData.current.highlightedDescendants &&
        currentFrameData.filteredNodeIds === lastFrameData.current.filteredNodeIds &&
        currentFrameData.viewport.left === lastFrameData.current.viewport.left &&
        currentFrameData.viewport.right === lastFrameData.current.viewport.right &&
        currentFrameData.viewport.top === lastFrameData.current.viewport.top &&
        currentFrameData.viewport.bottom === lastFrameData.current.viewport.bottom &&
        currentFrameData.showAllConnections === lastFrameData.current.showAllConnections &&
        currentFrameData.connectionMode === lastFrameData.current.connectionMode && // Add connectionMode check
        previousCalculation.current.visibleNodes.length > 0 &&
        previousCalculation.current.visibleConnections.length > 0) {
      memoEffectiveness.track(true);
      performanceMarks.end('visibleElements');
      return previousCalculation.current;
    }

    memoEffectiveness.track(false);
    lastCalculationTime.current = startTime;
    lastFrameData.current = currentFrameData;

    // --- Phase 1: Determine baseVisibleNodeIds (common start for mobile/desktop) ---
    const baseVisibleNodeIds = new Set<string>();

    const addRequiredNodeToSet = (nodeId: string | null | undefined, targetSet: Set<string>) => {
      if (!nodeId || targetSet.has(nodeId)) return;
      targetSet.add(nodeId);
      // Add immediate neighbors for context, but don't recurse deeply here
      const connections = getNodeConnectionIndices(nodeId);
      connections.forEach(index => {
        const link = data.links[index];
        if (link) {
          if (link.source === nodeId && !targetSet.has(link.target)) targetSet.add(link.target);
          else if (link.target === nodeId && !targetSet.has(link.source)) targetSet.add(link.source);
        }
      });
    };
    
    addRequiredNodeToSet(selectedNodeId, baseVisibleNodeIds);

    if (selectedLinkIndex !== null) {
        const selectedLink = data.links[selectedLinkIndex];
        if (selectedLink) {
            if (!baseVisibleNodeIds.has(selectedLink.source)) baseVisibleNodeIds.add(selectedLink.source);
            if (!baseVisibleNodeIds.has(selectedLink.target)) baseVisibleNodeIds.add(selectedLink.target);
        }
    }

    highlightedAncestors.forEach(nodeId => addRequiredNodeToSet(nodeId, baseVisibleNodeIds));
    highlightedDescendants.forEach(nodeId => addRequiredNodeToSet(nodeId, baseVisibleNodeIds));

    if (filteredNodeIds.size > 0) {
      data.nodes.forEach(node => {
        if (filteredNodeIds.has(node.id) && isNodeInViewport(node)) {
          if (!baseVisibleNodeIds.has(node.id)) baseVisibleNodeIds.add(node.id);
        }
      });
    }

    data.nodes.forEach(node => {
      if (isNodeInViewport(node)) {
        if (!baseVisibleNodeIds.has(node.id)) baseVisibleNodeIds.add(node.id);
      }
    });

    const extendedNodeViewport = {
      left: stableViewport.left - CACHE_VIEWPORT_BUFFER_FOR_NODES,
      right: stableViewport.right + CACHE_VIEWPORT_BUFFER_FOR_NODES,
      top: stableViewport.top - CACHE_VIEWPORT_BUFFER_FOR_NODES,
      bottom: stableViewport.bottom + CACHE_VIEWPORT_BUFFER_FOR_NODES
    };
    cachedNodeIds.forEach(nodeId => {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node && node.x !== undefined && node.y !== undefined &&
            node.x >= extendedNodeViewport.left && node.x <= extendedNodeViewport.right &&
            node.y >= extendedNodeViewport.top && node.y <= extendedNodeViewport.bottom) {
            if (!baseVisibleNodeIds.has(node.id)) baseVisibleNodeIds.add(node.id);
        }
    });

    const finalVisibleNodeIds = new Set<string>(baseVisibleNodeIds);
    let nodeVisibleConnections = 0;
    let stickyVisibleConnections = 0;
    let invisibleViewportConnections = 0;

    const currentFrameDrivenConnectionIndices = new Set<number>();
    const previousVisibleConnections = new Set(previousCalculation.current.visibleConnections.map(link => 
      data.links.findIndex(l => l.source === link.source && l.target === link.target && l.type === link.type)
    ).filter(index => index !== -1));

    if (connectionMode === 'all') {
      // Show all connections in viewport
      data.links.forEach((link, index) => {
        if (isConnectionInViewport(link, index)) {
          currentFrameDrivenConnectionIndices.add(index);
          nodeVisibleConnections++;
        }
      });
    } else if (connectionMode === 'minimal') {
      // Show connections only when:
      // 1. They're selected
      // 2. They're attached to a selected node
      // 3. They're part of the subgraph being filtered (ancestors/descendants)
      // 4. They're between filtered nodes (when filters are active)
      data.links.forEach((link, index) => {
        const isSelected = selectedLinkKey === getLinkKey(link);
        const isAttachedToSelected = selectedNodeId && (link.source === selectedNodeId || link.target === selectedNodeId);
        const isInFilteredSubgraph = (highlightedAncestors.has(link.source) || highlightedAncestors.has(link.target) ||
                                    highlightedDescendants.has(link.source) || highlightedDescendants.has(link.target));
        const touchesFilteredNode = filteredNodeIds.size > 0 && 
                                  (filteredNodeIds.has(link.source) || filteredNodeIds.has(link.target));
        
        if (isSelected || isAttachedToSelected || isInFilteredSubgraph || touchesFilteredNode) {
          currentFrameDrivenConnectionIndices.add(index);
          nodeVisibleConnections++;
        }
      });
    } else {
      // Use the optimized visibility logic
      // First pass: Find connections where either node is visible
      data.links.forEach((link, index) => {
          if (finalVisibleNodeIds.has(link.source) || finalVisibleNodeIds.has(link.target)) {
              currentFrameDrivenConnectionIndices.add(index);
              nodeVisibleConnections++;
          }
      });

      // Second pass: Find connections that were previously visible and are still in viewport
      previousVisibleConnections.forEach(index => {
          if (!currentFrameDrivenConnectionIndices.has(index)) {
              const link = data.links[index];
              if (link && isConnectionInViewport(link, index)) {
                  currentFrameDrivenConnectionIndices.add(index);
                  stickyVisibleConnections++;
              }
          }
      });

      // Third pass: Count invisible connections in viewport
      data.links.forEach((link, index) => {
          if (!currentFrameDrivenConnectionIndices.has(index) && isConnectionInViewport(link, index)) {
              invisibleViewportConnections++;
          }
      });
    }
    
    const newVisibleNodes = data.nodes.filter(node => finalVisibleNodeIds.has(node.id));
    const newVisibleConnections = data.links.filter((_, index) => currentFrameDrivenConnectionIndices.has(index));
    
    performanceMarks.end('visibleElements');

    const result = {
      visibleNodes: newVisibleNodes,
      visibleConnections: newVisibleConnections,
      nodeVisibleConnections,
      stickyVisibleConnections,
      invisibleViewportConnections
    };
    previousCalculation.current = result;

    return result;
  }, [
    data.nodes, data.links, selectedNodeId, selectedLinkIndex, deferredViewportState,
    isNodeInViewport, isConnectionInViewport, cachedNodeIds, getNodeConnectionIndices,
    stableHighlightedAncestorsString, stableHighlightedDescendantsString,
    stableFilteredNodeIdsString, filters, connectionMode // Add showAllConnections and connectionMode to dependencies
  ]);

  // Add effect to log general performance metrics
  useEffect(() => {
    const logInterval = setInterval(() => {
      logPerformance('general_metrics', {
        totalNodes: data.nodes.length,
        totalConnections: data.links.length,
        cachedNodes: cachedNodeIds.size,
        cachedConnections: cachedConnectionIndices.size,
        memoEffectiveness: {
          hits: memoEffectiveness.hits,
          misses: memoEffectiveness.misses,
          rate: memoEffectiveness.hits / (memoEffectiveness.hits + memoEffectiveness.misses)
        }
      });
    }, 10000); // Log every 10 seconds

    return () => clearInterval(logInterval);
  }, [data.nodes.length, data.links.length, cachedNodeIds.size, cachedConnectionIndices.size]);

  // Add cleanup for caches when data changes
  useEffect(() => {
    connectionLookupCache.current.clear();
    nodeConnectionCache.current.clear();
    lastFrameData.current = null;
  }, [data.links]);

  // Destructure the memoized values
  const {
    visibleNodes,
    visibleConnections,
    nodeVisibleConnections,
    stickyVisibleConnections,
    invisibleViewportConnections
  } = visibleElements;

  // Remove the old memos
  // const visibleNodes = useMemo(...)
  // const visibleConnections = useMemo(...)

  // Add an effect to reset performance counters periodically
  useEffect(() => {
    const interval = setInterval(() => {
      memoRecalculationCount.current = { nodes: 0, connections: 0 };
      const timestamp = new Date().toLocaleTimeString();
    }, 5000); // Reset every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Add viewport change detection for cache management
  const lastViewportForCacheRef = useRef<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null>(null);
  const VIEWPORT_CHANGE_THRESHOLD = 100; // Only update cache if viewport changed by more than 100px

  const hasViewportSignificantlyChanged = (newViewport: typeof visibleViewport): boolean => {
    if (!lastViewportForCacheRef.current) return true;
    
    const old = lastViewportForCacheRef.current;
    return Math.abs(newViewport.left - old.left) > VIEWPORT_CHANGE_THRESHOLD ||
           Math.abs(newViewport.right - old.right) > VIEWPORT_CHANGE_THRESHOLD ||
           Math.abs(newViewport.top - old.top) > VIEWPORT_CHANGE_THRESHOLD ||
           Math.abs(newViewport.bottom - old.bottom) > VIEWPORT_CHANGE_THRESHOLD;
  };

  // Add effect to manage the cache of nodes and connections
  useEffect(() => {
    // Skip if viewport hasn't significantly changed
    if (!hasViewportSignificantlyChanged(visibleViewport)) {
      return;
    }

    const CACHE_VIEWPORT_BUFFER = 2000; // Larger buffer for cache than for visibility
    const extendedViewport = {
      left: visibleViewport.left - CACHE_VIEWPORT_BUFFER,
      right: visibleViewport.right + CACHE_VIEWPORT_BUFFER,
      top: visibleViewport.top - CACHE_VIEWPORT_BUFFER,
      bottom: visibleViewport.bottom + CACHE_VIEWPORT_BUFFER
    };
    
    // Update the last viewport reference
    lastViewportForCacheRef.current = { ...visibleViewport };
    
    // Get nodes that should be cached
    const nodesToCache = new Set<string>();
    const connectionsToCache = new Set<number>();
    
    // Add nodes in extended viewport
    data.nodes.forEach(node => {
      if (node.x !== undefined && 
          node.y !== undefined &&
          node.x >= extendedViewport.left &&
          node.x <= extendedViewport.right &&
          node.y >= extendedViewport.top &&
          node.y <= extendedViewport.bottom) {
        nodesToCache.add(node.id);
        
        // Add connections for this node
        const nodeConnections = getNodeConnectionIndices(node.id);
        nodeConnections.forEach(index => {
          const link = data.links[index];
          const otherNodeId = link.source === node.id ? link.target : link.source;
          const otherNode = data.nodes.find(n => n.id === otherNodeId);
          
          // Cache connection if other node is also in extended viewport
          if (otherNode?.x !== undefined && 
              otherNode?.y !== undefined &&
              otherNode.x >= extendedViewport.left &&
              otherNode.x <= extendedViewport.right &&
              otherNode.y >= extendedViewport.top &&
              otherNode.y <= extendedViewport.bottom) {
            connectionsToCache.add(index);
          }
        });
      }
    });
    
    // Add selected node, its connections, and connected nodes
    if (selectedNodeId) {
      nodesToCache.add(selectedNodeId);
      const connections = getNodeConnectionIndices(selectedNodeId);
      connections.forEach(index => {
        const link = data.links[index];
        connectionsToCache.add(index);
        nodesToCache.add(link.source);
        nodesToCache.add(link.target);
      });
    }
    
    // Add highlighted nodes and their connections
    const addHighlightedNode = (nodeId: string) => {
      nodesToCache.add(nodeId);
      const connections = getNodeConnectionIndices(nodeId);
      connections.forEach(index => {
        const link = data.links[index];
        connectionsToCache.add(index);
        nodesToCache.add(link.source);
        nodesToCache.add(link.target);
      });
    };
    
    highlightedAncestors.forEach(addHighlightedNode);
    highlightedDescendants.forEach(addHighlightedNode);
    
    // Check if we need to update the cache
    const hasNodeChanges = cachedNodeIds.size !== nodesToCache.size || 
      Array.from(nodesToCache).some(id => !cachedNodeIds.has(id));
    const hasConnectionChanges = cachedConnectionIndices.size !== connectionsToCache.size ||
      Array.from(connectionsToCache).some(index => !cachedConnectionIndices.has(index));
    
    // Only update if there are actual changes
    if (hasNodeChanges || hasConnectionChanges) {
      // Batch the updates together
      requestAnimationFrame(() => {
        if (hasNodeChanges) {
          setCachedNodeIds(new Set(nodesToCache));
        }
        if (hasConnectionChanges) {
          setCachedConnectionIndices(new Set(connectionsToCache));
        }
      });
    }
  }, [
    visibleViewport,
    data.nodes,
    data.links,
    cachedNodeIds,
    cachedConnectionIndices,
    selectedNodeId,
    getNodeConnectionIndices,
    highlightedAncestors,
    highlightedDescendants
  ]);

  // Add an effect to prefetch visible nodes when the viewport changes


  // Add prefetch viewport tracking
const lastPrefetchViewportRef = useRef<{
  left: number;
  right: number;
  top: number;
  bottom: number;
} | null>(null);
const PREFETCH_VIEWPORT_THRESHOLD = 200; // Only prefetch if viewport changed by more than 200px

const hasPrefetchViewportSignificantlyChanged = (newViewport: typeof visibleViewport): boolean => {
  if (!lastPrefetchViewportRef.current) return true;
  
  const old = lastPrefetchViewportRef.current;
  return Math.abs(newViewport.left - old.left) > PREFETCH_VIEWPORT_THRESHOLD ||
         Math.abs(newViewport.right - old.right) > PREFETCH_VIEWPORT_THRESHOLD ||
         Math.abs(newViewport.top - old.top) > PREFETCH_VIEWPORT_THRESHOLD ||
         Math.abs(newViewport.bottom - old.bottom) > PREFETCH_VIEWPORT_THRESHOLD;
};

// Modify the prefetch effect to use the same viewport as the main viewport
useEffect(() => {
  if (!data.nodes.length) return;

  // Skip if viewport hasn't significantly changed
  if (!hasPrefetchViewportSignificantlyChanged(visibleViewport)) {
    return;
  }

  // Update the last prefetch viewport reference
  lastPrefetchViewportRef.current = { ...visibleViewport };

  // Get nodes that are currently in the viewport
  const visibleNodeIdsInEffect = data.nodes
    .filter((node: TechNode) => isNodeInViewport(node))
    .map((node: TechNode) => node.id);

  // Only prefetch if we're showing images
  if (showImages) {
    // Prefetch these nodes (with normal priority)
    let count = 0;
    for (const nodeId of visibleNodeIdsInEffect) {
      prefetchNode(nodeId);
      count++;
    }
  }
}, [data.nodes, isNodeInViewport, prefetchNode, visibleViewport, showImages]);

  // Add an effect to manage the cache of connections
  useEffect(() => {
    // Get the indices of all currently visible connections
    const currentlyVisibleConnectionIndices = new Set(
      data.links
        .map((link, index) => isConnectionInViewport(link, index) ? index : -1)
        .filter(index => index !== -1)
    );
    
    // Add newly visible connections to the cache
    const newCachedConnectionIndices = new Set(cachedConnectionIndices);
    currentlyVisibleConnectionIndices.forEach(index => {
      newCachedConnectionIndices.add(index);
      
      // Clear any existing timeout for this connection
      if (cachedConnectionsTimeoutRef.current[index]) {
        clearTimeout(cachedConnectionsTimeoutRef.current[index]);
        delete cachedConnectionsTimeoutRef.current[index];
      }
    });
    
    // Set timeouts for connections that are no longer visible
    cachedConnectionIndices.forEach(index => {
      if (!currentlyVisibleConnectionIndices.has(index) && !cachedConnectionsTimeoutRef.current[index]) {
        // Set a timeout to remove this connection from the cache after CACHE_DURATION
        cachedConnectionsTimeoutRef.current[index] = setTimeout(() => {
          setCachedConnectionIndices(prev => {
            const updated = new Set(prev);
            updated.delete(index);
            return updated;
          });
          delete cachedConnectionsTimeoutRef.current[index];
        }, CACHE_DURATION);
      }
    });
    
    // Update the cache if it changed
    if (newCachedConnectionIndices.size !== cachedConnectionIndices.size) {
      setCachedConnectionIndices(newCachedConnectionIndices);
    }
    
    // Cleanup timeouts on unmount
    return () => {
      Object.values(cachedConnectionsTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [visibleViewport, data.links, cachedConnectionIndices, isConnectionInViewport]);

  // Effect to manage wheel events on search and filter boxes
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const targetElement = e.target as HTMLElement;
      const isScrollingList = targetElement.closest('.scrollable-results-list');


      if (!isScrollingList) {
        e.preventDefault(); 
      } else {
      }
    };

    const handleContainerTouchMove = (e: TouchEvent) => {
      const targetElement = e.target as HTMLElement;
      const isTouchingScrollableList = targetElement.closest('.scrollable-results-list');


      if (!isTouchingScrollableList) {
        e.preventDefault();
      } else {
      }
    };

    const searchBoxEl = searchBoxContainerRef.current;
    const filterBoxEl = filterBoxContainerRef.current;


    if (isClient && !isLoading) {
      if (searchBoxEl) {
        searchBoxEl.addEventListener('wheel', handleWheel, { passive: false });
        searchBoxEl.addEventListener('touchmove', handleContainerTouchMove, { passive: false });
      }
      if (filterBoxEl) {
        filterBoxEl.addEventListener('wheel', handleWheel, { passive: false });
        filterBoxEl.addEventListener('touchmove', handleContainerTouchMove, { passive: false });
      }
    }

    return () => {
      if (searchBoxEl) {
        searchBoxEl.removeEventListener('wheel', handleWheel);
        searchBoxEl.removeEventListener('touchmove', handleContainerTouchMove);
      }
      if (filterBoxEl) {
        filterBoxEl.removeEventListener('wheel', handleWheel);
        filterBoxEl.removeEventListener('touchmove', handleContainerTouchMove);
      }
    };
  }, [isClient, isLoading]); // Updated dependency array

  // Effect to disable scrolling on the jump button
  useEffect(() => {
    const jumpButtonElement = jumpButtonRef.current;

    const preventScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault();
    };

    if (jumpButtonElement) {
      jumpButtonElement.addEventListener('wheel', preventScroll, { passive: false });
      jumpButtonElement.addEventListener('touchmove', preventScroll, { passive: false });
    }

    // Cleanup function
    return () => {
      if (jumpButtonElement) {
        jumpButtonElement.removeEventListener('wheel', preventScroll);
        jumpButtonElement.removeEventListener('touchmove', preventScroll);
      }
    };
  }, [isLoading, visibleNodes.length, data.nodes.length]); // Rerun when button visibility might change

  // Function to handle node hover for prefetching
  const handleNodeHoverForPrefetch = useCallback((title: string) => {
    // Find the node by title
    const node = data.nodes.find(n => n.title === title);
    if (node) {
      // Prefetch the node data
      prefetchNode(node.id);
    }
  }, [data.nodes, prefetchNode]);

  // Add loading state UI
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
  if (!isClient) {
    return null;
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
                <div 
                  ref={searchBoxContainerRef}
                  className="bg-transparent md:bg-white/80 md:backdrop-blur md:border md:border-black md:rounded-none md:shadow-md md:p-4 relative z-30"
                  style={{ overscrollBehavior: 'contain' }} // Removed overflow: 'hidden'
                >
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
                <div 
                  ref={filterBoxContainerRef}
                  className="bg-transparent md:bg-white/80 md:backdrop-blur md:border md:border-black md:rounded-none md:shadow-md md:p-4 relative z-20"
                  style={{ overscrollBehavior: 'contain' }} // Removed overflow: 'hidden'
                >
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
        className="overflow-x-auto overflow-y-auto h-screen bg-yellow-50"
        style={{ 
          overscrollBehavior: "none",
          touchAction: "pan-x pan-y pinch-zoom",
          WebkitOverflowScrolling: "touch",
          WebkitTapHighlightColor: "transparent",
          scrollbarWidth: "thin",   // Show thin scrollbar in Firefox
          scrollbarColor: "#91B4C5 #fefce8", // Thumb and track colors
          position: 'relative',
          zIndex: 20 // Higher than minimap's z-index of 10
        }}
        onMouseDown={handleMouseDown}
        onScroll={throttle((e) => {
          const horizontalScroll = e.currentTarget.scrollLeft;
          const verticalScroll = e.currentTarget.scrollTop;
          setScrollPosition({
            left: horizontalScroll,
            top: verticalScroll,
          });
        }, 100)} // Throttle to max once every 100ms
      >
        <div 
          style={{
            width: containerWidth,
            minHeight: '100vh',
            willChange: 'transform',
            backfaceVisibility: 'hidden'
          }}
        >
          {/* Timeline - Render this immediately */}
          <div
            className="h-12 bg-yellow-50 border-b timeline flex-shrink-0"
            style={{
              width: '100%',
              zIndex: 100,
              position: "sticky",
              top: 0,
              minHeight: isMobile ? "48px" : undefined,
              maxHeight: isMobile ? "48px" : undefined,
              overflow: isMobile ? "hidden" : undefined,
              touchAction: "none"
            }}
          >
            {/* Timeline content - Use fixed years */}
            {(() => {
              // Use fixed years for immediate rendering
              const timelineYears = getTimelineYears(TIMELINE_MIN_YEAR, TIMELINE_MAX_YEAR);

              return (
                <div className="relative" style={{ width: '100%', height: '100%' }}>
                  {timelineYears.map((year) => {
                    return (
                      <div
                        key={year}
                        className="absolute text-sm text-gray-600 font-mono whitespace-nowrap"
                        style={{
                          // Use direct calculation with fixed minYear
                          left: `${calculateXPosition(year, TIMELINE_MIN_YEAR, PADDING, YEAR_WIDTH)}px`,
                          transform: "translateX(-50%)",
                          top: isMobile ? '16px' : '16px',
                          textDecorationLine: 'none',
                          WebkitTextDecorationLine: 'none',
                          textDecoration: 'none',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          WebkitTouchCallout: 'none',
                        }}
                      >
                        {/* Use original formatYear call */}
                        <span style={{ pointerEvents: 'none' }}>{formatYear(year)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Main content */}
          <div
            style={{
              width: '100%',
              height: `${totalHeight}px`,
              position: "relative",
              marginBottom: "64px",
              willChange: 'transform',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Add IntroBox here instead */}
            <IntroBox />

            {/* SVG connections */}
            <svg
              ref={connectionsContainerRef}
              className="absolute inset-0 w-full h-full"
              style={{
                zIndex: 1,
              }}
            >
              {visibleConnections.map((link, visibleIndex) => {
                const sourceNode = data.nodes.find(
                  (n) => n.id === link.source
                );
                const targetNode = data.nodes.find(
                  (n) => n.id === link.target
                );

                if (!sourceNode || !targetNode) return null;
                
                // Generate a unique key using both the link IDs and the visible index
                const connectionKey = `connection-${link.source}-${link.target}-${visibleIndex}`;
                
                return (
                  <CurvedConnections
                    key={connectionKey}
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
                    isHighlighted={shouldHighlightLink(link, visibleIndex)}
                    opacity={getLinkOpacity(link, visibleIndex)}
                    onMouseEnter={() => {
                      setHoveredLinkIndex(visibleIndex);
                    }}
                    onMouseLeave={() => setHoveredLinkIndex(null)}
                    sourceTitle={sourceNode.title}
                    targetTitle={targetNode.title}
                    details={link.details}
                    isSelected={selectedLinkKey === getLinkKey(link)}
                    onSelect={() => {
                      setSelectedLinkKey(getLinkKey(link));
                      setSelectedLinkIndex(visibleIndex);
                      setSelectedNodeId(null);
                    }}
                    onNodeClick={(title) => {
                      handleNodeClick(title);
                    }}
                    onNodeHover={(title) => {
                      handleNodeHoverForPrefetch(title);
                    }}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            <div ref={nodesContainerRef} className="relative" style={{ zIndex: 10 }}>
              {visibleNodes.map((node) => {
                const details = prefetchedNodeDetails.current.get(node.id);
                // Create a new node object that merges base node data with any prefetched details
                const displayNode = { ...node, ...(details || {}) };

                return (
                  <BrutalistNode
                    key={node.id} // key should still be from the original stable node id
                    node={displayNode} // Pass the merged node data
                    isSelected={node.id === selectedNodeId}
                    isAdjacent={isAdjacentToSelected(node.id)}
                    onClick={() => handleNodeClick(node.title)} // Use the centralized handler
                    onMouseEnter={() => {
                      if (node.id !== selectedNodeId) {
                        handleNodeHover(node);
                      }
                    }}
                    onMouseLeave={() => {
                      // On mobile, don't clear hover state on mouse leave
                      if (!isMobile && node.id !== selectedNodeId) {
                        setHoveredNode(null);
                        setHoveredNodeId(null);
                      }
                    }}
                    width={NODE_WIDTH}
                    style={{
                      position: "absolute",
                      left: `${getXPosition(node.year)}px`,
                      top: `${node.y}px`,
                      opacity: getNodeOpacity(node),
                      transition: "opacity 0.2s ease-in-out",
                    }}
                    showImages={showImages}
                  />
                );
              })}
            </div>

            {/* Tooltips */}
            <div className="relative" style={{ zIndex: 100 }}>
              {visibleNodes.map((baseLoopNode) => { // Renamed to avoid conflict with 'node' below
                  // Get the selected or hovered node ID
                  const targetNodeId = selectedNodeId || hoveredNode?.id;

                  // Only render tooltip if this node is the selected/hovered one
                  if (targetNodeId !== baseLoopNode.id) return null;

                  // Merge base node data with prefetched details for the tooltip
                  const prefetchedDetails = prefetchedNodeDetails.current.get(baseLoopNode.id);
                  // This 'node' is the one used throughout the tooltip content
                  const node = { ...baseLoopNode, ...(prefetchedDetails || {}) }; 

                  // The original condition for rendering the tooltip, using the merged 'node'
                  // but checking against the original hoveredNode.id or selectedNodeId for triggering
                  if (hoveredNode?.id === baseLoopNode.id || selectedNodeId === baseLoopNode.id) {
                    return (
                      <div
                        key={`tooltip-${node.id}`} // key uses merged node id, or baseLoopNode.id for stability
                        className="absolute bg-white border border-black rounded-none p-3 shadow-md node-tooltip"
                        style={{
                          left: `${getXPosition(node.year)}px`,
                          top: `${(node.y ?? 0) + (showImages ? 100 : 25)}px`,
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
                          {/* Use original formatYear call */}
                          <strong>Date:</strong> {formatYear(node.year)}
                          {node.dateDetails && ` – ${node.dateDetails}`}
                        </p>
                        {node.inventors &&
                          node.inventors.length > 0 &&
                          node.inventors.filter((inv: string) => inv !== "unknown")
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
                                      .filter((inv: string) => inv !== "unknown")
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
                          const { ancestors, children, replaced, replacedBy, independentlyInvented, concurrentDevelopment } = getNodeConnections(
                            node.id
                          );
                          return (
                            <>
                              {ancestors.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Built upon:</strong>
                                  <div className="ml-2">
                                    {ancestors.map((item, index: number) => {
                                      const ancestor = item.node;
                                      const link = item.link;
                                      // Only show (possibly) for speculative connections
                                      const suffix = link?.type === "Speculative" ? " (possibly)" : "";
                                      
                                      return (
                                        <div
                                          key={`ancestor-${node.id}-${ancestor.id}-${index}`}
                                          className="grid grid-cols-[auto_1fr_auto] items-start gap-1"
                                        >
                                          <span className="flex-shrink-0">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(ancestor.title, true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {ancestor.title}{suffix}
                                          </button>
                                          {link.details && (
                                            link.detailsSource ? (
                                              <a
                                                href={link.detailsSource}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-gray-700 cursor-help"
                                                title={`${link.details} (click for source)`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Info className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span
                                                className="text-gray-500 cursor-help"
                                                title={link.details}
                                              >
                                                <Info className="h-3 w-3" />
                                              </span>
                                            )
                                          )}
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
                                    {children.map((item, index: number) => {
                                      const child = item.node;
                                      const link = item.link;
                                      // Only show (possibly) for speculative connections
                                      const suffix = link?.type === "Speculative" ? " (possibly)" : "";
                                      
                                      return (
                                        <div
                                          key={`child-${node.id}-${child.id}-${index}`}
                                          className="grid grid-cols-[auto_1fr_auto] items-start gap-1"
                                        >
                                          <span className="flex-shrink-0">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(child.title, true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {child.title}{suffix}
                                          </button>
                                          {link.details && (
                                            link.detailsSource ? (
                                              <a
                                                href={link.detailsSource}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-gray-700 cursor-help"
                                                title={`${link.details} (click for source)`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Info className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span
                                                className="text-gray-500 cursor-help"
                                                title={link.details}
                                              >
                                                <Info className="h-3 w-3" />
                                              </span>
                                            )
                                          )}
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
                                    {replaced.map((item, index: number) => {
                                      const replacedNode = item.node;
                                      const link = item.link;
                                      
                                      return (
                                        <div
                                          key={`replaced-${node.id}-${replacedNode.id}-${index}`}
                                          className="grid grid-cols-[auto_1fr_auto] items-start gap-1"
                                        >
                                          <span className="flex-shrink-0">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(replacedNode.title, true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {replacedNode.title}
                                          </button>
                                          {link.details && (
                                            link.detailsSource ? (
                                              <a
                                                href={link.detailsSource}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-gray-700 cursor-help"
                                                title={`${link.details} (click for source)`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Info className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span
                                                className="text-gray-500 cursor-help"
                                                title={link.details}
                                              >
                                                <Info className="h-3 w-3" />
                                              </span>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {independentlyInvented.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Independently invented from:</strong>
                                  <div className="ml-2">
                                    {independentlyInvented.map((item, index: number) => {
                                      const connectedNode = item.node;
                                      const link = item.link;
                                      
                                      return (
                                        <div
                                          key={`independent-${connectedNode.id}-${index}`}
                                          className="grid grid-cols-[auto_1fr_auto] items-start gap-1"
                                        >
                                          <span className="flex-shrink-0">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(connectedNode.title, true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {connectedNode.title}
                                          </button>
                                          {link.details && (
                                            link.detailsSource ? (
                                              <a
                                                href={link.detailsSource}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-gray-700 cursor-help"
                                                title={`${link.details} (click for source)`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Info className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span
                                                className="text-gray-500 cursor-help"
                                                title={link.details}
                                              >
                                                <Info className="h-3 w-3" />
                                              </span>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {concurrentDevelopment.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Developed concurrently with:</strong>
                                  <div className="ml-2">
                                    {concurrentDevelopment.map((item, index: number) => {
                                      const connectedNode = item.node;
                                      const link = item.link;
                                      
                                      return (
                                        <div
                                          key={`concurrent-${connectedNode.id}-${index}`}
                                          className="grid grid-cols-[auto_1fr_auto] items-start gap-1"
                                        >
                                          <span className="flex-shrink-0">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(connectedNode.title, true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {connectedNode.title}
                                          </button>
                                          {link.details && (
                                            link.detailsSource ? (
                                              <a
                                                href={link.detailsSource}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-gray-700 cursor-help"
                                                title={`${link.details} (click for source)`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Info className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span
                                                className="text-gray-500 cursor-help"
                                                title={link.details}
                                              >
                                                <Info className="h-3 w-3" />
                                              </span>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {replacedBy.length > 0 && (
                                <div className="text-xs mb-1">
                                  <strong>Replaced by:</strong>
                                  <div className="ml-2">
                                    {replacedBy.map((item, index: number) => {
                                      const replacedByNode = item.node;
                                      const link = item.link;
                                      
                                      return (
                                        <div
                                          key={`replacedBy-${node.id}-${replacedByNode.id}-${index}`}
                                          className="grid grid-cols-[auto_1fr_auto] items-start gap-1"
                                        >
                                          <span className="flex-shrink-0">•</span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleNodeClick(replacedByNode.title, true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer break-words text-left"
                                            type="button"
                                          >
                                            {replacedByNode.title}
                                          </button>
                                          {link.details && (
                                            link.detailsSource ? (
                                              <a
                                                href={link.detailsSource}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-gray-700 cursor-help"
                                                title={`${link.details} (click for source)`}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <Info className="h-3 w-3" />
                                              </a>
                                            ) : (
                                              <span
                                                className="text-gray-500 cursor-help"
                                                title={link.details}
                                              >
                                                <Info className="h-3 w-3" />
                                              </span>
                                            )
                                          )}
                                        </div>
                                      );
                                    })}
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

                          // Only show ancestry controls if not on mobile
                          if (isMobile) {
                            return node.wikipedia && (
                              <div className="text-xs mt-2">
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
                              </div>
                            );
                          }

                          // Check if the node has any potential ancestors or descendants without calculating them
                          const hasAncestors = data.links.some(
                            link => link.target === nodeId && 
                            !["Independently invented", "Concurrent development"].includes(link.type)
                          );
                          const hasDescendants = data.links.some(
                            link => link.source === nodeId && 
                            !["Independently invented", "Concurrent development"].includes(link.type)
                          );

                          return (
                            <div className="text-xs mt-2">
                              {/* Show ancestry controls if there are potential ancestors or descendants */}
                              {(hasAncestors || hasDescendants) && (
                                <div className="mb-1">
                                  {hasAncestors && hasDescendants ? (
                                    <>
                                      Highlight all{" "}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Calculate ancestors only when clicked
                                          const ancestors = getAllAncestors(nodeId);
                                          ancestors.delete(nodeId);
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
                                          // Calculate descendants only when clicked
                                          const descendants = getAllDescendants(nodeId);
                                          descendants.delete(nodeId);
                                          // First ensure the node is selected
                                          if (!selectedNodeId) {
                                            setSelectedNodeId(nodeId);
                                          }
                                          setHighlightedDescendants(descendants);
                                          setHighlightedAncestors(new Set());
                                        }}
                                        className="text-blue-600 hover:underline cursor-pointer"
                                      >
                                        descendants
                                      </button>
                                    </>
                                  ) : hasAncestors ? (
                                    <>
                                      Highlight all{" "}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Calculate ancestors only when clicked
                                          const ancestors = getAllAncestors(nodeId);
                                          ancestors.delete(nodeId);
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
                                          // Calculate descendants only when clicked
                                          const descendants = getAllDescendants(nodeId);
                                          descendants.delete(nodeId);
                                          // First ensure the node is selected
                                          if (!selectedNodeId) {
                                            setSelectedNodeId(nodeId);
                                          }
                                          setHighlightedDescendants(descendants);
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
                    );
                  }
                  return null; // Ensure a value is returned if the condition isn't met
                }
              )}
            </div>
          </div>
        </div>
        {/* Minimap - Conditionally render based on data? Or leave as is? */}
        {data.nodes.length > 0 && (
          <div 
            className="fixed left-0 right-0 z-10 h-16 bg-yellow-50"
            style={{
              bottom: '0px',
              position: 'fixed',
              width: '100%'
            }}
          >
            <TechTreeMinimap
              nodes={data.nodes.map(
                (node): TechTreeMinimapNode => ({
                  id: node.id,
                  x: getXPosition(node.year),
                  y: node.y || 0,
                  year: node.year,
                })
              )}
              containerWidth={containerWidth}
              parentContainerWidth={containerDimensions.width} // Pass the viewer's width
              totalHeight={totalHeight}
              viewportWidth={containerDimensions.width}
              viewportHeight={containerDimensions.height}
              scrollLeft={scrollPosition.left}
              scrollTop={scrollPosition.top}
              onViewportChange={handleViewportChange}
              filteredNodeIds={filteredNodeIds}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              selectedConnectionNodeIds={selectedConnectionNodeIds}
              adjacentNodeIds={adjacentNodeIds}
              highlightedAncestors={highlightedAncestors}
              highlightedDescendants={highlightedDescendants}
            />
          </div>
        )}
      </div>
      {/* Only render debug overlay in development mode */}
      {process.env.NODE_ENV === 'development' && showDebugOverlay && (
        <DebugOverlay
          viewport={visibleViewport}
          scrollPosition={scrollPosition}
          totalNodes={data.nodes.length}
          visibleNodes={visibleElements.visibleNodes.length}
          strictlyVisibleNodes={strictlyVisibleNodes.length}
          totalConnections={data.links.length}
          visibleConnections={visibleElements.visibleConnections.length}
          nodeVisibleConnections={visibleElements.nodeVisibleConnections}
          stickyVisibleConnections={visibleElements.stickyVisibleConnections}
          invisibleViewportConnections={visibleElements.invisibleViewportConnections}
          onClose={() => setShowDebugOverlay(false)}
        />
      )}
      {/* Jump to Nearest Tech Button - Update the condition */}
      {!isLoading && strictlyVisibleNodes.length === 0 && data.nodes.length > 0 && (
        <button
          ref={jumpButtonRef}
          onClick={handleJumpToNearest}
          className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-20 px-4 py-2 bg-transparent rounded text-sm transition-colors duration-150"
          style={{
             color: '#91B4C5',
             borderColor: 'transparent',
             borderWidth: '0px',
             backdropFilter: 'blur(2px)', 
          }}
        >
          Jump to nearest tech
        </button>
      )}
      {/* Settings Button and Menu */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          className="settings-button p-2 text-[#91B4C5] hover:text-[#6B98AE] transition-colors"
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          style={{ overscrollBehavior: 'contain' }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

        {showSettingsMenu && (
          <div 
            ref={settingsMenuRef}
            className="absolute bottom-full right-0 mb-2 bg-white/80 backdrop-blur border border-[#91B4C5] p-4 min-w-[200px] font-mono"
          >
            <div className="space-y-6">
              {/* Connections Mode */}
              <div>
                <div className="text-xs uppercase tracking-wider text-[#91B4C5] mb-3">Display options</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connections</span>
                  <div className="flex border border-[#91B4C5] ml-4">
                    <button
                      className={`px-2 py-1 text-xs transition-colors ${
                        connectionMode === 'all' 
                          ? 'bg-[#91B4C5] text-white' 
                          : 'bg-transparent text-[#91B4C5] hover:bg-[#91B4C5]/10'
                      }`}
                      onClick={() => setConnectionMode('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-2 py-1 text-xs transition-colors border-l border-r border-[#91B4C5] ${
                        connectionMode === 'optimized' 
                          ? 'bg-[#91B4C5] text-white' 
                          : 'bg-transparent text-[#91B4C5] hover:bg-[#91B4C5]/10'
                      }`}
                      onClick={() => setConnectionMode('optimized')}
                    >
                      Optimized
                    </button>
                    <button
                      className={`px-2 py-1 text-xs transition-colors ${
                        connectionMode === 'minimal' 
                          ? 'bg-[#91B4C5] text-white' 
                          : 'bg-transparent text-[#91B4C5] hover:bg-[#91B4C5]/10'
                      }`}
                      onClick={() => setConnectionMode('minimal')}
                    >
                      Minimal
                    </button>
                  </div>
                </div>
              </div>

              {/* Images Toggle */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Images</span>
                  <div className="flex items-center space-x-3 ml-4">
                    <span className="text-xs text-[#91B4C5]">Hide</span>
                    <button
                      className={`w-8 h-4 relative transition-colors ${
                        showImages ? 'bg-[#91B4C5]' : 'bg-[#91B4C5]/20'
                      }`}
                      onClick={() => setShowImages(!showImages)}
                    >
                      <div className={`absolute w-3 h-3 top-0.5 transition-transform ${
                        showImages ? 'left-4' : 'left-0.5'
                      } bg-white`} />
                    </button>
                    <span className="text-xs text-[#91B4C5]">Show</span>
                  </div>
                </div>
              </div>

              {/* "Go back to top left" Button */}
              <div>
                <div className="flex items-center justify-between">
                  <button
                    className="text-xs text-[#91B4C5] hover:text-[#6B98AE] transition-colors"
                    onClick={() => {
                      resetView();
                      setShowSettingsMenu(false);
                    }}
                  >
                    Go back to top left
                  </button>
                </div>
              </div>
            </div>
          </div>
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

