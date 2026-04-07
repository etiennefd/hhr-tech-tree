import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";

interface UsePinchZoomOptions {
  enabled: boolean;
  minZoom?: number;
  maxZoom?: number;
  contentWidth: number;
  contentHeight: number;
  contentOffsetTop?: number;
  pinchingRef?: MutableRefObject<boolean>;
  zoomHostRef?: RefObject<HTMLElement | null>;
  scrollBoundsRef: RefObject<HTMLDivElement | null>;
  scaleWrapperRef: RefObject<HTMLDivElement | null>;
  onPinchEnd?: (scrollLeft: number, scrollTop: number) => void;
}

interface UsePinchZoomResult {
  zoomLevel: number;
  isPinching: boolean;
  zoomRef: RefObject<number>;
}

function getDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function usePinchZoom(
  containerRef: RefObject<HTMLDivElement | null>,
  {
    enabled,
    minZoom = 0.1,
    maxZoom = 1,
    contentWidth,
    contentHeight,
    contentOffsetTop = 0,
    pinchingRef: sharedPinchingRef,
    zoomHostRef,
    scrollBoundsRef,
    scaleWrapperRef,
    onPinchEnd,
  }: UsePinchZoomOptions
): UsePinchZoomResult {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPinching, setIsPinching] = useState(false);

  const currentZoomRef = useRef(1);
  const initialDistanceRef = useRef(0);
  const initialZoomRef = useRef(1);
  const initialCenterRef = useRef({ x: 0, y: 0 });
  const anchorContentRef = useRef({ x: 0, y: 0 });
  const internalPinchingRef = useRef(false);
  const isPinchingRef = sharedPinchingRef ?? internalPinchingRef;

  const contentWidthRef = useRef(contentWidth);
  const contentHeightRef = useRef(contentHeight);
  const contentOffsetTopRef = useRef(contentOffsetTop);
  const onPinchEndRef = useRef(onPinchEnd);

  contentWidthRef.current = contentWidth;
  contentHeightRef.current = contentHeight;
  contentOffsetTopRef.current = contentOffsetTop;
  onPinchEndRef.current = onPinchEnd;

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled || event.touches.length !== 2) return;

    const container = containerRef.current;
    if (!container) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-no-tree-zoom='true']")) {
      return;
    }

    isPinchingRef.current = true;
    setIsPinching(true);
    initialDistanceRef.current = getDistance(event.touches[0], event.touches[1]);
    initialZoomRef.current = currentZoomRef.current;
    initialCenterRef.current = {
      x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
      y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
    };
    const rect = container.getBoundingClientRect();
    const pinchX = initialCenterRef.current.x - rect.left;
    const pinchY = initialCenterRef.current.y - rect.top;
    anchorContentRef.current = {
      x: (container.scrollLeft + pinchX) / currentZoomRef.current,
      y:
        (container.scrollTop + pinchY - contentOffsetTopRef.current) /
        currentZoomRef.current,
    };
  }, [containerRef, enabled, isPinchingRef]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isPinchingRef.current || event.touches.length !== 2) return;

    event.preventDefault();

    const container = containerRef.current;
    const scrollBounds = scrollBoundsRef.current;
    const scaleWrapper = scaleWrapperRef.current;
    if (!container || !scrollBounds || !scaleWrapper) return;

    const currentDistance = getDistance(event.touches[0], event.touches[1]);
    const scale = currentDistance / initialDistanceRef.current;
    const newZoom = clamp(initialZoomRef.current * scale, minZoom, maxZoom);

    const rect = container.getBoundingClientRect();
    const pinchX = initialCenterRef.current.x - rect.left;
    const pinchY = initialCenterRef.current.y - rect.top;

    currentZoomRef.current = newZoom;

    scrollBounds.style.width = `${contentWidthRef.current * newZoom}px`;
    scrollBounds.style.minHeight = `${contentHeightRef.current * newZoom}px`;
    scaleWrapper.style.transform = `scale(${newZoom})`;
    zoomHostRef?.current?.style.setProperty("--tree-zoom", String(newZoom));

    container.scrollLeft = Math.max(
      0,
      anchorContentRef.current.x * newZoom - pinchX
    );
    container.scrollTop = Math.max(
      0,
      contentOffsetTopRef.current + anchorContentRef.current.y * newZoom - pinchY
    );
  }, [containerRef, isPinchingRef, maxZoom, minZoom, scaleWrapperRef, scrollBoundsRef, zoomHostRef]);

  const finishPinch = useCallback(() => {
    if (!isPinchingRef.current) return;

    isPinchingRef.current = false;
    setIsPinching(false);
    setZoomLevel(currentZoomRef.current);

    const container = containerRef.current;
    if (container) {
      onPinchEndRef.current?.(container.scrollLeft, container.scrollTop);
    }
  }, [containerRef, isPinchingRef]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (event.touches.length < 2) {
      finishPinch();
    }
  }, [finishPinch]);

  const handleTouchCancel = useCallback(() => {
    finishPinch();
  }, [finishPinch]);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    containerRef,
    enabled,
    handleTouchCancel,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
  ]);

  return {
    zoomLevel: enabled ? zoomLevel : 1,
    isPinching,
    zoomRef: currentZoomRef,
  };
}
