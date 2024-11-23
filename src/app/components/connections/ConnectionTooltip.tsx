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
  // Calculate if tooltip would go off-screen
  const isNearRightEdge = x > window.innerWidth - 300; // 300 = tooltip width + padding
  const isNearBottomEdge = y > window.innerHeight - 150; // 150 = approx max tooltip height

  return (
    <div 
      className="absolute bg-white border rounded-lg p-3 shadow-lg w-64 connection-tooltip"
      style={{
        left: isNearRightEdge ? x - 274 : x + 10, // 274 = tooltip width + offset
        top: isNearBottomEdge ? y - 100 : y + 10,
        pointerEvents: 'none',
        zIndex: 9999, // Highest z-index to ensure it's above everything
        transform: 'translateZ(0)', // Creates a new stacking context
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      }}
    >
      <div className="relative">
        <p className="text-xs mb-1.5 font-medium">
          <strong className="text-gray-700">From:</strong> {sourceTitle}
        </p>
        <p className="text-xs mb-1.5 font-medium">
          <strong className="text-gray-700">To:</strong> {targetTitle}
        </p>
        {details && (
          <p className="text-xs text-gray-600 border-t pt-1.5 mt-1.5">
            <strong className="text-gray-700">Details:</strong> {details}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConnectionTooltip;