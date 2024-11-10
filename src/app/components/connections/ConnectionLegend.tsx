import React from 'react';

const ConnectionLegend = () => {
  const connectionTypes = [
    {
      type: 'Prerequisite',
      label: 'Prerequisite',
      color: '#FCA5A5',
      pattern: 'solid',
      width: 3
    },
    {
      type: 'Improvement',
      label: 'Improvement',
      color: '#93C5FD',
      pattern: 'solid',
      width: 2
    },
    {
      type: 'Speculative',
      label: 'Speculative',
      color: '#FCD34D',
      pattern: 'dashed',
      width: 2
    },
    {
      type: 'Inspiration',
      label: 'Inspiration',
      color: '#86EFAC',
      pattern: 'dashed',
      width: 2
    },
    {
      type: 'Component',
      label: 'Component',
      color: '#C4B5FD',
      pattern: 'solid',
      width: 2
    },
    {
      type: 'Independently invented',
      label: 'Independently Invented',
      color: '#6EE7B7',
      pattern: 'longdash',
      width: 2
    }
  ];

  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-md border">
      <h3 className="text-sm font-medium mb-2">Connection Types</h3>
      <div className="space-y-2">
        {connectionTypes.map(({ type, label, color, pattern, width }) => (
          <div key={type} className="flex items-center gap-2">
            <svg width="24" height="12" className="shrink-0">
              <line
                x1="0"
                y1="6"
                x2="24"
                y2="6"
                stroke={color}
                strokeWidth={width}
                strokeDasharray={
                  pattern === 'dashed' ? '3,3' : 
                  pattern === 'longdash' ? '10,3' : 
                  '0'
                }
              />
            </svg>
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConnectionLegend;