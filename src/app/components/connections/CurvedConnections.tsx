import React, { useState } from 'react';

interface NodePosition {
  x: number;
  y: number;
}

type ConnectionType = 
  | 'Prerequisite'
  | 'Improvement'
  | 'Speculative'
  | 'Inspiration'
  | 'Component'
  | 'Independently invented'
  | 'default';

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
}

const CurvedConnections: React.FC<CurvedConnectionsProps> = ({
  sourceNode,
  targetNode,
  connectionType = 'default',
  isHighlighted = false,
  onMouseEnter,
  onMouseLeave,
  sourceTitle,
  targetTitle,
  details,
  opacity = 1
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 150;
  const ARROW_OFFSET = 70;

  const getControlPoints = (x1: number, y1: number, x2: number, y2: number) => {
    const deltaX = x2 - x1;
    const controlPointOffset = Math.min(Math.abs(deltaX) * 0.5, 200);
    
    return {
      cx1: x1 + controlPointOffset,
      cy1: y1,
      cx2: x2 - controlPointOffset,
      cy2: y2
    };
  };

  const getAdjustedEndpoint = (sourceX: number, sourceY: number, targetX: number, targetY: number) => {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const angle = Math.atan2(dy, dx);
    
    return {
      x: targetX - (ARROW_OFFSET * Math.cos(angle)),
      y: targetY - (ARROW_OFFSET * Math.sin(angle))
    };
  };

  const getLineStyle = (type: ConnectionType, isActive: boolean) => {
    const baseStyles = {
      Prerequisite: { stroke: '#FCA5A5', strokeWidth: 3 },
      Improvement: { stroke: '#93C5FD', strokeWidth: 2 },
      Speculative: { stroke: '#FCD34D', strokeWidth: 2 },
      Inspiration: { stroke: '#86EFAC', strokeWidth: 2 },
      Component: { stroke: '#C4B5FD', strokeWidth: 2 },
      'Independently invented': { stroke: '#6EE7B7', strokeWidth: 2 },
      default: { stroke: '#6B7280', strokeWidth: 2 }
    };

    const style = baseStyles[type] || baseStyles.default;
    
    // Add opacity based on hover/highlight state
    return {
      ...style,
      strokeOpacity: isActive ? opacity : 0.3 * opacity, // Multiply by opacity
      strokeWidth: isActive ? style.strokeWidth + 1 : style.strokeWidth,
      ...(['Speculative', 'Inspiration', 'Independently invented'].includes(type) 
        ? { strokeDasharray: type === 'Independently invented' ? '10,3' : '5,5' }
        : {})
    };
  };

  const { x: x1, y: y1 } = sourceNode;
  const { x: x2, y: y2 } = targetNode;
  
  const endPoint = getAdjustedEndpoint(x1, y1, x2, y2);
  const { cx1, cy1, cx2, cy2 } = getControlPoints(x1, y1, endPoint.x, endPoint.y);
  
  const dx = endPoint.x - cx2;
  const dy = endPoint.y - cy2;
  const angle = Math.atan2(dy, dx);
  
  const arrowLength = 10;
  const arrowWidth = 6;
  
  const arrowPoint1X = endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowPoint1Y = endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowPoint2X = endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowPoint2Y = endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6);
  
  const lineStyle = getLineStyle(connectionType, isHovered || isHighlighted);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Get mouse position relative to the viewport
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
    }
  };

  return (
    <>
      <g 
        className="connection"
        onMouseEnter={() => {
          setIsHovered(true);
          onMouseEnter?.();
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          onMouseLeave?.();
          setMousePos(null);
        }}
        onMouseMove={handleMouseMove}
        style={{ pointerEvents: 'all' }}
      >
        {/* Hit area */}
        <path
          d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPoint.x} ${endPoint.y}`}
          stroke="transparent"
          strokeWidth={20}
          fill="none"
          style={{ pointerEvents: 'stroke' }}
        />
        
        {/* Visible path */}
        <path
          d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPoint.x} ${endPoint.y}`}
          fill="none"
          {...lineStyle}
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Arrow */}
        <path
          d={`M ${endPoint.x} ${endPoint.y} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`}
          fill={lineStyle.stroke}
          opacity={lineStyle.strokeOpacity}
          style={{ pointerEvents: 'none' }}
        />
      </g>

      {/* Tooltip */}
      {isHovered && mousePos && (
        <foreignObject
          x={mousePos.x + 10}
          y={mousePos.y + 10}
          width={240}
          height={200}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-white p-3 rounded-lg shadow-lg border text-sm">
            <div className="mb-1">
              <span className="font-semibold">From:</span> {sourceTitle}
            </div>
            <div className="mb-1">
              <span className="font-semibold">To:</span> {targetTitle}
            </div>
            <div className="mb-1">
              <span className="font-semibold">Type:</span> {connectionType}
            </div>
            {details && (
              <div className="mb-1">
                <span className="font-semibold">Details:</span> {details}
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </>
  );
};

export default CurvedConnections;