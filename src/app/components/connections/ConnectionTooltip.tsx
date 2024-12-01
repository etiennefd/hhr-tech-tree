import React from "react";

interface ConnectionTooltipProps {
  x: number;
  y: number;
  sourceTitle: string;
  targetTitle: string;
  type: string;
  details?: string;
  isSelected?: boolean;
  onNodeClick?: (title: string) => void;
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
}) => {
  // Calculate if tooltip would go off-screen
  const isNearRightEdge = x > window.innerWidth - 300;
  const isNearBottomEdge = y > window.innerHeight - 150;

  const handleNodeClick = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick(title);
    }
  };

  return (
    <div
      className="fixed bg-white border rounded-lg p-3 shadow-lg w-64 z-50"
      style={{
        left: isNearRightEdge ? x - 274 : x + 10,
        top: isNearBottomEdge ? y - 100 : y + 10,
        pointerEvents: "all",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <p className="text-xs mb-1.5">
          <strong className="text-gray-700">From: </strong>
          <button
            onClick={(e) => handleNodeClick(e, sourceTitle)}
            className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
            type="button"
          >
            {sourceTitle}
          </button>
        </p>
        <p className="text-xs mb-1.5">
          <strong className="text-gray-700">To: </strong>
          <button
            onClick={(e) => handleNodeClick(e, targetTitle)}
            className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
            type="button"
          >
            {targetTitle}
          </button>
        </p>
        {details && (
          <p className="text-xs text-gray-600 border-t pt-1.5 mt-1.5">
            {details}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConnectionTooltip;
