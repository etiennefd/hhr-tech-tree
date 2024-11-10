import React from 'react';

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
}

const CurvedConnections: React.FC<CurvedConnectionsProps> = ({
  sourceNode,
  targetNode,
  connectionType = 'default'
}) => {
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

  // Get line style based on connection type
  const getLineStyle = (type: ConnectionType) => {
    switch (type) {
      case 'Prerequisite':
        return {
          stroke: '#FCA5A5', // Light red
          strokeWidth: 3
        };
      case 'Improvement':
        return {
          stroke: '#93C5FD', // Light blue
          strokeWidth: 2
        };
      case 'Speculative':
        return {
          stroke: '#FCD34D', // Yellow
          strokeDasharray: '5,5',
          strokeWidth: 2
        };
      case 'Inspiration':
        return {
          stroke: '#86EFAC', // Light green
          strokeDasharray: '3,3',
          strokeWidth: 2
        };
      case 'Component':
        return {
          stroke: '#C4B5FD', // Light purple
          strokeWidth: 2
        };
      case 'Independently invented':
        return {
          stroke: '#6EE7B7', // Mint green
          strokeDasharray: '10,3',
          strokeWidth: 2
        };
      default:
        return {
          stroke: '#6B7280', // Gray
          strokeWidth: 2
        };
    }
  };

  // Rest of the component remains the same
  const { x: x1, y: y1 } = sourceNode;
  const { x: x2, y: y2 } = targetNode;
  
  const { cx1, cy1, cx2, cy2 } = getControlPoints(x1, y1, x2, y2);
  
  const dx = x2 - cx2;
  const dy = y2 - cy2;
  const angle = Math.atan2(dy, dx);
  
  const arrowLength = 10;
  
  const arrowPoint1X = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
  const arrowPoint1Y = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
  const arrowPoint2X = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
  const arrowPoint2Y = y2 - arrowLength * Math.sin(angle + Math.PI / 6);
  
  const lineStyle = getLineStyle(connectionType);

  return (
    <g className="connection">
      <path
        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
        fill="none"
        {...lineStyle}
      />
      <path
        d={`M ${x2} ${y2} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`}
        fill={lineStyle.stroke}
      />
    </g>
  );
};

export default CurvedConnections;