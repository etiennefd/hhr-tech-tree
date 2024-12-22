"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import CurvedConnections from "../components/connections/CurvedConnections";
import BrutalistNode from "../components/nodes/BrutalistNode";
import TechTreeMinimap from "../components/TechTreeMinimap";

// Timeline scale boundaries
const YEAR_INDUSTRIAL = 1700;
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
const INTERVAL_LATE_ANTIQUITY = 10;
const INTERVAL_MIDDLE_ANTIQUITY = 50;
const INTERVAL_EARLY_ANTIQUITY = 100;
const INTERVAL_NEOLITHIC = 500;
const INTERVAL_UPPER_PALEOLITHIC = 1000;
const INTERVAL_MIDDLE_PALEOLITHIC = 5000;
const INTERVAL_EARLY_PALEOLITHIC = 100000;

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

const TechTreeViewer = () => {
  // Constants
  const NODE_WIDTH = 160;
  const VERTICAL_SPACING = 50;
  const YEAR_WIDTH = 240;
  const PADDING = 120;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [data, setData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(
    null
  );
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [totalHeight, setTotalHeight] = useState(1000); // Default height
  const [isKeyScrolling, setIsKeyScrolling] = useState(false);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });

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

  const calculateNodePositions = useCallback((nodes) => {
    if (!nodes.length) return [];

    function estimateNodeHeight(node) {
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
    const positionedNodes = [];
    const yearGroups = new Map();

    // Ensure minimum distance from top of viewport
    const ABSOLUTE_MIN_Y = 150;

    // Define fixed vertical bands (pixels from top) - compressed by ~2.5x
    const VERTICAL_BANDS = {
      // Food & Agriculture (0-300)
      Food: Math.max(150, ABSOLUTE_MIN_Y),
      Agriculture: Math.max(200, ABSOLUTE_MIN_Y),
      "Animal husbandry": Math.max(250, ABSOLUTE_MIN_Y),
      "Hunting and fishing": Math.max(300, ABSOLUTE_MIN_Y),

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
      Military: 1850,
      Finance: 1900,
      Law: 1950,
      Governance: 2000,

      // Culture (2100-2400)
      Communication: 2100,
      "Visual media": 2150,
      Entertainment: 2200,
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
      const usedPositions = []; // Will store {y, height} objects
      const MIN_VERTICAL_GAP = VERTICAL_SPACING;

      nodesInYear.sort((a, b) => {
        const aPos = a.fields?.[0] ? VERTICAL_BANDS[a.fields[0]] || 1200 : 1200;
        const bPos = b.fields?.[0] ? VERTICAL_BANDS[b.fields[0]] || 1200 : 1200;
        return aPos - bPos;
      });

      nodesInYear.forEach((node) => {
        const nodeHeight = estimateNodeHeight(node);

        // Get base position from primary field, ensuring minimum Y
        const basePosition = Math.max(
          ABSOLUTE_MIN_Y,
          (node.fields?.[0] ? VERTICAL_BANDS[node.fields[0]] || 1200 : 1200) +
            (Math.random() - 0.5) * 100
        );

        const isOverlapping = (testPosition) => {
          if (testPosition < ABSOLUTE_MIN_Y) return true;

          const testBottom = testPosition + nodeHeight;

          return usedPositions.some(({ y: usedY, height: usedHeight }) => {
            const usedBottom = usedY + usedHeight;
            // Add MIN_VERTICAL_GAP to ensure spacing between nodes
            return !(
              testBottom < usedY || testPosition > usedBottom + MIN_VERTICAL_GAP
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

        // Add random offset while respecting minimum Y
        const randomOffset = (Math.random() - 0.5) * 50;
        finalPosition = Math.max(ABSOLUTE_MIN_Y, finalPosition + randomOffset);

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
      ...positionedNodes.map((node) => node.y + estimateNodeHeight(node))
    );
    setTotalHeight(maxY + 100);

    return positionedNodes;
  }, []);

  // EFFECTS

  // Fetch data
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/inventions")
      .then((res) => res.json())
      .then((fetchedData) => {
        const positionedNodes = calculateNodePositions(fetchedData.nodes);
        setData({ ...fetchedData, nodes: positionedNodes });
        setFilteredNodes(positionedNodes);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      });
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

  // Search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredNodes(data.nodes);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = data.nodes.filter(
      (node) =>
        node.title.toLowerCase().includes(searchTermLower) ||
        (node.description || "").toLowerCase().includes(searchTermLower)
    );
    setFilteredNodes(filtered);
  }, [searchTerm, data.nodes]);

  // Add handler for clicks outside nodes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".tech-node") &&
        !target.closest(".node-tooltip") &&
        !target.closest(".connection")
      ) {
        setSelectedNodeId(null);
        setSelectedLinkIndex(null);
        setHoveredNode(null);
        setHoveredNodeId(null);
        setHoveredLinkIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNodeClick = (title: string) => {
    const node = data.nodes.find((n) => n.title === title);

    // Clear states immediately to hide tooltip
    setSelectedLinkIndex(null);
    setSelectedNodeId(null);
    setHoveredLinkIndex(null);
    setHoveredNode(null);
    setHoveredNodeId(null);

    const container = document.querySelector(".overflow-y-auto") as HTMLElement;

    const scrollPosition = node.y * zoom - container.clientHeight / 2 + 150;

    Promise.all([
      new Promise<void>((resolve) => {
        if (horizontalScrollContainerRef.current) {
          const horizontalPosition =
            getXPosition(node.year) * zoom - window.innerWidth / 2;
          horizontalScrollContainerRef.current.scrollTo({
            left: horizontalPosition,
            behavior: "smooth",
          });
        }
        setTimeout(resolve, 100);
      }),
      new Promise<void>((resolve) => {
        container.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: "smooth",
        });
        setTimeout(resolve, 100);
      }),
    ]).then(() => {
      setSelectedNodeId(node.id);
    });
  };

  // Add this after data is loaded (right after setIsLoading(false))
  useEffect(() => {
    if (!isLoading && data.nodes.length > 0) {
      // Find the Stone Tools node
      const stoneToolsNode = data.nodes.find((node) =>
        node.title.toLowerCase().includes("stone tool")
      );

      if (stoneToolsNode) {
        // Get the container element
        const container = document.querySelector(
          ".overflow-y-auto"
        ) as HTMLElement;

        if (container) {
          // Calculate the scroll position:
          // node position - half the viewport height + some offset for the node height
          const scrollPosition =
            stoneToolsNode.y * zoom - container.clientHeight / 2 + 150;

          // Scroll to position
          container.scrollTo({
            top: Math.max(0, scrollPosition),
          });
        }
      }
    }
  }, [isLoading, data.nodes, zoom]);

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
    (link: any, index: number) => {
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
          ? getXPosition(Math.max(...data.nodes.map((n) => n.year)) + 1) +
              PADDING
          : containerDimensions.width,
        containerDimensions.width
      ),
    [data.nodes, getXPosition, containerDimensions.width]
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
    let isScrolling = false;
    let scrollDirection = { x: 0, y: 0 };
    let animationFrameId: number | null = null;

    const SCROLL_SPEED = 100; // Pixels per frame

    const updateScroll = () => {
      const horizontalContainer = horizontalScrollContainerRef.current;
      const verticalContainer = document.querySelector(
        ".overflow-y-auto"
      ) as HTMLElement;

      if (!horizontalContainer || !verticalContainer) return;

      if (scrollDirection.x) {
        horizontalContainer.scrollLeft += scrollDirection.x * SCROLL_SPEED;
      }
      if (scrollDirection.y) {
        verticalContainer.scrollTop += scrollDirection.y * SCROLL_SPEED;
      }

      if (isScrolling) {
        animationFrameId = requestAnimationFrame(updateScroll);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if already scrolling in this direction
      if (isScrolling) return;

      // Set scrolling state when starting scroll
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          event.key
        ) &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        setIsKeyScrolling(true);
      }

      const horizontalContainer = horizontalScrollContainerRef.current;
      if (!horizontalContainer) return;

      switch (event.key) {
        case "ArrowLeft":
          if (event.metaKey || event.ctrlKey) {
            // Existing behavior for Cmd/Ctrl+Left
            event.preventDefault();
            horizontalContainer.scrollTo({
              left: 0,
              behavior: "smooth",
            });
          } else {
            event.preventDefault();
            scrollDirection.x = -1;
            isScrolling = true;
            animationFrameId = requestAnimationFrame(updateScroll);
          }
          break;

        case "ArrowRight":
          if (event.metaKey || event.ctrlKey) {
            // Existing behavior for Cmd/Ctrl+Right
            event.preventDefault();
            horizontalContainer.scrollTo({
              left: horizontalContainer.scrollWidth,
              behavior: "smooth",
            });
          } else {
            event.preventDefault();
            scrollDirection.x = 1;
            isScrolling = true;
            animationFrameId = requestAnimationFrame(updateScroll);
          }
          break;

        case "ArrowUp":
          event.preventDefault();
          scrollDirection.y = -1;
          isScrolling = true;
          animationFrameId = requestAnimationFrame(updateScroll);
          break;

        case "ArrowDown":
          event.preventDefault();
          scrollDirection.y = 1;
          isScrolling = true;
          animationFrameId = requestAnimationFrame(updateScroll);
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
        case "ArrowRight":
          scrollDirection.x = 0;
          break;
        case "ArrowUp":
        case "ArrowDown":
          scrollDirection.y = 0;
          break;
      }

      // If no scrolling in either direction, stop the animation
      if (scrollDirection.x === 0 && scrollDirection.y === 0) {
        isScrolling = false;
        setIsKeyScrolling(false);
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
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

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-yellow-50">
        <div className="text-lg font-mono tracking-wide">
          Loading visualization...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-yellow-50">
      {/* Floating controls */}
      <>
        <div
          className="fixed top-4 right-4 flex flex-col gap-4"
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur border border-black rounded-none shadow-md">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-2 border border-black rounded-none hover:bg-gray-100 transition-colors"
            >
              <Minus size={20} />
            </button>
            <span className="w-16 text-center font-medium">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="p-2 border rounded hover:bg-gray-100 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="relative bg-white/80 backdrop-blur border border-black rounded-none shadow-md p-4">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search technologies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 border-black rounded-none font-mono"
            />
          </div>
        </div>
      </>

      <div
        ref={horizontalScrollContainerRef}
        className="overflow-x-auto overflow-y-hidden h-screen bg-yellow-50"
        style={{ overscrollBehaviorY: "none" }}
        onScroll={(e) => {
          const horizontalScroll = e.currentTarget.scrollLeft;
          setScrollPosition((prev) => ({
            ...prev,
            left: horizontalScroll,
          }));
        }}
      >
        <div style={{ width: containerWidth }}>
          {/* Timeline */}
          <div
            className="h-8 bg-yellow-50 border-b sticky top-0"
            style={{
              width: containerWidth,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              zIndex: 100, // Increased z-index
              position: "relative", // Added to create new stacking context
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
              height: "calc(100vh - 32px)",
              overscrollBehaviorY: "contain",
              position: "relative",
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
                width: containerWidth,
                minHeight: `${totalHeight * zoom}px`,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                position: "relative",
                marginBottom: "64px",
              }}
            >
              {/* SVG connections */}
              <svg
                className={`absolute inset-0 w-full h-full ${
                  isKeyScrolling ? "scrolling" : ""
                }`}
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
                      connectionType={link.type}
                      isHighlighted={shouldHighlightLink(link, index)}
                      opacity={
                        (selectedNodeId || selectedLinkIndex !== null) &&
                        !shouldHighlightLink(link, index)
                          ? 0.2
                          : 1
                      }
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
              <div
                className={`relative ${isKeyScrolling ? "scrolling" : ""}`}
                style={{ zIndex: 10 }}
              >
                {filteredNodes.map((node) => (
                  <BrutalistNode
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    isAdjacent={isAdjacentToSelected(node.id)}
                    formatYear={formatYear}
                    onClick={() => {
                      if (node.id === selectedNodeId) {
                        setSelectedNodeId(null);
                      } else {
                        setSelectedNodeId(node.id);
                      }
                    }}
                    onMouseEnter={() => {
                      setHoveredNode(node);
                      setHoveredNodeId(node.id);
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
                      opacity: selectedNodeId
                        ? node.id === selectedNodeId ||
                          isAdjacentToSelected(node.id)
                          ? 1
                          : 0.2
                        : selectedLinkIndex !== null
                        ? isNodeConnectedToSelectedLink(node.id)
                          ? 1
                          : 0.2
                        : 1,
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
                          top: `${node.y + 100}px`,
                          transform: "translate(-50%, 0)",
                          width: "16rem",
                          zIndex: 100,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.wikipedia) {
                            window.open(
                              node.wikipedia,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }
                        }}
                        onMouseEnter={() => setIsTooltipHovered(true)}
                        onMouseLeave={() => {
                          setIsTooltipHovered(false);
                          // Only clear hover if this isn't the selected node
                          if (node.id !== selectedNodeId) {
                            setHoveredNode(null);
                            setHoveredNodeId(null);
                          }
                        }}
                      >
                        <p className="text-xs mb-1">
                          <strong>Date:</strong> {formatYear(node.year)}
                          {node.dateDetails && ` (${node.dateDetails})`}
                        </p>
                        {node.inventors?.length > 0 && (
                          <p className="text-xs mb-1">
                            <strong>
                              Inventor{node.inventors.length > 1 ? "s" : ""}:
                            </strong>{" "}
                            {node.inventors.join(", ")}
                          </p>
                        )}
                        {node.organization && (
                          <p className="text-xs mb-1">
                            <strong>Organization:</strong> {node.organization}
                          </p>
                        )}
                        {node.formattedLocation && (
                          <p className="text-xs mb-1">
                            <strong>Location:</strong> {node.formattedLocation}
                          </p>
                        )}
                        {node.details && (
                          <p className="text-xs line-clamp-3">{node.details}</p>
                        )}
                        {node.wikipedia && (
                          <p className="text-xs mt-1 text-blue-600 hover:underline cursor-pointer">
                            View on Wikipedia →
                          </p>
                        )}
                      </div>
                    )
                )}
              </div>
            </div>
          </div>
        </div>
        <TechTreeMinimap
          nodes={data.nodes}
          containerWidth={containerWidth}
          totalHeight={totalHeight}
          viewportWidth={containerDimensions.width}
          viewportHeight={containerDimensions.height}
          scrollLeft={scrollPosition.left}
          scrollTop={scrollPosition.top}
          zoom={zoom}
          onViewportChange={handleViewportChange}
        />
      </div>
    </div>
  );
};

export const TechTreeViewerNoSSR = dynamic(
  () => Promise.resolve(TechTreeViewer),
  { ssr: false }
);

export default TechTreeViewer;
