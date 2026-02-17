import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import ConnectionTooltip from "./ConnectionTooltip";

// Add type declaration for window property
declare global {
  interface Window {
    lastConnectionClickPos?: { x: number; y: number };
  }
}

// Create a static map to store positions by connection
const connectionPositions = new Map<string, { x: number; y: number }>();
// Track the last tooltip display state to prevent flickering during selection
let lastTooltipVisible = false;
// Track the last selected connection key to manage position clearing
let lastSelectedConnectionKey: string | null = null;

interface NodePosition {
  x: number;
  y: number;
}

export type ConnectionType =
  | "Prerequisite"
  | "Improvement"
  | "Speculative"
  | "Inspiration"
  | "Component"
  | "Independently invented"
  | "Link plausible but unclear"
  | "Concurrent development"
  | "Obsolescence"
  | "default";

interface CurvedConnectionsProps {
  sourceNode: NodePosition;
  targetNode: NodePosition;
  connectionType?: ConnectionType;
  isHighlighted?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  sourceTitle: string;
  targetTitle: string;
  details?: string;
  opacity?: number;
  onSelect?: () => void;
  isSelected?: boolean;
  onNodeClick: (title: string) => void;
  onNodeHover?: (title: string) => void;
  sourceIndex: number;
  targetIndex: number;
  zoomLevel?: number;
}

