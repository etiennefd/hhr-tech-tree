import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePinchZoomOptions {
  enabled: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Ref to the outer "scroll-bounds" wrapper that sizes the scrollable area */
  scrollBoundsRef?: React.RefObject<HTMLDivElement | null>;
  /** Ref to the inner "scale" wrapper that has the CSS transform */
  scaleWrapperRef?: React.RefObject<HTMLDivElement | null>;
  /** Content dimensions (unscaled) so we can resize the scroll-bounds wrapper */
  contentWidth?: number;
  contentHeight?: number;
  /** Called on pinch end with the container's final scroll position */
  onPinchEnd?: (scrollLeft: number, scrollTop: number) => void;
}

interface UsePinchZoomResult {
  zoomLevel: number;
  isPinching: boolean;
  /** Live zoom ref — always has the latest value, even mid-pinch */
  zoomRef: React.RefObject<number>;
}

function getDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function usePinchZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UsePinchZoomOptions
): UsePinchZoomResult {
  const {
    enabled,
    minZoom = 0.3,
    maxZoom = 2.0,
    scrollBoundsRef,
    scaleWrapperRef,
    contentWidth = 0,
    contentHeight = 0,
    onPinchEnd,
  } = options;

  // React state — only updated on pinch END for a single clean re-render
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPinching, setIsPinching] = useState(false);

  const currentZoomRef = useRef(1.0);
  const initialDistanceRef = useRef(0);
  const initialZoomRef = useRef(1.0);
  const isPinchingRef = useRef(false);

  // Keep latest content dimensions in refs so the touch handler always sees current values
  // without needing to be recreated (which would cause listener re-registration)
  const contentWidthRef = useRef(contentWidth);
  const contentHeightRef = useRef(contentHeight);
  const onPinchEndRef = useRef(onPinchEnd);
  contentWidthRef.current = contentWidth;
  contentHeightRef.current = contentHeight;
  onPinchEndRef.current = onPinchEnd;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 2) return;

    isPinchingRef.current = true;
    setIsPinching(true);

    initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
    initialZoomRef.current = currentZoomRef.current;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPinchingRef.current || e.touches.length !== 2) return;

    e.preventDefault(); // Block native pinch-zoom

    const container = containerRef.current;
    const scrollBounds = scrollBoundsRef?.current;
    const scaleWrapper = scaleWrapperRef?.current;
    if (!container) return;

    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const scale = currentDistance / initialDistanceRef.current;
    const newZoom = Math.min(maxZoom, Math.max(minZoom, initialZoomRef.current * scale));

    // Calculate pinch center relative to container viewport
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const rect = container.getBoundingClientRect();
    const pinchX = centerX - rect.left;
    const pinchY = centerY - rect.top;

    // Content coordinate under the pinch center before zoom change
    const oldZoom = currentZoomRef.current;
    const contentX = (container.scrollLeft + pinchX) / oldZoom;
    const contentY = (container.scrollTop + pinchY) / oldZoom;

    currentZoomRef.current = newZoom;

    // --- DOM-only updates (no React state) ---
    const cw = contentWidthRef.current;
    const ch = contentHeightRef.current;

    // 1. Resize the scroll-bounds wrapper so the scrollable area matches the new zoom
    if (scrollBounds && cw && ch) {
      scrollBounds.style.width = `${cw * newZoom}px`;
      scrollBounds.style.minHeight = `${ch * newZoom}px`;
    }

    // 2. Update the CSS transform on the scale wrapper
    if (scaleWrapper) {
      scaleWrapper.style.transform = `scale(${newZoom})`;
    }

    // 3. Adjust scroll so content under pinch center stays put
    container.scrollLeft = contentX * newZoom - pinchX;
    container.scrollTop = contentY * newZoom - pinchY;

    // No setZoomLevel here — that happens on touch end
  }, [containerRef, scrollBoundsRef, scaleWrapperRef, minZoom, maxZoom]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2 && isPinchingRef.current) {
      isPinchingRef.current = false;
      setIsPinching(false);
      // Sync final zoom to React state — triggers one clean re-render
      setZoomLevel(currentZoomRef.current);
      // Sync scroll position so viewport/minimap update correctly
      const container = containerRef.current;
      if (container) {
        onPinchEndRef.current?.(container.scrollLeft, container.scrollTop);
      }
    }
  }, [containerRef]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { zoomLevel: enabled ? zoomLevel : 1.0, isPinching, zoomRef: currentZoomRef };
}
