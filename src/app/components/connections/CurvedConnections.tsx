import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import ConnectionTooltip from "./ConnectionTooltip";

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
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [selectedPos, setSelectedPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!isSelected) {
      setSelectedPos(null);
      setIsHovered(false);
      // Don't clear mousePos when deselecting
    }
  }, [isSelected]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPos = { x: e.clientX, y: e.clientY };
    setSelectedPos(newPos);
    setMousePos(newPos); // Save click position as mousePos too
    onSelect?.();
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
      strokeWidth: isActive ? 2 : 1.5,
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
  const isSameYear = Math.abs(x1 - x2) < 160; // Using NODE_WIDTH

  const sourcePoint = getAdjustedEndpoint(x1, y1, x2, y2, true);
  const endPoint = getAdjustedEndpoint(x1, y1, x2, y2, false);

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
  const arrowLength = 10;
  const arrowPoint1X = endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowPoint2X = endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowPoint1Y = endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowPoint2Y = endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6);

  // Calculate where the line should actually end (at the base of the arrow)
  const lineEndX = endPoint.x - (arrowLength / 2) * Math.cos(angle);
  const lineEndY = endPoint.y - (arrowLength / 2) * Math.sin(angle);

  const lineStyle = getLineStyle(connectionType, isHovered || isHighlighted);

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
            setMousePos(null);
          }
        }}
        onClick={handleClick}
        onMouseMove={(e) => {
          if (!isSelected) {
            setMousePos({ x: e.clientX, y: e.clientY });
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
          x={sourcePoint.x - 3}
          y={sourcePoint.y - 3}
          width={6}
          height={6}
          fill={lineStyle.stroke}
          opacity={lineStyle.strokeOpacity}
          style={{ pointerEvents: "none" }}
        />

        {/* End marker - either square or arrow depending on type */}
        {["Independently invented", "Concurrent development"].includes(
          connectionType
        ) ? (
          <rect
            x={endPoint.x - 3}
            y={endPoint.y - 3}
            width={6}
            height={6}
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

      {/* Tooltip Portal - Keep it visible but handle position updates */}
      {(isHovered && mousePos && mousePos.x > 0 && mousePos.y > 0) || 
        (isSelected && (selectedPos ? (selectedPos.x > 0 && selectedPos.y > 0) : ((sourcePoint.x + endPoint.x) / 2 > 0 && (sourcePoint.y + endPoint.y) / 2 > 0))) ? (
        <Portal>
          <ConnectionTooltip
            x={isHovered ? (mousePos?.x || 0) : (selectedPos ? selectedPos.x : (sourcePoint.x + endPoint.x) / 2)}
            y={isHovered ? (mousePos?.y || 0) : (selectedPos ? selectedPos.y : (sourcePoint.y + endPoint.y) / 2 - 20)}
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
      ) : null}
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