const CurvedConnections: React.FC<CurvedConnectionsProps> = ({
  sourceNode,
  targetNode,
  connectionType = "default",
  isHighlighted = false,
  onMouseEnter,
  onMouseLeave,
  sourceTitle,
  targetTitle,
  details,
  opacity = 1,
  onSelect,
  isSelected = false,
  onNodeClick,
  onNodeHover,
  sourceIndex,
  targetIndex,
  zoomLevel = 1,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  // Add a transitioning state to prevent flickering
  const [isTransitioningToSelected, setIsTransitioningToSelected] = useState(false);
  
  // Create a unique key for this connection
  const connectionKey = `${sourceTitle}_${targetTitle}`;
  
  // Handle click event
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPos = { x: e.clientX, y: e.clientY };
    
    // If this is a different connection than last selected, clear other positions
    if (lastSelectedConnectionKey && lastSelectedConnectionKey !== connectionKey) {
      // Keep only this connection's position
      const currentPos = connectionPositions.get(connectionKey);
      connectionPositions.clear();
      if (currentPos) {
        connectionPositions.set(connectionKey, currentPos);
      }
    }
    
    // Store the position in the static map
    connectionPositions.set(connectionKey, newPos);
    
    // Update last selected connection
    lastSelectedConnectionKey = connectionKey;
    
    // Also store in window for absolute persistence
    window.lastConnectionClickPos = newPos;
    
    // Set transition state to prevent flickering
    setIsTransitioningToSelected(true);
    
    if (!isSelected) {
      onSelect?.();
    }
  };

  const getControlPoints = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    isSameYear: boolean
  ) => {
    const deltaX = x2 - x1;

    if (isSameYear) {
      // For same-year connections, create an S-curve that goes out to the right
      // and curves back as if coming from the left
      const horizontalOffset = 200; // Distance the curve extends to the right
      return {
        // First control point: curves out to the right and slightly up/down
        cx1: x1 + horizontalOffset,
        cy1: y1 - Math.sign(y1 - y2) * 50,
        // Second control point: approaches from the left of the target
        cx2: x2 - horizontalOffset,
        cy2: y2 - Math.sign(y2 - y1) * 50,
      };
    }

    // Regular connections remain the same
    const controlPointOffset = Math.min(Math.abs(deltaX) * 0.5, 200);
    return {
      cx1: x1 + controlPointOffset,
      cy1: y1,
      cx2: x2 - controlPointOffset,
      cy2: y2,
    };
  };

  const getAdjustedEndpoint = (
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    isSource: boolean,
    nodeWidth = 160
  ) => {
    const halfNodeWidth = nodeWidth / 2;
    const isSameYear = Math.abs(sourceX - targetX) < nodeWidth;

    // For same-year connections, always exit right from source and enter left on target
    if (isSameYear) {
      if (isSource) {
        return {
          x: sourceX + halfNodeWidth, // Exit from right side
          y: sourceY,
        };
      } else {
        return {
          x: targetX - halfNodeWidth, // Enter from left side
          y: targetY,
        };
      }
    }

    // Non-same-year connections remain the same
    if (isSource) {
      const isLeftToRight = sourceX < targetX;
      return {
        x: sourceX + (isLeftToRight ? halfNodeWidth : -halfNodeWidth),
        y: sourceY,
      };
    } else {
      const isLeftToRight = sourceX < targetX;
      return {
        x: targetX + (isLeftToRight ? -halfNodeWidth : halfNodeWidth),
        y: targetY,
      };
    }
  };

  const getLineStyle = (type: ConnectionType, isActive: boolean) => {
    const engineeringBlue = "#91B4C5";

    const baseStyle = {
      stroke: engineeringBlue,
      strokeWidth: (isActive ? 2 : 1.5) * zoomLevel,
      strokeOpacity: isActive ? opacity : 0.7 * opacity,
    };

    switch (type) {
      case "Independently invented":
      case "Concurrent development":
        return {
          ...baseStyle,
          strokeDasharray: "10,4", // Long dashes for parallel development
        };
      case "Link plausible but unclear":
        return {
          ...baseStyle,
          strokeDasharray: "4,4", // Medium dashes for unclear links
        };
      case "Speculative":
        return {
          ...baseStyle,
          strokeDasharray: "2,4", // Short dashes, longer gaps for speculative connections
        };
      case "Obsolescence":
        return {
          ...baseStyle,
          strokeDasharray: "8,2,2,2", // Long dash, two dots for replacement
        };
      default:
        return baseStyle;
    }
  };

  const { x: x1, y: y1 } = sourceNode;
  const { x: x2, y: y2 } = targetNode;
  const scaledNodeWidth = 160 * zoomLevel;
  const isSameYear = Math.abs(x1 - x2) < scaledNodeWidth;

  const sourcePoint = getAdjustedEndpoint(x1, y1, x2, y2, true, scaledNodeWidth);
  const endPoint = getAdjustedEndpoint(x1, y1, x2, y2, false, scaledNodeWidth);

  // Get control points based on whether it's a same-year connection
  const { cx1, cy1, cx2, cy2 } = getControlPoints(
    sourcePoint.x,
    sourcePoint.y,
    endPoint.x,
    endPoint.y,
    isSameYear
  );

  // Arrowheads always point right
  const angle = 0;

  // First calculate the arrowhead base point (slightly before the endPoint)
  const arrowLength = 10 * zoomLevel;
  const arrowPoint1X = endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowPoint2X = endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowPoint1Y = endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowPoint2Y = endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6);

  // Calculate where the line should actually end (at the base of the arrow)
  const lineEndX = endPoint.x - (arrowLength / 2) * Math.cos(angle);
  const lineEndY = endPoint.y - (arrowLength / 2) * Math.sin(angle);

  const lineStyle = getLineStyle(connectionType, isHovered || isHighlighted);

  // Much simpler tooltip position logic
  const getTooltipPosition = () => {
    // If this connection was clicked before, use that position
    if (connectionPositions.has(connectionKey)) {
      const savedPos = connectionPositions.get(connectionKey);
      return savedPos!;
    }
    
    // For hover state, use current mouse position
    if (isHovered && !isSelected && mousePos) {
      return mousePos;
    }
    
    // For new selections with no saved position, use current mouse position
    if (mousePos) {
      return mousePos;
    }
    
    // Absolute last resort - use connection midpoint
    const midPoint = {
      x: (sourcePoint.x + endPoint.x) / 2,
      y: (sourcePoint.y + endPoint.y) / 2 - 20
    };
    return midPoint;
  };

  // Clear transition state when selection state changes
  useEffect(() => {
    if (isSelected) {
      // After selection completes, clear the transition state
      setIsTransitioningToSelected(false);
      // Update last selected connection to this one
      lastSelectedConnectionKey = connectionKey;
    }
  }, [isSelected, connectionKey]);

  return (
    <>
      <g
        className="connection"
        onMouseEnter={() => {
          setIsHovered(true);
          onMouseEnter?.();
        }}
        onMouseLeave={() => {
          if (!isSelected) {
            setIsHovered(false);
            onMouseLeave?.();
            // Only clear mouse position if we're not transitioning to selected
            if (!isTransitioningToSelected) {
              setMousePos(null);
            }
          }
        }}
        onClick={handleClick}
        onMouseMove={(e) => {
          if (!isSelected) {
            const pos = { x: e.clientX, y: e.clientY };
            setMousePos(pos);
          }
        }}
        style={{ pointerEvents: "all" }}
      >
        {/* Hit area - always present but with different sizes based on highlight status */}
        <path
          d={`M ${sourcePoint.x} ${sourcePoint.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPoint.x} ${endPoint.y}`}
          stroke="transparent"
          strokeWidth={isHighlighted ? 30 : 15} // Wider hit area for highlighted connections
          fill="none"
          style={{
            pointerEvents: "stroke",
            cursor: "pointer",
          }}
        />

        {/* Main connection line - no pointer events */}
        <path
          d={`M ${sourcePoint.x} ${sourcePoint.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${lineEndX} ${lineEndY}`}
          fill="none"
          {...lineStyle}
          style={{ pointerEvents: "none" }}
        />

        {/* Start marker (square) */}
        <rect
          x={sourcePoint.x - 3 * zoomLevel}
          y={sourcePoint.y - 3 * zoomLevel}
          width={6 * zoomLevel}
          height={6 * zoomLevel}
          fill={lineStyle.stroke}
          opacity={lineStyle.strokeOpacity}
          style={{ pointerEvents: "none" }}
        />

        {/* End marker - either square or arrow depending on type */}
        {["Independently invented", "Concurrent development"].includes(
          connectionType
        ) ? (
          <rect
            x={endPoint.x - 3 * zoomLevel}
            y={endPoint.y - 3 * zoomLevel}
            width={6 * zoomLevel}
            height={6 * zoomLevel}
            fill={lineStyle.stroke}
            opacity={lineStyle.strokeOpacity}
            style={{ pointerEvents: "none" }}
          />
        ) : (
          <path
            d={`M ${endPoint.x} ${endPoint.y} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`}
            fill={lineStyle.stroke}
            opacity={lineStyle.strokeOpacity}
            style={{ pointerEvents: "none" }}
          />
        )}
      </g>

      {/* Tooltip Portal */}
      {(() => {
        // Show tooltip if hovered, selected, or transitioning between states
        const shouldShowTooltip = isHovered || isSelected || isTransitioningToSelected;
        
        // Track visibility to help with debugging
        if (shouldShowTooltip !== lastTooltipVisible) {
          lastTooltipVisible = shouldShowTooltip;
        }
        
        if (!shouldShowTooltip) {
          return null;
        }
        
        const tooltipPos = getTooltipPosition();
        
        return (
          <Portal>
            <ConnectionTooltip
              x={tooltipPos.x}
              y={tooltipPos.y}
              sourceTitle={sourceTitle}
              targetTitle={targetTitle}
              type={connectionType}
              details={details}
              isSelected={isSelected}
              onNodeClick={(title) => {
                if (onNodeClick) {
                  onNodeClick(title);
                }
              }}
              onNodeHover={(title) => {
                if (onNodeHover) {
                  onNodeHover(title);
                }
              }}
            />
          </Portal>
        );
      })()}
    </>
  );
};

// Create a Portal component for the tooltip
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = React.useState(false);
  const portalRoot = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Create a div to mount the portal
    portalRoot.current = document.createElement("div");
    document.body.appendChild(portalRoot.current);
    setMounted(true);

    // Cleanup
    return () => {
      if (portalRoot.current) {
        document.body.removeChild(portalRoot.current);
      }
    };
  }, []);

  if (!mounted || !portalRoot.current) return null;

  return ReactDOM.createPortal(children, portalRoot.current);
};

export default CurvedConnections;

