"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import CurvedConnections from "../components/connections/CurvedConnections";
import ConnectionLegend from "../components/connections/ConnectionLegend";

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

const DEFAULT_FIELD_POSITION = 0.5;
const FIELD_POSITIONS = {
  // Food (0.05-0.15)
  "Food": 0.05,
  "Agriculture": 0.08,
  "Animal husbandry": 0.11,
  "Hunting and fishing": 0.14,

  // Life Sciences (0.15-0.25)
  "Biology": 0.17,
  "Medicine": 0.20,
  "Sanitation": 0.23,

  // Physical Sciences (0.25-0.4)
  "Physics": 0.25,
  "Chemistry": 0.28,
  "Astronomy": 0.31,
  "Geology": 0.34,
  "Meteorology": 0.37,
  "Optics": 0.40,

  // Energy & Electronics (0.4-0.5)
  "Electricity": 0.40,
  "Electronics": 0.43,
  "Energy": 0.46,
  "Lighting": 0.49,

  // Construction/Materials (0.5-0.65)
  "Construction": 0.50,
  "Mining": 0.53,
  "Metallurgy": 0.56,
  "Manufacturing": 0.59,
  "Textiles": 0.62,
  "Hydraulics": 0.65,

  // Transportation/Movement (0.65-0.75)
  "Transportation": 0.65,
  "Flying": 0.68,
  "Sailing": 0.71,
  "Space": 0.74,
  "Cartography": 0.77,

  // Computing/Math (0.75-0.85)
  "Mathematics": 0.75,
  "Measurement": 0.78,
  "Timekeeping": 0.81,
  "Computing": 0.84,

  // Safety/Protection/Governance (0.85-0.95)
  "Security": 0.85,
  "Military": 0.87,
  "Finance": 0.89,
  "Law": 0.91,
  "Governance": 0.93,

  // Culture (0.95-1.0)
  "Communication": 0.95,
  "Visual media": 0.96,
  "Entertainment": 0.98,
  "Music": 0.99
};

