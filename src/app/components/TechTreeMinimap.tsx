import React, { useEffect, useRef, useState } from "react";

const TechTreeMinimap = ({
  nodes,
  containerWidth,
  totalHeight,
  viewportWidth,
  viewportHeight,
  scrollLeft,
  scrollTop,
  zoom,
  onViewportChange,
}) => {
  const MINIMAP_HEIGHT = 48; // Reduced height
  const engineeringBlue = "#91B4C5"; // Engineering paper blue color
  const minimapRef = useRef(null);
  const isDragging = useRef(false);
  const [scale, setScale] = useState(1);

  // Calculate scaling factors
  useEffect(() => {
    const horizontalScale = viewportWidth / containerWidth;
    const verticalScale = MINIMAP_HEIGHT / totalHeight;
    setScale(Math.min(horizontalScale, verticalScale));
  }, [containerWidth, totalHeight, viewportWidth]);

  // Calculate viewport rectangle dimensions
  const viewportRect = {
    width: (viewportWidth / zoom) * scale,
    height: (viewportHeight / zoom) * scale,
    x: scrollLeft * scale,
    y: scrollTop * scale,
  };

  const handleMinimapClick = (e) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Center the viewport on the clicked point
    const centerX = x - viewportRect.width / 2;
    const centerY = y - viewportRect.height / 2;

    onViewportChange(
      Math.max(0, centerX / scale),
      Math.max(0, centerY / scale)
    );
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
    const x = Math.max(
      0,
      Math.min(e.clientX - rect.left, viewportWidth - viewportRect.width)
    );
    const y = Math.max(
      0,
      Math.min(e.clientY - rect.top, MINIMAP_HEIGHT - viewportRect.height)
    );
    onViewportChange(x / scale, y / scale);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className="sticky bottom-0 left-0 right-0 overflow-hidden"
      style={{ height: MINIMAP_HEIGHT }}
    >
      <div className="absolute inset-0 bg-yellow-50" />

      {/* Minimap content container */}
      <div
        ref={minimapRef}
        className="sticky left-0 w-full h-full cursor-pointer"
        onClick={handleMinimapClick}
        style={{
          width: viewportWidth,
        }}
      >
        {/* Node dots */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute rounded-full"
            style={{
              width: "2px",
              height: "2px",
              backgroundColor: engineeringBlue,
              opacity: 0.5,
              left: node.x * scale,
              top: node.y * scale,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Viewport rectangle */}
        <div
          className="absolute cursor-move"
          style={{
            width: viewportRect.width,
            height: viewportRect.height,
            left: viewportRect.x,
            top: viewportRect.y,
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
