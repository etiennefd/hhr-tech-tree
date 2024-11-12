import React from 'react';

interface ConnectionTooltipProps {
  x: number;
  y: number;
  sourceTitle: string;
  targetTitle: string;
  type: string;
  details?: string;
}

const ConnectionTooltip: React.FC<ConnectionTooltipProps> = ({
  x,
  y,
  sourceTitle,
  targetTitle,
  type,
  details
}) => {
  return (
    <div 
      className="absolute z-20 bg-white border rounded-lg p-3 shadow-lg w-64"
      style={{
        left: x + 10,
        top: y + 10,
        pointerEvents: 'none' // So it doesn't interfere with hover events
      }}
    >
      <p className="text-xs mb-1">
        <strong>From:</strong> {sourceTitle}
      </p>
      <p className="text-xs mb-1">
        <strong>To:</strong> {targetTitle}
      </p>
      {details && (
        <p className="text-xs">
          <strong>Details:</strong> {details}
        </p>
      )}
    </div>
  );
};

export default ConnectionTooltip;