import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import ConnectionTooltip from "./ConnectionTooltip";

interface NodePosition {
  x: number;
  y: number;
}

type ConnectionType =
  | "Prerequisite"
  | "Improvement"
  | "Speculative"
  | "Inspiration"
  | "Component"
  | "Independently invented"
  | "Link plausible but unclear"
  | "Concurrent development"
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
      setMousePos(null);
    }
  }, [isSelected]);

  // Add scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (isSelected) {
        onSelect?.(); // This will trigger deselection
      }
    };

    // Add listeners to both scroll containers
    const verticalContainer = document.querySelector(".overflow-y-auto");
    const horizontalContainer = document.querySelector(".overflow-x-auto");

    verticalContainer?.addEventListener("scroll", handleScroll);
    horizontalContainer?.addEventListener("scroll", handleScroll);

    return () => {
      verticalContainer?.removeEventListener("scroll", handleScroll);
      horizontalContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [isSelected, onSelect]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPos = { x: e.clientX, y: e.clientY };
    setSelectedPos(newPos);
    onSelect?.();
  };


  const getControlPoints = (x1: number, y1: number, x2: number, y2: number) => {
    const deltaX = x2 - x1;
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
    const NODE_HEIGHT = 150; // Approximate height of node for vertical spacing

    // Check if this is a same-year connection (vertical)
    if (Math.abs(sourceX - targetX) < nodeWidth) {
      const isUpward = sourceY > targetY;
      const centerX = (sourceX + targetX) / 2; // Center between the nodes

      if (isSource) {
        return {
          x: centerX,
          y: sourceY + (isUpward ? -NODE_HEIGHT / 2 : NODE_HEIGHT / 2),
        };
      } else {
        return {
          x: centerX,
          y: targetY + (isUpward ? NODE_HEIGHT / 2 : -NODE_HEIGHT / 2),
        };
      }
    }

    // Non-vertical connections remain the same
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
    // Light engineering paper blue
    const engineeringBlue = "#91B4C5"; // Soft, pale blue matching technical paper

    // Base style for all connections
    const baseStyle = {
      stroke: engineeringBlue,
      strokeWidth: isActive ? 2 : 1.5,
      strokeOpacity: isActive ? opacity : 0.7 * opacity, // Higher base opacity since the color is lighter
    };

    // Determine dash pattern based on connection type
    if (["Independently invented", "Concurrent development"].includes(type)) {
      return {
        ...baseStyle,
        strokeDasharray: "10,4", // Longer dashes for independent/concurrent development
      };
    } else if (
      ["Inspiration", "Speculative", "Link plausible but unclear"].includes(
        type
      )
    ) {
      return {
        ...baseStyle,
        strokeDasharray: "4,4", // Shorter dashes for speculative/inspirational connections
      };
    }

    // Default solid line for all other connection types
    return baseStyle;
  };

  const { x: x1, y: y1 } = sourceNode;
  const { x: x2, y: y2 } = targetNode;

  const sourcePoint = getAdjustedEndpoint(x1, y1, x2, y2, true);
  const endPoint = getAdjustedEndpoint(x1, y1, x2, y2, false);

  // Determine if this is a vertical connection
  const isVertical = Math.abs(sourcePoint.x - endPoint.x) < 5; // Small threshold

  // Get control points based on whether it's vertical or not
  const { cx1, cy1, cx2, cy2 } = isVertical
    ? {
        cx1: sourcePoint.x,
        cy1: sourcePoint.y,
        cx2: endPoint.x,
        cy2: endPoint.y,
      }
    : getControlPoints(sourcePoint.x, sourcePoint.y, endPoint.x, endPoint.y);

  // Calculate angle based on whether it's vertical
  const angle = isVertical
    ? endPoint.y > sourcePoint.y
      ? Math.PI / 2
      : -Math.PI / 2 // Straight up or down
    : Math.atan2(endPoint.y - cy2, endPoint.x - cx2);

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
        {/* Hit area */}
        <path
          d={`M ${sourcePoint.x} ${sourcePoint.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPoint.x} ${endPoint.y}`}
          stroke="transparent"
          strokeWidth={20}
          fill="none"
          style={{ pointerEvents: "stroke" }}
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

        {/* Main connection line */}
        <path
          d={`M ${sourcePoint.x} ${sourcePoint.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${lineEndX} ${lineEndY}`}
          fill="none"
          {...lineStyle}
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

      {/* Tooltip Portal */}
      {((isHovered && mousePos) || (isSelected && selectedPos)) && (
        <Portal>
          <ConnectionTooltip
            x={isSelected ? selectedPos?.x || 0 : mousePos?.x || 0}
            y={isSelected ? selectedPos?.y || 0 : mousePos?.y || 0}
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
          />
        </Portal>
      )}
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
