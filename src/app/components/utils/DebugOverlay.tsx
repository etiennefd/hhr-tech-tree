import React from 'react';

interface DebugOverlayProps {
  viewport: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  scrollPosition: {
    left: number;
    top: number;
  };
  totalNodes: number;
  visibleNodes: number;
  strictlyVisibleNodes: number;
  totalConnections: number;
  visibleConnections: number;
  nodeVisibleConnections: number;
  stickyVisibleConnections: number;
  invisibleViewportConnections: number;
  // How far past the viewport nodes are rendered, in tree px. Passed in rather
  // than imported, which made this file and TechTreeViewer import each other.
  nodeBuffer: number;
  onClose: () => void;
}

export function DebugOverlay({
  viewport,
  scrollPosition,
  totalNodes,
  visibleNodes,
  strictlyVisibleNodes,
  totalConnections,
  visibleConnections,
  nodeVisibleConnections,
  stickyVisibleConnections,
  invisibleViewportConnections,
  nodeBuffer,
  onClose
}: DebugOverlayProps) {
  const bufferedViewport = {
    left: viewport.left - nodeBuffer,
    right: viewport.right + nodeBuffer,
    top: viewport.top - nodeBuffer,
    bottom: viewport.bottom + nodeBuffer
  };

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
      <div><strong>Strict viewport:</strong> [{viewport.left.toFixed(0)},{viewport.top.toFixed(0)}] to [{viewport.right.toFixed(0)},{viewport.bottom.toFixed(0)}]</div>
      <div style={{ marginLeft: '12px' }}>• {strictlyVisibleNodes}/{totalNodes} visible nodes</div>
      <div><strong>Buffered viewport:</strong> [{bufferedViewport.left.toFixed(0)},{bufferedViewport.top.toFixed(0)}] to [{bufferedViewport.right.toFixed(0)},{bufferedViewport.bottom.toFixed(0)}]</div>
      <div style={{ marginLeft: '12px' }}>• {visibleNodes}/{totalNodes} nodes in buffered viewport</div>
      <div style={{ marginLeft: '12px' }}>• {visibleConnections}/{totalConnections} connections in buffered viewport</div>
      <div style={{ marginLeft: '24px' }}>
        <div>- {nodeVisibleConnections} visible because nodes in viewport</div>
        <div>- {stickyVisibleConnections} visible because visible last frame</div>
      </div>
      <div style={{ marginLeft: '12px' }}>• {invisibleViewportConnections} invisible despite being in viewport</div>
    </div>
  );
} 