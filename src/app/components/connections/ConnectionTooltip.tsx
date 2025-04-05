import React, { useEffect, useState, useRef } from "react";

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
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const positionRef = useRef<{ left: number; top: number } | null>(null);
  const firstPositionForSelectedRef = useRef<{ left: number; top: number } | null>(null);
  const hasLoggedInitialPosition = useRef(false);
  
  // Update position when coordinates change
  useEffect(() => {
    // Skip updates if coordinates are at the origin (likely default values)
    // UNLESS this is a selected tooltip that already has a position saved
    if (x === 0 && y === 0) {
      if (isSelected && firstPositionForSelectedRef.current) {
        setPosition(firstPositionForSelectedRef.current);
        return;
      }
      
      // Use any previously calculated position if available
      if (positionRef.current) {
        setPosition(positionRef.current);
        return;
      }
      
      // If we have no position at all, don't render
      return;
    }
    
    // If selected and we already have a position saved, keep using it
    if (isSelected && firstPositionForSelectedRef.current) {
      setPosition(firstPositionForSelectedRef.current);
      return;
    }
    
    // Convert SVG coordinates to screen coordinates if needed
    let screenX = x;
    let screenY = y;
    
    if (isSelected) {
      // For selected tooltips, coordinates are already in screen space
      // so no conversion needed
    } else {
      // For hover tooltips, coordinates are already in screen space
      // from the mouse event in CurvedConnections
    }
    
    // Check if near screen edges
    const isNearRightEdge = screenX > window.innerWidth - 300;
    const isNearBottomEdge = screenY > window.innerHeight - 150;
    
    const newPosition = {
      left: isNearRightEdge ? screenX - 274 : screenX + 10,
      top: isNearBottomEdge ? screenY - 100 : screenY + 10
    };
    
    if (!hasLoggedInitialPosition.current) {
      console.log(`[Tooltip] Initial position set to ${newPosition.left},${newPosition.top}`);
      hasLoggedInitialPosition.current = true;
    }
    
    setPosition(newPosition);
    positionRef.current = newPosition;
    
    // If this is a newly selected tooltip, save the first position
    if (isSelected && !firstPositionForSelectedRef.current) {
      console.log(`[Tooltip] Saving position for selected tooltip: ${newPosition.left},${newPosition.top}`);
      firstPositionForSelectedRef.current = newPosition;
    }
  }, [x, y, isSelected]);
  
  // When selection state changes, handle position persistence
  useEffect(() => {
    if (!isSelected) {
      // Clear the saved position when deselected
      firstPositionForSelectedRef.current = null;
      hasLoggedInitialPosition.current = false;
    } else if (position && !firstPositionForSelectedRef.current) {
      // If becoming selected and we have a position, save it
      console.log(`[Tooltip] Selection state changed to selected, saving position`);
      firstPositionForSelectedRef.current = position;
    }
  }, [isSelected, position]);

  const handleNodeClick = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`[Tooltip] Node "${title}" clicked`);
    if (onNodeClick) {
      onNodeClick(title);
    }
  };

  const handleNodeHover = (title: string) => {
    if (onNodeHover) {
      onNodeHover(title);
    }
  };

  // If we have no position, don't render anything
  if (!position) {
    // For selected tooltips, never use a default position - rely on the position from CurvedConnections
    return null;
  }

  return (
    <div
      className="fixed bg-white border rounded-lg p-3 shadow-lg w-64 z-50"
      style={{
        left: position.left,
        top: position.top,
        pointerEvents: "all",
      }}
      onClick={(e) => {
        console.log(`[Tooltip] Clicked`);
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <p className="text-xs mb-1.5">{renderConnectionContent()}</p>
      {details && (
        <p className="text-xs text-gray-600 border-t pt-1.5 mt-1.5">
          {details}
        </p>
      )}
    </div>
  );

  function renderConnectionContent() {
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
  }
};

export default ConnectionTooltip;
