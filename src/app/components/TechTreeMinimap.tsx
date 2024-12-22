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
  const MINIMAP_HEIGHT = 80; // Reduced height
  const minimapRef = useRef(null);
  const isDragging = useRef(false);
  const [scale, setScale] = useState(1);

  // Calculate minimap width to match full viewport width
  const minimapWidth = viewportWidth;

  // Calculate scaling factors
  useEffect(() => {
    const horizontalScale = minimapWidth / containerWidth;
    const verticalScale = MINIMAP_HEIGHT / totalHeight;
    setScale(Math.min(horizontalScale, verticalScale));
  }, [containerWidth, totalHeight, minimapWidth]);

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

    // Convert click coordinates to scroll positions
    const newScrollLeft = x / scale;
    const newScrollTop = y / scale;

    onViewportChange(newScrollLeft, newScrollTop);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, minimapWidth));
    const y = Math.max(0, Math.min(e.clientY - rect.top, MINIMAP_HEIGHT));

    const newScrollLeft = x / scale;
    const newScrollTop = y / scale;

    onViewportChange(newScrollLeft, newScrollTop);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white/40 backdrop-blur border-t border-black"
      style={{
        height: MINIMAP_HEIGHT,
        zIndex: 1000,
      }}
    >
      <div
        ref={minimapRef}
        className="relative w-full h-full cursor-move"
        onClick={handleMinimapClick}
      >
        {/* Connection lines */}
        {nodes.map((node, index) => {
          const nextNode = nodes[index + 1];
          if (!nextNode) return null;
          return (
            <div
              key={`line-${node.id}-${nextNode.id}`}
              className="absolute bg-blue-400/30"
              style={{
                left: node.x * scale,
                top: node.y * scale,
                width: 1,
                height: 1,
              }}
            />
          );
        })}

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
          className="absolute border-2 border-blue-600/50 bg-blue-400/20"
          style={{
            width: viewportRect.width,
            height: viewportRect.height,
            left: viewportRect.x,
            top: viewportRect.y,
            cursor: "move",
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
};

export default TechTreeMinimap;
