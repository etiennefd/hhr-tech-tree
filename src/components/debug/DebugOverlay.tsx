import React from 'react';

interface DebugOverlayProps {
  viewport: any;
  scrollPosition: any;
  totalNodes: number;
  visibleNodes: number;
  totalConnections: number;
  visibleConnections: number;
  onClose: () => void;
}

export function DebugOverlay({
  viewport,
  scrollPosition,
  totalNodes,
  visibleNodes,
  totalConnections,
  visibleConnections,
  onClose
}: DebugOverlayProps) {
  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '70px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '400px',
        fontFamily: 'monospace'
      }}
    >
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
          padding: '2px 6px',
          lineHeight: 1
        }}
      >
        ×
      </button>
      <div><strong>Scroll:</strong> L={scrollPosition.left.toFixed(0)} T={scrollPosition.top.toFixed(0)}</div>
      <div><strong>Viewport:</strong> [{viewport.left.toFixed(0)},{viewport.top.toFixed(0)}] to [{viewport.right.toFixed(0)},{viewport.bottom.toFixed(0)}]</div>
      <div><strong>Visible nodes:</strong> {visibleNodes}/{totalNodes}</div>
      <div><strong>Visible connections:</strong> {visibleConnections}/{totalConnections}</div>
    </div>
  );
} 