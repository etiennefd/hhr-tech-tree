import React, { useEffect, useState } from "react";

interface ConnectionTooltipProps {
  x: number;
  y: number;
  sourceTitle: string;
  targetTitle: string;
  type: string;
  details?: string;
  isSelected?: boolean;
  onNodeClick?: (title: string) => void;
  onNodeHover?: (title: string) => void;
}

const ConnectionTooltip: React.FC<ConnectionTooltipProps> = ({
  x,
  y,
  sourceTitle,
  targetTitle,
  type,
  details,
  isSelected,
  onNodeClick,
  onNodeHover,
}) => {
  const [position, setPosition] = useState({ left: 0, top: 0 });
  
  // Update position when coordinates change
  useEffect(() => {
    // Convert SVG coordinates to screen coordinates if needed
    let screenX = x;
    let screenY = y;
    
    if (isSelected) {
      // Convert SVG coordinates to screen coordinates
      // Get the SVG element's bounding box
      const svgElement = document.querySelector('svg');
      if (svgElement) {
        const svgRect = svgElement.getBoundingClientRect();
        // Add the SVG's position to the relative coordinates
        screenX = x + svgRect.left;
        screenY = y + svgRect.top;
      }
    }
    
    // Check if near screen edges
    const isNearRightEdge = screenX > window.innerWidth - 300;
    const isNearBottomEdge = screenY > window.innerHeight - 150;
    
    setPosition({
      left: isNearRightEdge ? screenX - 274 : screenX + 10,
      top: isNearBottomEdge ? screenY - 100 : screenY + 10
    });
  }, [x, y, isSelected]);

  const handleNodeClick = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick(title);
    }
  };

  const handleNodeHover = (title: string) => {
    if (onNodeHover) {
      onNodeHover(title);
    }
  };

  const renderConnectionContent = () => {
    const Source = (
      <button
        onClick={(e) => handleNodeClick(e, sourceTitle)}
        onMouseEnter={() => handleNodeHover(sourceTitle)}
        className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
        type="button"
      >
        {sourceTitle}
      </button>
    );

    const Target = (
      <button
        onClick={(e) => handleNodeClick(e, targetTitle)}
        onMouseEnter={() => handleNodeHover(targetTitle)}
        className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
        type="button"
      >
        {targetTitle}
      </button>
    );

    switch (type) {
      case "Independently invented":
        return (
          <>
            {Source} and {Target} were independently invented
          </>
        );
      case "Concurrent development":
        return (
          <>
            {Source} and {Target} were developed concurrently
          </>
        );
      case "Inspiration":
        return (
          <>
            {Source} inspired {Target}
          </>
        );
      case "Obsolescence":
        return (
          <>
            {Source} was replaced by {Target}
          </>
        );
      case "Speculative":
        return (
          <>
            {Source} may have led to {Target}
          </>
        );
      case "Link plausible but unclear":
        return (
          <>
            {Source} may have led to {Target} (to be confirmed)
          </>
        );
      default:
        return (
          <>
            {Source} led to {Target}
          </>
        );
    }
  };

  return (
    <div
      className="fixed bg-white border rounded-lg p-3 shadow-lg w-64 z-50"
      style={{
        left: position.left,
        top: position.top,
        pointerEvents: "all",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs mb-1.5">{renderConnectionContent()}</p>
      {details && (
        <p className="text-xs text-gray-600 border-t pt-1.5 mt-1.5">
          {details}
        </p>
      )}
    </div>
  );
};

export default ConnectionTooltip;
