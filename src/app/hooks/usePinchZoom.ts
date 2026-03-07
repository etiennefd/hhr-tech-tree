import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePinchZoomOptions {
  enabled: boolean;
  minZoom?: number;
  maxZoom?: number;
}

interface UsePinchZoomResult {
  zoomLevel: number;
  isPinching: boolean;
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
  const { enabled, minZoom = 0.3, maxZoom = 2.0 } = options;

  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isPinching, setIsPinching] = useState(false);

  const currentZoomRef = useRef(1.0);
  const initialDistanceRef = useRef(0);
  const initialZoomRef = useRef(1.0);
  const isPinchingRef = useRef(false);

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

    requestAnimationFrame(() => {
      // Adjust scroll so content under pinch center stays put
      container.scrollLeft = contentX * newZoom - pinchX;
      container.scrollTop = contentY * newZoom - pinchY;
      setZoomLevel(newZoom);
    });
  }, [containerRef, minZoom, maxZoom]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false;
      setIsPinching(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { zoomLevel: enabled ? zoomLevel : 1.0, isPinching };
}
