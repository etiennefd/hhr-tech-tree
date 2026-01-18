"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getFieldColor } from "@/constants/fieldColors";

// Types
interface TechNode {
  id: string;
  title: string;
  subtitle?: string;
  year: number;
  fields: string[];
  localImage?: string;
  image?: string;
  imagePosition?: string;
}

interface TechLink {
  source: string;
  target: string;
  type: string;
  details?: string;
}

interface TechData {
  nodes: TechNode[];
  links: TechLink[];
}

// Mini node component - simplified version of BrutalistNode
const MiniNode: React.FC<{
  node: TechNode;
  x: number;
  y: number;
  isCenter: boolean;
  onClick: () => void;
}> = ({ node, x, y, isCenter, onClick }) => {
  const year = Math.abs(node.year);
  const yearDisplay = node.year < 0 ? `${year} BCE` : `${year}`;
  const width = 160;

  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 hover:scale-105 ${
        isCenter ? "z-20" : "z-10"
      }`}
      style={{
        left: x - width / 2,
        top: y - 75,
        width: width,
      }}
      onClick={onClick}
    >
      <div
        className={`border border-black bg-white ${
          isCenter ? "ring-2 ring-black shadow-lg" : ""
        }`}
      >
        {/* Image section */}
        <div className="border-b border-black h-20 relative overflow-hidden bg-gray-100">
          {(node.localImage || node.image) && (
            <img
              src={node.localImage || node.image}
              alt={node.title}
              className="w-full h-full object-cover"
              style={{
                filter: "grayscale(20%) contrast(110%)",
                mixBlendMode: "multiply",
                objectPosition: node.imagePosition || "center",
              }}
            />
          )}
        </div>

        {/* Content section */}
        <div className="px-3 py-2">
          <div className="mb-2">
            <h3
              className="text-sm font-bold leading-tight uppercase"
              style={{
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {node.title}
            </h3>
            {node.subtitle && (
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                {node.subtitle}
              </div>
            )}
          </div>

          {/* Year */}
          <div className="inline-block border border-black px-2 py-0.5 mb-2">
            <span className="font-mono text-xs">{yearDisplay}</span>
          </div>

          {/* Fields */}
          <div className="flex flex-wrap gap-1">
            {node.fields.map((field: string) => (
              <span
                key={field}
                className="text-[10px] px-1.5 py-0.5 uppercase font-bold text-white"
                style={{
                  backgroundColor: getFieldColor(field),
                }}
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Connection line component
const ConnectionLine: React.FC<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: string;
  isIncoming: boolean;
}> = ({ fromX, fromY, toX, toY, type, isIncoming }) => {
  const engineeringBlue = "#91B4C5";

  // Calculate control points for curved line
  const midX = (fromX + toX) / 2;
  const dx = Math.abs(toX - fromX);
  const controlOffset = Math.min(dx * 0.3, 80);

  const path = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;

  // Arrow at end
  const arrowSize = 8;
  const arrowPath = `M ${toX} ${toY} L ${toX - arrowSize} ${toY - arrowSize / 2} L ${toX - arrowSize} ${toY + arrowSize / 2} Z`;

  // Determine dash pattern based on type
  let strokeDasharray = "none";
  if (type === "Speculative") strokeDasharray = "4,4";
  if (type === "Improvement") strokeDasharray = "8,4";

  return (
    <g>
      <path
        d={path}
        stroke={engineeringBlue}
        strokeWidth={2}
        fill="none"
        strokeDasharray={strokeDasharray}
        opacity={0.8}
      />
      <path d={arrowPath} fill={engineeringBlue} opacity={0.8} />
      {/* Type label */}
      <text
        x={midX}
        y={(fromY + toY) / 2 - 8}
        textAnchor="middle"
        className="text-[9px] fill-gray-500 font-mono"
      >
        {type}
      </text>
    </g>
  );
};

export default function MiniTreePage() {
  const [data, setData] = useState<TechData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTech, setSelectedTech] = useState<TechNode | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    fetch("/api/inventions")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load data:", err);
        setLoading(false);
      });
  }, []);

  // Filter nodes for search
  const filteredNodes = useMemo(() => {
    if (!data || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return data.nodes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.subtitle?.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [data, searchQuery]);

  // Get predecessors and successors
  const { predecessors, successors } = useMemo(() => {
    if (!data || !selectedTech) return { predecessors: [], successors: [] };

    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    // Predecessors: links where selectedTech is the target
    const predLinks = data.links.filter((l) => l.target === selectedTech.id);
    const predecessors = predLinks
      .map((l) => ({ node: nodeMap.get(l.source)!, link: l }))
      .filter((p) => p.node);

    // Successors: links where selectedTech is the source
    const succLinks = data.links.filter((l) => l.source === selectedTech.id);
    const successors = succLinks
      .map((l) => ({ node: nodeMap.get(l.target)!, link: l }))
      .filter((s) => s.node);

    return { predecessors, successors };
  }, [data, selectedTech]);

  // Calculate positions for layout
  const layout = useMemo(() => {
    if (!selectedTech) return { center: { x: 0, y: 0 }, preds: [], succs: [] };

    const containerWidth = 1000;
    const containerHeight = 600;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const predCount = predecessors.length;
    const succCount = successors.length;

    // Position predecessors on the left
    const predSpacing = Math.min(180, (containerHeight - 100) / Math.max(predCount, 1));
    const predStartY = centerY - ((predCount - 1) * predSpacing) / 2;
    const preds = predecessors.map((p, i) => ({
      ...p,
      x: centerX - 280,
      y: predStartY + i * predSpacing,
    }));

    // Position successors on the right
    const succSpacing = Math.min(180, (containerHeight - 100) / Math.max(succCount, 1));
    const succStartY = centerY - ((succCount - 1) * succSpacing) / 2;
    const succs = successors.map((s, i) => ({
      ...s,
      x: centerX + 280,
      y: succStartY + i * succSpacing,
    }));

    return {
      center: { x: centerX, y: centerY },
      preds,
      succs,
    };
  }, [selectedTech, predecessors, successors]);

  const handleSelectTech = (node: TechNode) => {
    setSelectedTech(node);
    setSearchQuery(node.title);
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff8f3] flex items-center justify-center">
        <div className="text-xl font-mono">Loading tech tree data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f3] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mini Tech Tree Generator</h1>
          <p className="text-gray-600 font-mono text-sm">
            Select a technology to see its immediate predecessors and successors
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search for a technology..."
            className="w-full px-4 py-3 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          {showDropdown && filteredNodes.length > 0 && (
            <div className="absolute z-50 w-full bg-white border-2 border-black border-t-0 max-h-80 overflow-y-auto">
              {filteredNodes.map((node) => (
                <div
                  key={node.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                  onClick={() => handleSelectTech(node)}
                >
                  <div className="font-bold text-sm">{node.title}</div>
                  <div className="text-xs text-gray-500 font-mono">
                    {node.year < 0 ? `${Math.abs(node.year)} BCE` : node.year} -{" "}
                    {node.fields.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {selectedTech && (
          <div className="mb-4 font-mono text-sm text-gray-600">
            <span className="mr-6">
              <strong>{predecessors.length}</strong> predecessors
            </span>
            <span>
              <strong>{successors.length}</strong> successors
            </span>
          </div>
        )}

        {/* Mini Tree Visualization */}
        <div
          ref={containerRef}
          className="relative bg-white border-2 border-black overflow-hidden"
          style={{ width: 1000, height: 600 }}
          onClick={() => setShowDropdown(false)}
        >
          {!selectedTech ? (
            <div className="flex items-center justify-center h-full text-gray-400 font-mono">
              Search and select a technology to visualize
            </div>
          ) : (
            <>
              {/* SVG for connections */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={1000}
                height={600}
              >
                {/* Predecessor connections */}
                {layout.preds.map((p, i) => (
                  <ConnectionLine
                    key={`pred-${i}`}
                    fromX={p.x + 80}
                    fromY={p.y}
                    toX={layout.center.x - 80}
                    toY={layout.center.y}
                    type={p.link.type}
                    isIncoming={true}
                  />
                ))}
                {/* Successor connections */}
                {layout.succs.map((s, i) => (
                  <ConnectionLine
                    key={`succ-${i}`}
                    fromX={layout.center.x + 80}
                    fromY={layout.center.y}
                    toX={s.x - 80}
                    toY={s.y}
                    type={s.link.type}
                    isIncoming={false}
                  />
                ))}
              </svg>

              {/* Nodes */}
              {/* Predecessors */}
              {layout.preds.map((p, i) => (
                <MiniNode
                  key={`pred-node-${i}`}
                  node={p.node}
                  x={p.x}
                  y={p.y}
                  isCenter={false}
                  onClick={() => handleSelectTech(p.node)}
                />
              ))}

              {/* Center node */}
              <MiniNode
                node={selectedTech}
                x={layout.center.x}
                y={layout.center.y}
                isCenter={true}
                onClick={() => {}}
              />

              {/* Successors */}
              {layout.succs.map((s, i) => (
                <MiniNode
                  key={`succ-node-${i}`}
                  node={s.node}
                  x={s.x}
                  y={s.y}
                  isCenter={false}
                  onClick={() => handleSelectTech(s.node)}
                />
              ))}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-6 font-mono text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#91B4C5]"></div>
            <span>Prerequisite</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-[#91B4C5]"
              style={{ backgroundImage: "repeating-linear-gradient(90deg, #91B4C5 0, #91B4C5 8px, transparent 8px, transparent 12px)" }}
            ></div>
            <span>Improvement</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-[#91B4C5]"
              style={{ backgroundImage: "repeating-linear-gradient(90deg, #91B4C5 0, #91B4C5 4px, transparent 4px, transparent 8px)" }}
            ></div>
            <span>Speculative</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 font-mono text-sm">
          <p className="font-bold mb-2">How to use:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Search for any technology in the search box</li>
            <li>Click on a technology to select it</li>
            <li>Click on any predecessor or successor to navigate to it</li>
            <li>Predecessors appear on the left, successors on the right</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