const TechTreeViewer = () => {
  // Constants
  const NODE_WIDTH = 160;
  const VERTICAL_SPACING = 200;
  const YEAR_WIDTH = 200;
  const PADDING = 120;
  const BASE_Y = 600; // Lowered from 600 to give more space above

  const fieldColors = {
    // Food & Agriculture (Greens)
    Food: "#e0f4e0",             // Fresh green
    Agriculture: "#e8f4d9",      // Lime green
    "Animal husbandry": "#d5e8d1", // Darker green
    "Hunting and fishing": "#c9e6c9", // Deep forest green

    // Life Sciences (Blue-Greens)
    Biology: "#d1e8e1",          // Sage blue-green
    Medicine: "#c2e6dd",         // Medical mint
    Sanitation: "#d8efe6",       // Light mint

    // Physical Sciences (Blues & Purples)
    Physics: "#e6e1f4",          // Soft purple
    Chemistry: "#e0d9f2",        // Deeper purple
    Astronomy: "#d9e1ff",        // Periwinkle
    Geology: "#e8e4f1",          // Dusty purple
    Meteorology: "#e1e8f7",      // Sky blue
    Optics: "#dce4f7",           // Light purple-blue

    // Energy & Electronics (Yellows & Oranges)
    Electricity: "#fff2d1",      // Pale yellow
    Electronics: "#ffe9cc",      // Light orange
    Energy: "#ffe4cc",           // Peach
    Lighting: "#fff4d9",         // Warm yellow

    // Construction/Materials (Browns & Tans)
    Construction: "#f2e6d9",     // Light tan
    Mining: "#ede1d4",           // Beige
    Metallurgy: "#e8dccf",       // Bronze
    Manufacturing: "#f7e6d9",    // Clay
    Textiles: "#f9e6ef",        // Soft pink
    Hydraulics: "#e0e8f0",       // Steel blue

    // Transportation/Movement (Cool Blues)
    Transportation: "#e6ecf2",   // Steel blue
    Flying: "#e1e7f2",          // Sky blue
    Sailing: "#d9e3f2",         // Ocean blue
    Space: "#d4dff2",           // Space blue
    Cartography: "#dee6f2",      // Map blue

    // Computing/Math (Grays & Silver)
    Mathematics: "#e8ecf2",      // Silver blue
    Measurement: "#e5e9f0",      // Cool gray
    Timekeeping: "#e2e6ed",      // Clock gray
    Computing: "#dfe3ea",        // Tech gray

    // Safety/Protection/Governance (Warm Grays & Reds)
    Security: "#ffe6e6",         // Light red
    Military: "#ffeae6",         // Coral
    Finance: "#e6eaf0",          // Banking gray
    Law: "#e9e9f2",             // Justice gray
    Governance: "#e6e6f0",       // Official gray

    // Culture & Communication (Pinks & Soft Reds)
    Communication: "#ffe6f0",    // Soft pink
    "Visual media": "#ffe6eb",   // Rose pink
    Entertainment: "#ffeae6",    // Light coral
    Music: "#ffe9f2"            // Musical pink
  };

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

  const getXPosition = useCallback(
    (year: number) => {
      if (!data.nodes.length) return 0;
      const minYear = Math.min(...data.nodes.map((n) => n.year));
      return calculateXPosition(year, minYear, PADDING, YEAR_WIDTH);
    },
    [data.nodes]
  );

  // Calculate node positions with improved vertical distribution
  const calculateNodePositions = useCallback((nodes) => {
    if (!nodes.length) return [];
  
    const minYear = Math.min(...nodes.map((n) => n.year));
    const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);
    const positionedNodes = [];
    const yearGroups = new Map();
  
    // First pass: group nodes by aligned year
    sortedNodes.forEach((node) => {
      const alignedYear = getTimelineSegment(node.year);
      if (!yearGroups.has(alignedYear)) {
        yearGroups.set(alignedYear, []);
      }
      yearGroups.get(alignedYear).push(node);
    });
  
    // Find the maximum number of nodes in any year group
    const maxNodesInColumn = Math.max(
      ...Array.from(yearGroups.values()).map((group) => group.length)
    );
  
    // Calculate total height needed
    const TOP_PADDING = 100; // Reduced from 150
    const BOTTOM_PADDING = 100;
    const calculatedTotalHeight = (maxNodesInColumn - 1) * VERTICAL_SPACING + TOP_PADDING + BOTTOM_PADDING;
    
    setTotalHeight(calculatedTotalHeight);
  
    // Second pass: position nodes
    yearGroups.forEach((nodesInYear, year) => {
      const x = calculateXPosition(year, minYear, PADDING, YEAR_WIDTH);
      const nodeCount = nodesInYear.length;
      
      // Calculate available vertical space for this column
      const availableHeight = calculatedTotalHeight - TOP_PADDING - BOTTOM_PADDING;
      
      // Sort nodes within the year group by their preferred vertical position
      nodesInYear.sort((a, b) => {
        const aPosition = a.fields?.length ? 
          Math.min(...a.fields.map(f => FIELD_POSITIONS[f] || DEFAULT_FIELD_POSITION)) :
          DEFAULT_FIELD_POSITION;
        const bPosition = b.fields?.length ? 
          Math.min(...b.fields.map(f => FIELD_POSITIONS[f] || DEFAULT_FIELD_POSITION)) :
          DEFAULT_FIELD_POSITION;
        return aPosition - bPosition;
      });
  
      // Position nodes ensuring minimum spacing
      nodesInYear.forEach((node, index) => {
        // Get preferred position based on fields
        const fieldPositions = node.fields?.length ?
          node.fields.map(f => FIELD_POSITIONS[f] || DEFAULT_FIELD_POSITION) :
          [DEFAULT_FIELD_POSITION];
        
        // Calculate base position
        let verticalPosition = (fieldPositions.reduce((a, b) => a + b, 0) / fieldPositions.length) * availableHeight;
        
        // Add small randomization
        const randomization = (Math.random() - 0.5) * 0.05 * VERTICAL_SPACING;
        verticalPosition += randomization;
  
        // Adjust position based on previous node to ensure minimum spacing
        if (index > 0) {
          const prevNode = positionedNodes[positionedNodes.length - 1];
          const minY = prevNode.y + VERTICAL_SPACING;
          if (verticalPosition + TOP_PADDING < minY) {
            verticalPosition = minY - TOP_PADDING;
          }
        }
        
        // Clamp position within available space
        verticalPosition = Math.max(0, Math.min(availableHeight, verticalPosition));
        
        const y = TOP_PADDING + verticalPosition;
        positionedNodes.push({ ...node, x, y });
      });
    });
  
    return positionedNodes;
  }, []);

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
  useEffect(() => {
    const handleResize = () => {
      setContainerDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      if (!target.closest('.tech-node') && 
          !target.closest('.node-tooltip') && 
          !target.closest('.connection')) {
        setSelectedNodeId(null);
        setSelectedLinkIndex(null);
        setHoveredNode(null);
        setHoveredNodeId(null);
        setHoveredLinkIndex(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading visualization...</div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto">
      {/* Floating controls */}
      <>
        <div className="fixed top-4 right-4 flex flex-col gap-4 z-50">
          <div className="flex items-center gap-4 p-4 bg-white/90 backdrop-blur rounded-lg shadow-lg">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-2 border rounded hover:bg-gray-100 transition-colors"
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
          <div className="relative bg-white/90 backdrop-blur rounded-lg shadow-lg p-4">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search technologies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="fixed top-40 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg p-4 z-50">
          <ConnectionLegend />
        </div>
      </>

      {/* Scrollable container */}
      <div className="overflow-x-auto">
        {/* Main visualization */}
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
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {data.links.map((link, index) => {
              const sourceNode = data.nodes.find((n) => n.id === link.source);
              const targetNode = data.nodes.find((n) => n.id === link.target);

              if (!sourceNode || !targetNode) return null;

              const isHighlighted = shouldHighlightLink(link, index);

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
                    // If something is selected, non-highlighted links become transparent
                    (selectedNodeId || selectedLinkIndex !== null) && !shouldHighlightLink(link, index)
                      ? 0.2
                      : 1
                  }
                  onMouseEnter={() => setHoveredLinkIndex(index)}
                  onMouseLeave={() => setHoveredLinkIndex(null)}
                  onSelect={() => {
                    if (selectedLinkIndex === index) {
                      setSelectedLinkIndex(null);
                    } else {
                      setSelectedLinkIndex(index);
                      setSelectedNodeId(null); // Clear any selected node
                    }
                  }}
                  sourceTitle={sourceNode.title}
                  targetTitle={targetNode.title}
                  details={link.details}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          <div className="relative" style={{ zIndex: 1 }}>
            {filteredNodes.map((node) => (
              <div
                key={node.id}
                className="absolute bg-white/90 backdrop-blur border rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer tech-node"
                style={{
                  left: `${getXPosition(node.year)}px`,
                  top: `${node.y}px`,
                  width: NODE_WIDTH,
                  transform: "translate(-60px, -75px)",
                  opacity: selectedNodeId
                    ? node.id === selectedNodeId || isAdjacentToSelected(node.id)
                      ? 1
                      : 0.2
                    : selectedLinkIndex !== null
                    ? isNodeConnectedToSelectedLink(node.id)
                      ? 1
                      : 0.2
                    : 1,
                  backgroundColor:
                    node.id === selectedNodeId
                      ? "#f0f7ff"
                      : "rgba(255, 255, 255, 0.9)",
                }}
                onClick={(e) => {
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
                  // Only keep hover if this is the selected node
                  if (node.id !== selectedNodeId) {
                    setHoveredNode(null);
                    setHoveredNodeId(null);
                  }
                }}
              >
                <img
                  src={node.image}
                  alt={node.title}
                  className="w-full h-20 object-cover rounded mb-2"
                />
                <h3 className="text-sm font-medium line-clamp-2">{node.title}</h3>
                <p className="text-xs text-gray-500">{formatYear(node.year)}</p>
                <div className="flex flex-wrap gap-1">
                  {node.fields.map((field) => (
                    <span
                      key={field}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: fieldColors[field] || "#f0f0f0",
                        color: "#333",
                      }}
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Tooltips */}
          <div className="relative" style={{ zIndex: 2 }}>
            {filteredNodes.map((node) => (
              (hoveredNode?.id === node.id || selectedNodeId === node.id) && (
                <div
                  key={`tooltip-${node.id}`}
                  className="absolute bg-white border rounded-lg p-3 shadow-lg node-tooltip"
                  style={{
                    left: `${getXPosition(node.year)}px`,
                    top: `${node.y + 100}px`,  // Instead of node.y - 75, position it below the node
                    transform: "translate(-50%, 0)",  // Remove the 100% translation since we're positioning from top
                    width: "16rem",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.wikipedia) {
                      window.open(node.wikipedia, "_blank", "noopener,noreferrer");
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
                  {(node.city || node.countryHistorical) && (
                    <p className="text-xs mb-1">
                      <strong>Location:</strong>{" "}
                      {[node.city, node.countryHistorical]
                        .filter(Boolean)
                        .join(", ")}
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
            ))}
          </div>

          {/* Timeline - keeping original implementation */}
          <div
            className="sticky bottom-0 h-16 bg-white border-t"
            style={{
              width: containerWidth,
              transform: `scale(${zoom})`,
              transformOrigin: "bottom left",
              zIndex: 50,
            }}
          >
            {(() => {
              if (!data.nodes.length) return null;

              const years = data.nodes.map((n) => n.year);
              const minYear = Math.min(...years);
              const maxYear = Math.max(...years);

              const timelineYears = getTimelineYears(minYear, maxYear);

              return timelineYears.map((year) => (
                <div
                  key={year}
                  className="absolute text-sm text-gray-500"
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
        </div>
      </div>
    </div>
  );
};

export const TechTreeViewerNoSSR = dynamic(
  () => Promise.resolve(TechTreeViewer),
  { ssr: false }
);

export default TechTreeViewer;
