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

  const ARROW_OFFSET = 85;

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
    isSource: boolean
  ) => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const angle = Math.atan2(dy, dx);

    if (isSource) {
      return {
        x: sourceX + ARROW_OFFSET * Math.cos(angle),
        y: sourceY + ARROW_OFFSET * Math.sin(angle),
      };
    } else {
      return {
        x: targetX - ARROW_OFFSET * Math.cos(angle),
        y: targetY - ARROW_OFFSET * Math.sin(angle),
      };
    }
  };

  const getLineStyle = (type: ConnectionType, isActive: boolean) => {
    // Base style for all connections
    const baseStyle = {
      stroke: "#333333", // Dark gray for all connections
      strokeWidth: isActive ? 2 : 1.5,
      strokeOpacity: isActive ? opacity : 0.3 * opacity,
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

  const { cx1, cy1, cx2, cy2 } = getControlPoints(
    sourcePoint.x,
    sourcePoint.y,
    endPoint.x,
    endPoint.y
  );

  const dx = endPoint.x - cx2;
  const dy = endPoint.y - cy2;
  const angle = Math.atan2(dy, dx);

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

        {/* Visible path */}
        <path
          d={`M ${sourcePoint.x} ${sourcePoint.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${lineEndX} ${lineEndY}`}
          fill="none"
          {...lineStyle}
          style={{ pointerEvents: "none" }}
        />

        {/* Arrow */}
        <path
          d={`M ${endPoint.x} ${endPoint.y} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`}
          fill={lineStyle.stroke}
          opacity={lineStyle.strokeOpacity}
          style={{ pointerEvents: "none" }}
        />
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
