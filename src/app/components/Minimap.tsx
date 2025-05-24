import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

// Define the threshold here as well
const SMALL_SCREEN_WIDTH_THRESHOLD = 640;

interface TechTreeMinimapProps {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    year: number;
  }>;
  containerWidth: number;
  parentContainerWidth: number;
  totalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollLeft: number;
  scrollTop: number;
  onViewportChange: (x: number, y: number) => void;
  filteredNodeIds: Set<string>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  selectedConnectionNodeIds: Set<string>;
  adjacentNodeIds?: Set<string>;
  highlightedAncestors: Set<string>;
  highlightedDescendants: Set<string>;
}

const TechTreeMinimap = ({
  nodes,
  containerWidth,
  parentContainerWidth,
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
  adjacentNodeIds = new Set(),
  highlightedAncestors = new Set(),
  highlightedDescendants = new Set(),
}: TechTreeMinimapProps) => {
  // Calculate if the screen is small based on the passed parent width
  const isSmallScreen = useMemo(() => {
    return parentContainerWidth > 0 && parentContainerWidth < SMALL_SCREEN_WIDTH_THRESHOLD;
  }, [parentContainerWidth]);

  const MINIMAP_HEIGHT = isSmallScreen ? 96 : 64; // Increased total height for small screens
  const MINIMAP_CONTENT_HEIGHT = 48; // Height of the minimap content area
  const LABEL_HEIGHT = 10; // Space for labels
  const SMALL_SCREEN_MINIMAP_VERTICAL_SCALE = 2; // How much more vertically compressed the minimap is on small screens
  const engineeringBlue = "#91B4C5";
  const minimapRef = useRef(null);
  const isDragging = useRef(false);
  const [scale, setScale] = useState(1);

  // Key years to display (original list)
  const originalKeyYears = [
    -100000, -10000, -1000, 0, 500, 1000, 1500,
    1750, 1800, 1850, 1900, 1950, 2000,
  ];

  // Filter key years based on screen size
  const keyYears = useMemo(() => {
    if (isSmallScreen) {
      return originalKeyYears.filter(year => year !== 1000);
    }
    return originalKeyYears;
  }, [isSmallScreen]);

  // Calculate scaling factors for the minimap layout
  useEffect(() => {
    if (!minimapRef.current) return;
    
    const minimapRect = (minimapRef.current as HTMLDivElement).getBoundingClientRect();
    // Use the actual available width instead of viewport width
    const availableWidth = minimapRect.width;
    
    // Calculate scale based on actual available space
    const horizontalScale = availableWidth / containerWidth;
    // Scale vertically more on small screens
    const verticalScale = isSmallScreen ? SMALL_SCREEN_MINIMAP_VERTICAL_SCALE : 1;
    setScale(Math.min(horizontalScale, verticalScale));
  }, [containerWidth, totalHeight, viewportWidth, viewportHeight, isSmallScreen]);

  // Calculate minimap viewport dimensions
  const baseWidth = viewportWidth * scale;
  const aspectRatio = viewportWidth / viewportHeight;
  const verticalScale = isSmallScreen ? SMALL_SCREEN_MINIMAP_VERTICAL_SCALE : 1;

  const minimapViewport = {
    width: baseWidth,
    height: (baseWidth / aspectRatio) / verticalScale,
    x: scrollLeft * scale,
    y: scrollTop * scale * verticalScale,
  };

  // Format year label with small screen logic
  const formatYear = useCallback((year: number) => {
    if (year === 0) return "1"; // Year 0 doesn't exist
    const absYear = Math.abs(year);
    if (year < 0) {
      return isSmallScreen ? `-${absYear}` : `${absYear} BCE`;
    }
    return `${year}`;
  }, [isSmallScreen]);

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
    e.stopPropagation();
    
    if (!minimapRef.current) return;
    
    const rect = (minimapRef.current as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const targetX = x / scale - viewportWidth / 2;
    const targetY = y / (scale * verticalScale) - viewportHeight / 2;

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
    const y = (e.clientY - rect.top) / (scale * verticalScale) - viewportHeight / 2;

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
      className="sticky bottom-0 left-0 right-0 overflow-hidden bg-yellow-50 minimap"
      style={{ 
        height: MINIMAP_HEIGHT, 
        zIndex: 1000,
        position: 'relative'
      }}
      onClick={(e) => e.stopPropagation()}
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
          const nodeY = node.y * scale * verticalScale;
          const hasActiveFilters = filteredNodeIds.size > 0;
          const isFiltered = hasActiveFilters && filteredNodeIds.has(node.id);
          const isSelected = node.id === selectedNodeId || selectedConnectionNodeIds.has(node.id);
          const isAdjacent = adjacentNodeIds.has(node.id);
          const isAncestor = highlightedAncestors.has(node.id);
          const isDescendant = highlightedDescendants.has(node.id);
          const isHovered = node.id === hoveredNodeId;

          return (
            <div
              key={node.id}
              className="absolute rounded-full"
              style={{
                width: isSelected || isFiltered || isAdjacent || isAncestor || isDescendant ? "4px" : "2px",
                height: isSelected || isFiltered || isAdjacent || isAncestor || isDescendant ? "4px" : "2px",
                backgroundColor: engineeringBlue,
                opacity: hasActiveFilters
                  ? isFiltered
                    ? 0.9
                    : 0.2
                  : isSelected
                  ? 0.9
                  : isAncestor
                  ? 0.8
                  : isDescendant
                  ? 0.8
                  : isAdjacent
                  ? 0.7
                  : isHovered
                  ? 0.6
                  : 0.4,
                left: nodeX,
                top: nodeY,
                transform: "translate(-50%, -50%)",
                zIndex: isSelected ? 3 : isAncestor || isDescendant ? 2 : isAdjacent ? 1 : 0,
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
