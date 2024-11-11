"use client";

import React, { useState, useEffect } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import CurvedConnections from '../components/connections/CurvedConnections';
import ConnectionLegend from '../components/connections/ConnectionLegend';

const TechTreeViewer = () => {

  // All hooks at the top level
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);


  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 150;
  const VERTICAL_SPACING = 160; // Slightly reduced from 180
  const YEAR_WIDTH = 140;
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
            return [];
          }
        
          const minYear = Math.min(...nodes.map(n => n.year));
          
          const getNodePosition = (year: number) => {
            const position = PADDING + ((year - minYear) * YEAR_WIDTH);
            return position;
          };
        
          const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);
          const positionedNodes = [];
          
          for (const node of sortedNodes) {
            const x = getNodePosition(node.year);
            
            // Find nearby nodes (within the time threshold)
            const nearbyNodes = positionedNodes.filter(
              other => Math.abs(other.x - x) < NODE_WIDTH
            );
            
            if (nearbyNodes.length === 0) {
              positionedNodes.push({ ...node, x, y: 600 });
              continue;
            }
        
            // Find available vertical positions
            const usedPositions = nearbyNodes.map(n => n.y);
            const baseY = 600;
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
    return position;
  };

  const renderConnections = () => {
    return data.links.map((link, index) => {
      const sourceNode = data.nodes.find((n) => n.id === link.source);
      const targetNode = data.nodes.find((n) => n.id === link.target);
  
      if (!sourceNode || !targetNode) return null;
  
      const sourcePos = {
        x: getXPosition(sourceNode.year),
        y: sourceNode.y || 150
      };
      const targetPos = {
        x: getXPosition(targetNode.year),
        y: targetNode.y || 150
      };
  
      return (
        <CurvedConnections
          key={index}
          sourceNode={sourcePos}
          targetNode={targetPos}
          connectionType={link.type}
          isHighlighted={shouldHighlightLink(link, index)}
          onMouseEnter={() => setHoveredLinkIndex(index)}
          onMouseLeave={() => setHoveredLinkIndex(null)}
          sourceTitle={sourceNode.title}
          targetTitle={targetNode.title}
          details={link.details}
        />
      );
    });
  };

  const shouldHighlightLink = (link: any, index: number) => {
    if (hoveredLinkIndex === index) return true;
    if (hoveredNodeId && (link.source === hoveredNodeId || link.target === hoveredNodeId)) return true;
    return false;
  };

  const containerWidth = data.nodes.length ? Math.max(
    getXPosition(Math.max(...data.nodes.map(n => n.year)) + 1) + PADDING,
    window.innerWidth
  ) : window.innerWidth;

  if (!isClient || isLoading) {
    return <div>Loading...</div>;
  }


  return (
    <div className="h-screen overflow-y-auto">
      {/* Floating controls */}
      <>
        <div className="fixed top-4 right-4 flex flex-col gap-4 z-10">
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-lg">
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
          <div className="flex-1 max-w-sm relative bg-white rounded-lg shadow-lg p-4">
            <Input
              type="text"
              placeholder="Search technologies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-6.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="fixed top-40 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
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
            marginBottom: "64px"
          }}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {renderConnections()}
          </svg>
  
          {/* Nodes */}
          {filteredNodes.map((node) => (
            <div
            key={node.id}
            className="absolute bg-white border rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: "120px",
              transform: "translate(-60px, -75px)",
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
        </div>
  
        {/* Timeline */}
        <div 
        className="sticky bottom-0 h-16 bg-white border-t" 
        style={{ 
          width: containerWidth,
          transform: `scale(${zoom})`,
          transformOrigin: "bottom left",
          zIndex: 50
        }}
      >
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
  {
    ssr: false,
  }
);
