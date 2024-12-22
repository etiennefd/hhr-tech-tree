import React, { useEffect, useRef, useState } from "react";

const TechTreeMinimap = ({
  nodes,
  containerWidth,
  totalHeight,
  viewportWidth,
  viewportHeight,
  scrollLeft,
  scrollTop,
  onViewportChange,
}) => {
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

  // Calculate scaling factors without zoom for the minimap layout
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
  const formatYear = (year) => {
    if (year === 0) return "1";
    if (year < 0) return `${Math.abs(year)} BCE`;
    if (year < 1000) return `${year}`;
    return `${year}`;
  };

  // Calculate x position for a year
  const getXPosition = (year) => {
    if (!nodes.length) return 0;
    const nearestNode = nodes.reduce((prev, curr) => {
      return Math.abs(curr.year - year) < Math.abs(prev.year - year)
        ? curr
        : prev;
    });
    return nearestNode.x * scale;
  };

  const handleMinimapClick = (e) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - LABEL_HEIGHT; // Adjust for label space

    const targetX = x / scale - viewportWidth / 2;
    const targetY = y / scale - viewportHeight / 2;

    requestAnimationFrame(() => {
      onViewportChange(Math.max(0, targetX), Math.max(0, targetY));
    });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();

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
      style={{ height: MINIMAP_HEIGHT }}
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
              fontSize: "6px",
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
          return (
            <div
              key={node.id}
              className="absolute rounded-full"
              style={{
                width: "2px",
                height: "2px",
                backgroundColor: engineeringBlue,
                opacity: 0.5,
                left: nodeX,
                top: nodeY,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })}

        {/* Viewport rectangle */}
        <div
          className="absolute cursor-move"
          style={{
            width: Math.max(20, minimapViewport.width),
            height: Math.max(20, minimapViewport.height),
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
