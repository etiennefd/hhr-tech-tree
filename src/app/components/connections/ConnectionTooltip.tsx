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
  onNodeClick,
}) => {
  const isNearRightEdge = x > window.innerWidth - 300;
  const isNearBottomEdge = y > window.innerHeight - 150;

  const handleNodeClick = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNodeClick) {
      onNodeClick(title);
    }
  };

  const renderConnectionContent = () => {
    const Source = (
      <button
        onClick={(e) => handleNodeClick(e, sourceTitle)}
        className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
        type="button"
      >
        {sourceTitle}
      </button>
    );

    const Target = (
      <button
        onClick={(e) => handleNodeClick(e, targetTitle)}
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
      case "Speculative":
      case "Link plausible but unclear":
        return (
          <>
            {Source} may have led to {Target}
          </>
        );
      default:
        return (
          <>
            {Source} led to {Target}
          </>
        );
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
      <p className="text-xs mb-1.5">{renderConnectionContent()}</p>
      {details && (
        <p className="text-xs text-gray-600 border-t pt-1.5 mt-1.5">
          {details}
        </p>
      )}
    </div>
  );
};

export default ConnectionTooltip;
