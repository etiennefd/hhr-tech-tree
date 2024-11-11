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
const YEAR_LATE_ANTIQUITY = -100;
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
  const VERTICAL_SPACING = 160;
  const YEAR_WIDTH = 170;
  const PADDING = 120;
  const BASE_Y = 600; // Lowered from 600 to give more space above

  const fieldColors = {
    // Life Sciences - Greens
    Biology: "#e0f0e3", // Sage green
    Medicine: "#dcefe7", // Hospital green
    Agriculture: "#e8f4d9", // Light lime
    "Animal husbandry": "#eaf2dc", // Soft olive

    // Physical Sciences - Purples/Blues
    Physics: "#e6e1f4", // Soft purple
    Chemistry: "#e9e4f7", // Light violet
    Astronomy: "#e1e5ff", // Light periwinkle
    Geology: "#e8e4f1", // Dusty purple
    Meteorology: "#e1f2f7", // Sky blue

    // Engineering/Tech - Yellows/Oranges
    Electricity: "#fff4d9", // Pale yellow
    Electronics: "#ffefd4", // Light orange
    Energy: "#ffecd9", // Peach
    Machinery: "#fae6d9", // Soft orange

    // Transportation/Movement - Pinks
    Transportation: "#fde6e6", // Light pink
    Flying: "#fce8ef", // Soft rose
    Navigation: "#ffeaf1", // Baby pink

    // Computing/Math - Grays/Silvers
    Computing: "#ebeef2", // Cool gray
    Mathematics: "#e8ecf2", // Silver blue
    Measurement: "#e5e9f0", // Pale slate

    // Construction/Materials - Browns/Tans
    Construction: "#f2e6d9", // Light tan
    Mining: "#f0e6db", // Soft beige
    Metallurgy: "#efe5d6", // Pale bronze

    // Culture/Arts - Soft reds/Pinks
    Art: "#ffe6eb", // Rose pink
    Entertainment: "#ffe6e6", // Light coral
    Music: "#ffeaf2", // Soft pink

    // Communications/Information - Blues
    Communications: "#e1f0f5", // Light cyan
    Printing: "#deeaf3", // Powder blue
    Imaging: "#e4f1f6", // Pale blue

    // Environmental/Natural - Greens/Blues
    Sanitation: "#e0eee8", // Mint
    Hydraulics: "#e0f0f0", // Aqua
    Food: "#e5f2e5", // Fresh green

    // Safety/Protection - Red tones
    Security: "#ffe6e6", // Light red
    Military: "#ffeae6", // Pale coral

    // Other Technical Fields
    Surveying: "#e6ecf2", // Light slate
    Optics: "#e8f0f7", // Pale sky
    Space: "#e6e9f7", // Light space gray
    Cartography: "#e9eff5", // Map blue

    // Industrial/Craft
    Crafts: "#f7e6d9", // Light clay
    Textiles: "#f9e6ef", // Soft fabric pink

    // Governance/Systems
    Finance: "#e6eaf0", // Banking gray
    Law: "#e9e9f2", // Justice gray
    Governance: "#e6e6f0", // Official gray

    // Resource/Nature
    "Hunting and fishing": "#e5eee5", // Forest green
    Lighting: "#fff9e6", // Warm light yellow

    // Time
    Timekeeping: "#f0f0f5", // Clock gray
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

    // Second pass: position nodes
    yearGroups.forEach((nodesInYear, year) => {
      const x = calculateXPosition(year, minYear, PADDING, YEAR_WIDTH);
      const nodeCount = nodesInYear.length;

      nodesInYear.forEach((node, index) => {
        const offset = (index - (nodeCount - 1) / 2) * VERTICAL_SPACING;
        const y = BASE_Y + offset;

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

  // Memoized helper functions
  const formatYear = useCallback((year: number) => {
    const absYear = Math.abs(year);
    return year < 0 ? `${absYear} BCE` : `${year}`;
  }, []);

  const shouldHighlightLink = useCallback(
    (link: any, index: number) => {
      if (hoveredLinkIndex === index) return true;
      if (
        hoveredNodeId &&
        (link.source === hoveredNodeId || link.target === hoveredNodeId)
      )
        return true;
      return false;
    },
    [hoveredLinkIndex, hoveredNodeId]
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
            minHeight: "1000px",
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
                  onMouseEnter={() => setHoveredLinkIndex(index)}
                  onMouseLeave={() => setHoveredLinkIndex(null)}
                  sourceTitle={sourceNode.title}
                  targetTitle={targetNode.title}
                  details={link.details}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {filteredNodes.map((node) => (
            <div
              key={node.id}
              className="absolute bg-white/90 backdrop-blur border rounded-lg p-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
              style={{
                left: `${getXPosition(node.year)}px`,
                top: `${node.y}px`,
                width: NODE_WIDTH,
                transform: "translate(-60px, -75px)",
                opacity: hoveredNodeId && hoveredNodeId !== node.id ? 0.5 : 1,
              }}
              onClick={() => {
                if (node.wikipedia) {
                  window.open(node.wikipedia, "_blank", "noopener,noreferrer");
                }
              }}
              onMouseEnter={() => {
                setHoveredNode(node);
                setHoveredNodeId(node.id);
              }}
              onMouseLeave={() => {
                setHoveredNode(null);
                setHoveredNodeId(null);
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

              {/* Tooltip */}
              {hoveredNode?.id === node.id && (
                <div className="absolute z-[1000] bg-white border rounded-lg p-3 shadow-lg -bottom-24 left-1/2 transform -translate-x-1/2 w-64">
                  {/* Also removed the backdrop-blur and reduced transparency for better readability */}
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
              )}
            </div>
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
  );
};

export const TechTreeViewerNoSSR = dynamic(
  () => Promise.resolve(TechTreeViewer),
  { ssr: false }
);

export default TechTreeViewer;
