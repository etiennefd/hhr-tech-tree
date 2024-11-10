"use client";

import React, { useState, useEffect } from "react";
import { Plus, Minus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

const TechTreeViewer = () => {
  // Move all data outside of the component
  // Replace the existing data with:
  // const data = {
  //     nodes: [
  //       {
  //         id: 1,
  //         title: "Logarithm",
  //         year: 1614,
  //         description: "", // Empty as no details provided in CSV
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 2,
  //         title: "Compound microscope",
  //         year: 1620,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 3,
  //         title: "Slide rule",
  //         year: 1622,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 4,
  //         title: "Mechanical calculator",
  //         year: 1642,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 5,
  //         title: "Barometer",
  //         year: 1643,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 6,
  //         title: "Vacuum pump",
  //         year: 1650,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 7,
  //         title: "Magdeburg hemispheres",
  //         year: 1654,
  //         description: "Experiment used to demonstrate the power of atmospheric pressure.",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 8,
  //         title: "Alcohol thermometer",
  //         year: 1654,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 9,
  //         title: "Pendulum clock",
  //         year: 1656,
  //         description: "First conceptualized by Galileo Galilei in 1637; built by Huygens in 1656",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 10,
  //         title: "Boyle's air pump",
  //         year: 1658,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 11,
  //         title: "Spirit level",
  //         year: 1661,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       },
  //       {
  //         id: 12,
  //         title: "Friction machine",
  //         year: 1663,
  //         description: "",
  //         image: "/api/placeholder/100/100"
  //       }
  //     ],
  //     links: [
  //       { source: 1, target: 3, description: "Logarithms enabled slide rule calculations" },
  //       { source: 6, target: 7, description: "Vacuum pump used in Magdeburg hemispheres experiment" },
  //       { source: 6, target: 10, description: "Vacuum pump principles used in Boyle's air pump" }
  //     ]
  //   };

  const [data, setData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });

  // All hooks at the top level
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredNode, setHoveredNode] = useState(null);
  const [filteredNodes, setFilteredNodes] = useState([]);

  // Add this useEffect for data fetching
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/inventions")
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
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
    const filtered = data.nodes.filter(
      (node) =>
        node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    setFilteredNodes(filtered);
  }, [searchTerm, data.nodes]); // Add data.nodes as dependency

  // Helper functions
  const formatYear = (year: number) => {
    const absYear = Math.abs(year);
    return year < 0 ? `${absYear} BCE` : `${year} CE`;
  };

  const YEAR_WIDTH = 100;
  const PADDING = 120; // Add this line

  const MIN_YEAR =
    data?.nodes?.length > 0 ? Math.min(...data.nodes.map((n) => n.year)) : 0;
  const MAX_YEAR =
    data?.nodes?.length > 0 ? Math.max(...data.nodes.map((n) => n.year)) : 0;

  const getXPosition = (year: number) => {
    return PADDING + (year - MIN_YEAR) * YEAR_WIDTH;
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

      return (
        <g key={index}>
          <path
            d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${
              (x1 + x2) / 2
            } ${y2}, ${x2} ${y2}`}
            stroke="#888"
            fill="none"
            strokeWidth="2"
            opacity={0.5}
          />
          <path
            d={`M ${x2 - 5} ${y2 - 5} L ${x2} ${y2} L ${x2 - 5} ${y2 + 5}`}
            stroke="#888"
            fill="none"
            strokeWidth="2"
          />
        </g>
      );
    });
  };

  if (!isClient || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <div className="flex items-center gap-4 p-4 bg-white border-b">
        <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-auto">
        <div
          style={{
            width: Math.max(
              (MAX_YEAR - MIN_YEAR) * YEAR_WIDTH + PADDING * 2,
              parseFloat("100%")
            ),
            height: "calc(100vh - 120px)",
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            position: "relative",
          }}
        >
          {/* Timeline axis */}
          <div className="absolute bottom-0 w-full h-8 border-t">
            {Array.from(
              { length: MAX_YEAR - MIN_YEAR + 1 },
              (_, i) => MIN_YEAR + i
            ).map((year) => (
              <div
                key={year}
                className="absolute text-sm text-gray-500"
                style={{
                  left: getXPosition(year),
                  transform: "translateX(-50%)",
                }}
              >
                {formatYear(year)}
              </div>
            ))}
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
                left: getXPosition(node.year),
                top: "120px",
                width: "120px",
                transform: "translateX(-60px)",
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
