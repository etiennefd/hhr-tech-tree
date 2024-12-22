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
  const MINIMAP_HEIGHT = 80;
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
    onViewportChange(x / scale, y / scale);
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
    const x = Math.max(0, Math.min(e.clientX - rect.left, viewportWidth));
    const y = Math.max(0, Math.min(e.clientY - rect.top, MINIMAP_HEIGHT));
    onViewportChange(x / scale, y / scale);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 h-20 overflow-hidden">
      {/* Fixed backdrop */}
      <div className="absolute inset-0 bg-white/40 backdrop-blur border-t border-black" />

      {/* Minimap content container */}
      <div
        ref={minimapRef}
        className="sticky left-0 w-full h-full"
        onClick={handleMinimapClick}
        style={{
          width: viewportWidth, // Match viewport width
        }}
      >
        {/* Node dots */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute w-1 h-1 bg-blue-500/50"
            style={{
              left: node.x * scale,
              top: node.y * scale,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Viewport rectangle */}
        <div
          className="absolute border-2 border-blue-600/50 bg-blue-400/20 cursor-move"
          style={{
            width: viewportRect.width,
            height: viewportRect.height,
            left: viewportRect.x,
            top: viewportRect.y,
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
};

export default TechTreeMinimap;
