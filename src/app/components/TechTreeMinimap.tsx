import React, { useEffect, useRef, useState } from 'react';

const TechTreeMinimap = ({
  nodes,
  containerWidth,
  totalHeight,
  viewportWidth,
  viewportHeight,
  scrollLeft,
  scrollTop,
  zoom,
  onViewportChange
}) => {
  const MINIMAP_HEIGHT = 48;
  const engineeringBlue = "#91B4C5";
  const minimapRef = useRef(null);
  const isDragging = useRef(false);
  const [scale, setScale] = useState(1);
  
  // Calculate scaling factors without zoom for the minimap layout
  useEffect(() => {
    const horizontalScale = viewportWidth / containerWidth;
    const verticalScale = MINIMAP_HEIGHT / totalHeight;
    setScale(Math.min(horizontalScale, verticalScale));
  }, [containerWidth, totalHeight, viewportWidth, viewportHeight]);

  // Calculate minimap viewport dimensions
  // First calculate the base width based on our scale
  const baseWidth = viewportWidth * scale;
  
  // Calculate height to maintain viewport's aspect ratio
  const aspectRatio = viewportWidth / viewportHeight;
  
  const minimapViewport = {
    width: baseWidth,
    height: baseWidth / aspectRatio, // This maintains the true aspect ratio
    x: scrollLeft * scale,
    y: scrollTop * scale
  };

  const handleMinimapClick = (e) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Get target position for the center of the viewport
    const targetX = (x / scale) - (viewportWidth / 2);
    const targetY = (y / scale) - (viewportHeight / 2);
    
    requestAnimationFrame(() => {
      onViewportChange(
        Math.max(0, targetX),
        Math.max(0, targetY)
      );
    });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    
    // Calculate target scroll position without zoom factor
    const x = (e.clientX - rect.left) / scale - (viewportWidth / 2);
    const y = (e.clientY - rect.top) / scale - (viewportHeight / 2);
    
    requestAnimationFrame(() => {
      onViewportChange(
        Math.max(0, x),
        Math.max(0, y)
      );
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 overflow-hidden bg-yellow-50" style={{ height: MINIMAP_HEIGHT }}>
      <div 
        ref={minimapRef}
        className="relative w-full h-full cursor-pointer"
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
                width: '2px',
                height: '2px',
                backgroundColor: engineeringBlue,
                opacity: 0.5,
                left: nodeX,
                top: nodeY,
                transform: 'translate(-50%, -50%)'
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
            boxShadow: `0 0 0 1px ${engineeringBlue}40`
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
};

export default TechTreeMinimap;