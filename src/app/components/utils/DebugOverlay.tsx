import React from 'react';
import { CACHE_VIEWPORT_BUFFER_FOR_NODES } from '../TechTreeViewer';

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
  showAllConnections: boolean;
  onClose: () => void;
  onToggleConnections: () => void;
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
  showAllConnections,
  onClose,
  onToggleConnections
}: DebugOverlayProps) {
  const bufferedViewport = {
    left: viewport.left - CACHE_VIEWPORT_BUFFER_FOR_NODES,
    right: viewport.right + CACHE_VIEWPORT_BUFFER_FOR_NODES,
    top: viewport.top - CACHE_VIEWPORT_BUFFER_FOR_NODES,
    bottom: viewport.bottom + CACHE_VIEWPORT_BUFFER_FOR_NODES
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
      <div style={{
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%'
      }}>
        <span style={{ fontSize: '12px', color: 'white' }}>Show connections:</span>
        <span style={{ fontSize: '12px', color: showAllConnections ? 'rgba(255,255,255,0.5)' : 'white' }}>Optimized</span>
        <button
          onClick={onToggleConnections}
          style={{
            position: 'relative',
            width: '40px',
            height: '20px',
            background: showAllConnections ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            padding: '0',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          <div style={{
            position: 'absolute',
            left: showAllConnections ? '22px' : '2px',
            top: '2px',
            width: '16px',
            height: '16px',
            background: 'white',
            borderRadius: '50%',
            transition: 'left 0.2s ease-in-out'
          }} />
        </button>
        <span style={{ fontSize: '12px', color: showAllConnections ? 'white' : 'rgba(255,255,255,0.5)' }}>All</span>
      </div>
    </div>
  );
} 