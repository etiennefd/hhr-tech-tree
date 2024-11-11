"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import CurvedConnections from '../components/connections/CurvedConnections';
import ConnectionLegend from '../components/connections/ConnectionLegend';

const TechTreeViewer = () => {
  // Constants
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 150;
  const VERTICAL_SPACING = 160;
  const YEAR_WIDTH = 140;
  const PADDING = 120;
  const BASE_Y = 600; // Lowered from 600 to give more space above

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  const [data, setData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });

  // Calculate node positions with improved vertical distribution
  const calculateNodePositions = useCallback((nodes) => {
    if (!nodes.length) return [];
    
    const minYear = Math.min(...nodes.map(n => n.year));
    const getNodePosition = (year) => PADDING + ((year - minYear) * YEAR_WIDTH);
    
    const sortedNodes = [...nodes].sort((a, b) => a.year - b.year);
    const positionedNodes = [];
    const yearGroups = new Map();
    
    // First pass: group nodes by year
    sortedNodes.forEach(node => {
      const year = node.year;
      if (!yearGroups.has(year)) {
        yearGroups.set(year, []);
      }
      yearGroups.get(year).push(node);
    });
    
    // Second pass: position nodes within their year groups
    yearGroups.forEach((nodesInYear, year) => {
      const x = getNodePosition(year);
      const nodeCount = nodesInYear.length;
      
      nodesInYear.forEach((node, index) => {
        // Calculate vertical position based on index within year group
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
      .catch(error => {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      });
  }, [calculateNodePositions]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setContainerDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    const filtered = data.nodes.filter(node => 
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

  const getXPosition = useCallback((year: number) => {
    if (!data.nodes.length) return 0;
    const minYear = Math.min(...data.nodes.map(n => n.year));
    return PADDING + ((year - minYear) * YEAR_WIDTH);
  }, [data.nodes]);

  const shouldHighlightLink = useCallback((link: any, index: number) => {
    if (hoveredLinkIndex === index) return true;
    if (hoveredNodeId && (link.source === hoveredNodeId || link.target === hoveredNodeId)) return true;
    return false;
  }, [hoveredLinkIndex, hoveredNodeId]);

  const containerWidth = useMemo(() => Math.max(
    data.nodes.length ? 
      getXPosition(Math.max(...data.nodes.map(n => n.year)) + 1) + PADDING : 
      containerDimensions.width,
    containerDimensions.width
  ), [data.nodes, getXPosition, containerDimensions.width]);

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
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-2 border rounded hover:bg-gray-100 transition-colors"
            >
              <Minus size={20} />
            </button>
            <span className="w-16 text-center font-medium">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
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
            marginBottom: "64px"
          }}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {data.links.map((link, index) => {
              const sourceNode = data.nodes.find(n => n.id === link.source);
              const targetNode = data.nodes.find(n => n.id === link.target);
              
              if (!sourceNode || !targetNode) return null;

              return (
                <CurvedConnections
                  key={index}
                  sourceNode={{
                    x: getXPosition(sourceNode.year),
                    y: sourceNode.y || 150
                  }}
                  targetNode={{
                    x: getXPosition(targetNode.year),
                    y: targetNode.y || 150
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
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: NODE_WIDTH,
                transform: "translate(-60px, -75px)",
                opacity: hoveredNodeId && hoveredNodeId !== node.id ? 0.5 : 1
              }}
              onClick={() => {
                if (node.wikipedia) {
                  window.open(node.wikipedia, '_blank', 'noopener,noreferrer');
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
                      <strong>Inventor{node.inventors.length > 1 ? 's' : ''}:</strong> {node.inventors.join(', ')}
                    </p>
                  )}
                  {node.organization && (
                    <p className="text-xs mb-1">
                      <strong>Organization:</strong> {node.organization}
                    </p>
                  )}
                  {(node.city || node.countryHistorical) && (
                    <p className="text-xs mb-1">
                      <strong>Location:</strong> {[node.city, node.countryHistorical].filter(Boolean).join(', ')}
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
  { ssr: false }
);

export default TechTreeViewer;