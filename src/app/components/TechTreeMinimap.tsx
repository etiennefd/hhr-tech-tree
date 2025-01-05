import React, { useEffect, useRef, useState } from "react";

interface TechTreeMinimapProps {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    year: number;
  }>;
  containerWidth: number;
  totalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollLeft: number;
  scrollTop: number;
  onViewportChange: (x: number, y: number) => void;
  filteredNodeIds: Set<string>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedConnectionNodeIds?: Set<string>;
}

const TechTreeMinimap = ({
  nodes,
  containerWidth,
  totalHeight,
  viewportWidth,
  viewportHeight,
  scrollLeft,
  scrollTop,
  onViewportChange,
  filteredNodeIds,
  selectedNodeId,
  hoveredNodeId,
  selectedConnectionNodeIds = new Set(),
}: TechTreeMinimapProps) => {
  const MINIMAP_HEIGHT = 64; // Increased total height
  const MINIMAP_CONTENT_HEIGHT = 48; // Original height for the node content
  const LABEL_HEIGHT = 10; // Space for labels
  const engineeringBlue = "#91B4C5";
  const minimapRef = useRef(null);
  const isDragging = useRef(false);
  const [scale, setScale] = useState(1);

  // Key years to display
  const keyYears = [
    -100000, // Early human history
    -10000,
    -1000,
    0,
    500,
    1000,
    1500,
    1750,
    1800,
    1850,
    1900,
    1950,
    2000,
  ];

  // Calculate scaling factors for the minimap layout
  useEffect(() => {
    const horizontalScale = viewportWidth / containerWidth;
    const verticalScale = MINIMAP_CONTENT_HEIGHT / totalHeight;
    setScale(Math.min(horizontalScale, verticalScale));
  }, [containerWidth, totalHeight, viewportWidth, viewportHeight]);

  // Calculate minimap viewport dimensions
  const baseWidth = viewportWidth * scale;
  const aspectRatio = viewportWidth / viewportHeight;

  const minimapViewport = {
    width: baseWidth,
    height: baseWidth / aspectRatio,
    x: scrollLeft * scale,
    y: scrollTop * scale,
  };
  // Format year label
  const formatYear = (year: number) => {
    if (year === 0) return "1";
    if (year < 0) return `${Math.abs(year)} BCE`;
    return `${year}`;
  };
  // Calculate x position for a year
  const getXPosition = (year: number) => {
    if (!nodes.length) return 0;
    const nearestNode = nodes.reduce((prev, curr) => {
      return Math.abs(curr.year - year) < Math.abs(prev.year - year)
        ? curr
        : prev;
    });
    return nearestNode.x * scale;
  };

  const handleMinimapClick = (e: React.MouseEvent) => {
    if (!minimapRef.current) return;
    const rect = (minimapRef.current as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const targetX = x / scale - viewportWidth / 2;
    const targetY = y / scale - viewportHeight / 2;

    requestAnimationFrame(() => {
      onViewportChange(Math.max(0, targetX), Math.max(0, targetY));
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove as EventListener);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !minimapRef.current) return;
    const rect = (minimapRef.current as HTMLDivElement).getBoundingClientRect();

    const x = (e.clientX - rect.left) / scale - viewportWidth / 2;
    const y =
      (e.clientY - rect.top - LABEL_HEIGHT) / scale - viewportHeight / 2;

    requestAnimationFrame(() => {
      onViewportChange(Math.max(0, x), Math.max(0, y));
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className="sticky bottom-0 left-0 right-0 overflow-hidden bg-yellow-50"
      style={{ height: MINIMAP_HEIGHT, zIndex: 1000 }}
    >
      {/* Year labels */}
      <div
        className="w-full"
        style={{ height: LABEL_HEIGHT, paddingTop: "2px" }}
      >
        {keyYears.map((year) => (
          <div
            key={year}
            className="absolute"
            style={{
              left: getXPosition(year),
              transform: "translateX(-50%)",
              fontSize: "7px",
              lineHeight: "1",
              color: engineeringBlue,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              whiteSpace: "nowrap",
              fontWeight: "600",
              opacity: 1,
              pointerEvents: "none",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            {formatYear(year)}
          </div>
        ))}
      </div>

      {/* Minimap content */}
      <div
        ref={minimapRef}
        className="relative w-full cursor-pointer"
        style={{ height: MINIMAP_CONTENT_HEIGHT }}
        onClick={handleMinimapClick}
      >
        {/* Node dots */}
        {nodes.map((node) => {
          const nodeX = node.x * scale;
          const nodeY = node.y * scale;
          const hasActiveFilters = filteredNodeIds.size > 0;
          const isFiltered = hasActiveFilters && filteredNodeIds.has(node.id);
          const isSelected = node.id === selectedNodeId || selectedConnectionNodeIds.has(node.id);
          const isHovered = node.id === hoveredNodeId;

          return (
            <div
              key={node.id}
              className="absolute rounded-full"
              style={{
                width: isSelected || isFiltered ? "4px" : "2px",
                height: isSelected || isFiltered ? "4px" : "2px",
                backgroundColor: engineeringBlue,
                opacity: hasActiveFilters
                  ? isFiltered
                    ? 0.9
                    : 0.2
                  : isSelected
                  ? 0.9
                  : isHovered
                  ? 0.8
                  : 0.6,
                left: nodeX,
                top: nodeY,
                transform: "translate(-50%, -50%)",
                zIndex: isSelected ? 2 : 1,
              }}
            />
          );
        })}

        {/* Viewport rectangle */}
        <div
          className="absolute cursor-move"
          style={{
            width: minimapViewport.width,
            height: minimapViewport.height,
            left: minimapViewport.x,
            top: minimapViewport.y,
            border: `1px solid ${engineeringBlue}`,
            backgroundColor: `${engineeringBlue}20`,
            boxShadow: `0 0 0 1px ${engineeringBlue}40`,
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
};

export default TechTreeMinimap;
