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
  
  // Calculate scaling factors
  useEffect(() => {
    const horizontalScale = viewportWidth / (containerWidth / zoom);
    const verticalScale = MINIMAP_HEIGHT / (totalHeight / zoom);
    setScale(Math.min(horizontalScale, verticalScale));
  }, [containerWidth, totalHeight, viewportWidth, viewportHeight, zoom, scrollLeft, scrollTop]);

  // Calculate minimap viewport dimensions
  const minimapViewport = {
    width: (viewportWidth / zoom) * scale,
    height: (viewportHeight / zoom) * scale,
    x: (scrollLeft / zoom) * scale,
    y: (scrollTop / zoom) * scale
  };

  const handleMinimapClick = (e) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Get target position for the center of the viewport
    const targetX = (x / scale) * zoom - (viewportWidth / 2);
    const targetY = (y / scale) * zoom - (viewportHeight / 2);
    
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
    
    // Calculate target scroll position directly
    const x = (e.clientX - rect.left) / scale * zoom - (viewportWidth / 2);
    const y = (e.clientY - rect.top) / scale * zoom - (viewportHeight / 2);
    
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
    <div className="sticky bottom-0 left-0 right-0 overflow-hidden" style={{ height: MINIMAP_HEIGHT }}>
      {/* Solid yellow-50 background to match main diagram */}
      <div className="absolute inset-0 bg-yellow-50" />
      
      {/* Minimap content container */}
      <div 
        ref={minimapRef}
        className="sticky left-0 w-full h-full cursor-pointer"
        onClick={handleMinimapClick}
        style={{
          width: viewportWidth
        }}
      >
        {/* Node dots */}
        {nodes.map((node) => {
          const nodeX = (node.x / zoom) * scale;
          const nodeY = (node.y / zoom) * scale;
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