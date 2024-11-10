"use client";

import React, { useState, useEffect } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

const TechTreeViewer = () => {

  // All hooks at the top level
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filteredNodes, setFilteredNodes] = useState([]);

  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 150;
  const VERTICAL_SPACING = 160; // Slightly reduced from 180
  const YEAR_WIDTH = 100;
  const PADDING = 120;
  

  const [data, setData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });


  // Add this useEffect for data fetching
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/inventions")
      .then((res) => res.json())
      .then((fetchedData) => {
        console.log('Sample node years:', fetchedData.nodes.slice(0, 5).map(n => n.year));
        // Now calculate positions using year range from the data
        const calculateNodePositions = (nodes) => {
          if (!nodes.length) {
            console.log('No nodes provided to calculateNodePositions');
            return [];
          }
        
          const minYear = Math.min(...nodes.map(n => n.year));
          console.log('Calculating positions with minYear:', minYear);
          
          const getNodePosition = (year: number) => {
            const position = PADDING + ((year - minYear) * YEAR_WIDTH);
            console.log('Position calculation:', { year, minYear, position });
            return position;
          };
        
          const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);
          const positionedNodes = [];
          
          for (const node of sortedNodes) {
            const x = getNodePosition(node.year);
            console.log('Node position calculated:', { 
              title: node.title, 
              year: node.year, 
              calculatedX: x 
            });
            
            // Find nearby nodes (within the time threshold)
            const nearbyNodes = positionedNodes.filter(
              other => Math.abs(other.x - x) < NODE_WIDTH
            );
            
            if (nearbyNodes.length === 0) {
              positionedNodes.push({ ...node, x, y: 150 });
              continue;
            }
        
            // Find available vertical positions
            const usedPositions = nearbyNodes.map(n => n.y);
            const baseY = 150;
            const maxLevelsEachDirection = 3; // Limit how far up/down we go
            
            // Check positions above and below baseline
            let bestY = baseY;
            let minConflicts = Infinity;
            
            for (let level = -maxLevelsEachDirection; level <= maxLevelsEachDirection; level++) {
              const testY = baseY + (level * VERTICAL_SPACING);
              const conflicts = usedPositions.filter(
                y => Math.abs(y - testY) < NODE_HEIGHT
              ).length;
              
              if (conflicts < minConflicts) {
                minConflicts = conflicts;
                bestY = testY;
              }
            }
        
            positionedNodes.push({ ...node, x, y: bestY });
          }
        
          return positionedNodes;
        };
  
        const positionedNodes = calculateNodePositions(fetchedData.nodes);
        setData({ ...fetchedData, nodes: positionedNodes });
        setFilteredNodes(positionedNodes);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      });
  }, []);

  // And add a new effect to update filteredNodes when data changes:
  useEffect(() => {
    setFilteredNodes(data.nodes);
  }, [data.nodes]);

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Search effect
  useEffect(() => {
    const filtered =
      data?.nodes?.filter(
        (node) =>
          node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (node.description || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      ) || [];
    setFilteredNodes(filtered);
  }, [searchTerm, data.nodes]);

  // Helper functions
  const formatYear = (year: number) => {
    const absYear = Math.abs(year);
    return year < 0 ? `${absYear} BCE` : `${year}`;
  };

  const getXPosition = (year: number) => {
    if (!data.nodes.length) return 0;  
    const years = data.nodes.map(n => n.year);
    const minYear = Math.min(...years);
    const position = PADDING + ((year - minYear) * YEAR_WIDTH);
    console.log('Position calculation:', { year, minYear, YEAR_WIDTH, PADDING, position });
    return position;
  };

  const renderConnections = () => {
    return data.links.map((link, index) => {
      const sourceNode = data.nodes.find((n) => n.id === link.source);
      const targetNode = data.nodes.find((n) => n.id === link.target);

      if (!sourceNode || !targetNode) return null;

      const x1 = getXPosition(sourceNode.year);
      const x2 = getXPosition(targetNode.year);
      const y1 = 150;
      const y2 = 150;

      // Calculate the angle for proper arrow placement
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = Math.atan2(dy, dx);

      // Arrow parameters
      const arrowLength = 10;
      const arrowWidth = 6;

      // Calculate arrow points
      const arrowPoint1X = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
      const arrowPoint1Y = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
      const arrowPoint2X = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
      const arrowPoint2Y = y2 - arrowLength * Math.sin(angle + Math.PI / 6);

      return (
        <g key={index}>
          {/* Connection line */}
          <path
            d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke="#666"
            strokeWidth="2"
            fill="none"
          />

          {/* Arrow head */}
          <path
            d={`M ${x2} ${y2} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`}
            fill="#666"
          />
        </g>
      );
    });
  };

  const containerWidth = data.nodes.length ? Math.max(
    getXPosition(Math.max(...data.nodes.map(n => n.year)) + 1) + PADDING,
    window.innerWidth
  ) : window.innerWidth;

  if (!isClient || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 flex flex-col border-4 border-red-500">
      <div className="h-16 flex items-center gap-4 p-4 bg-white border-b">
      <div className="flex items-center gap-4 p-4 bg-white border-b border-4 border-blue-500">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-2 border rounded hover:bg-gray-100"
          >
            <Minus size={20} />
          </button>
          <span className="w-16 text-center">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-2 border rounded hover:bg-gray-100"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 max-w-sm relative">
          <Input
            type="text"
            placeholder="Search technologies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-auto border-4 border-green-500"> {/* Added border */}
        <div
          style={{
            width: containerWidth,
            minHeight: "1000px",
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            position: "relative",
            border: "4px solid purple", // Added border
            paddingTop: "120px"
          }}
        >

      <div className="absolute top-0 left-0 bg-yellow-200 p-2">
              Container Top
      </div>

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {renderConnections()}
          </svg>

          {/* Nodes */}
          {filteredNodes.map((node) => (
            <div
            key={node.id}
            className="absolute bg-white border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{
              left: `${node.x}px`,  // Add px unit
              top: `${node.y}px`,   // Add px unit
              width: "120px",
              transform: "translate(-60px, -75px)", // Center the node
            }}
            onMouseEnter={() => setHoveredNode(node)}
            onMouseLeave={() => setHoveredNode(null)}
          >
              <img
                src={node.image}
                alt={node.title}
                className="w-full h-20 object-cover rounded mb-2"
              />
              <h3 className="text-sm font-medium">{node.title}</h3>
              <p className="text-xs text-gray-500">{formatYear(node.year)}</p>

              {/* Hover tooltip */}
              {hoveredNode?.id === node.id && (
                <div className="absolute z-10 bg-white border rounded-lg p-3 shadow-lg -bottom-24 left-1/2 transform -translate-x-1/2 w-64">
                  <p className="text-xs mb-1">
                    <strong>Date:</strong> {formatYear(node.year)}
                  </p>
                  {node.description && (
                    <p className="text-xs">{node.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Timeline */}
          <div className="absolute bottom-0 w-full h-8 border-t">
            {(() => {
              if (!data.nodes.length) return null;
              
              const years = data.nodes.map(n => n.year);
              const minYear = Math.min(...years);
              const maxYear = Math.max(...years);
              
              const timelineYears = [];
              for (let year = minYear - 1; year <= maxYear + 1; year++) {
                timelineYears.push(year);
              }
              
              return timelineYears.map((year) => (
                <div
                  key={year}
                  className="absolute text-sm text-gray-500"
                  style={{
                    left: `${getXPosition(year)}px`,  // Add px unit
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
  {
    ssr: false,
  }
);
