import { useRef, useCallback, useEffect, useState } from 'react';

interface PinchZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UsePinchZoomReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  scale: number;
  translateX: number;
  translateY: number;
  resetZoom: () => void;
  isZoomed: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  didGesture: React.MutableRefObject<boolean>;
}

const MAX_SCALE = 3;

function getDistance(t1: React.Touch, t2: React.Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(t1: React.Touch, t2: React.Touch) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export function usePinchZoom(): UsePinchZoomReturn {
  const containerRef = useRef<HTMLDivElement>(null!);
  const contentRef = useRef<HTMLDivElement>(null!);

  const [state, setState] = useState<PinchZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  // Refs for gesture tracking (60fps, no re-renders during gesture)
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const minScaleRef = useRef(0.4);
  const gestureActive = useRef(false);
  const didGesture = useRef(false);
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const lastTouchX = useRef(0);
  const lastTouchY = useRef(0);
  const isPinching = useRef(false);

  const calcMinScale = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return 0.4;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const sw = content.scrollWidth;
    const sh = content.scrollHeight;
    if (sw === 0 || sh === 0) return 0.4;
    return Math.min(cw / sw, ch / sh, 1);
  }, []);

  const clampTranslate = useCallback(
    (tx: number, ty: number, scale: number) => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return { tx, ty };

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const sw = content.scrollWidth * scale;
      const sh = content.scrollHeight * scale;

      if (sw <= cw) {
        // Content fits — center horizontally
        tx = (cw - sw) / 2;
      } else {
        // Clamp: left edge can't go past 0, right edge can't go past container
        tx = Math.min(0, Math.max(cw - sw, tx));
      }

      if (sh <= ch) {
        ty = (ch - sh) / 2;
      } else {
        ty = Math.min(0, Math.max(ch - sh, ty));
      }

      return { tx, ty };
    },
    []
  );

  const applyTransform = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    content.style.transform = `translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current})`;
  }, []);

  const commitState = useCallback(() => {
    setState({
      scale: scaleRef.current,
      translateX: txRef.current,
      translateY: tyRef.current,
    });
  }, []);

  // Initialize to fit-to-screen
  useEffect(() => {
    const init = () => {
      const ms = calcMinScale();
      minScaleRef.current = ms;
      scaleRef.current = ms;
      const clamped = clampTranslate(0, 0, ms);
      txRef.current = clamped.tx;
      tyRef.current = clamped.ty;
      applyTransform();
      commitState();
    };

    // Wait for content to render and have dimensions
    const timer = setTimeout(init, 50);

    const handleResize = () => {
      const ms = calcMinScale();
      minScaleRef.current = ms;
      if (scaleRef.current < ms) {
        scaleRef.current = ms;
      }
      const clamped = clampTranslate(txRef.current, tyRef.current, scaleRef.current);
      txRef.current = clamped.tx;
      tyRef.current = clamped.ty;
      applyTransform();
      commitState();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [calcMinScale, clampTranslate, applyTransform, commitState]);

  const resetZoom = useCallback(() => {
    const content = contentRef.current;
    if (content) {
      content.style.transition = 'transform 0.2s ease-out';
      setTimeout(() => {
        if (content) content.style.transition = '';
      }, 220);
    }
    const ms = calcMinScale();
    minScaleRef.current = ms;
    scaleRef.current = ms;
    const clamped = clampTranslate(0, 0, ms);
    txRef.current = clamped.tx;
    tyRef.current = clamped.ty;
    applyTransform();
    commitState();
  }, [calcMinScale, clampTranslate, applyTransform, commitState]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      didGesture.current = false;

      if (e.touches.length === 2) {
        isPinching.current = true;
        gestureActive.current = true;
        initialDistance.current = getDistance(e.touches[0], e.touches[1]);
        initialScale.current = scaleRef.current;
      } else if (e.touches.length === 1) {
        gestureActive.current = true;
        isPinching.current = false;
        lastTouchX.current = e.touches[0].clientX;
        lastTouchY.current = e.touches[0].clientY;
      }
    },
    []
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!gestureActive.current) return;

      // Remove transition during gesture
      const content = contentRef.current;
      if (content) content.style.transition = '';

      if (e.touches.length === 2 && isPinching.current) {
        didGesture.current = true;
        const dist = getDistance(e.touches[0], e.touches[1]);
        const mid = getMidpoint(e.touches[0], e.touches[1]);
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Focal point in container coords
        const fx = mid.x - rect.left;
        const fy = mid.y - rect.top;

        const prevScale = scaleRef.current;
        let newScale =
          initialScale.current * (dist / initialDistance.current);
        newScale = Math.min(MAX_SCALE, Math.max(minScaleRef.current, newScale));

        // Zoom toward focal point
        const ratio = newScale / prevScale;
        let newTx = fx - ratio * (fx - txRef.current);
        let newTy = fy - ratio * (fy - tyRef.current);

        const clamped = clampTranslate(newTx, newTy, newScale);
        scaleRef.current = newScale;
        txRef.current = clamped.tx;
        tyRef.current = clamped.ty;
        applyTransform();
      } else if (e.touches.length === 1 && !isPinching.current) {
        // Pan only when zoomed in past fit
        const ms = minScaleRef.current;
        if (scaleRef.current <= ms + 0.01) return;

        didGesture.current = true;
        const dx = e.touches[0].clientX - lastTouchX.current;
        const dy = e.touches[0].clientY - lastTouchY.current;
        lastTouchX.current = e.touches[0].clientX;
        lastTouchY.current = e.touches[0].clientY;

        const clamped = clampTranslate(
          txRef.current + dx,
          tyRef.current + dy,
          scaleRef.current
        );
        txRef.current = clamped.tx;
        tyRef.current = clamped.ty;
        applyTransform();
      }
    },
    [clampTranslate, applyTransform]
  );

  const onTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      gestureActive.current = false;
      isPinching.current = false;
      commitState();
    },
    [commitState]
  );

  const isZoomed = state.scale > minScaleRef.current + 0.01;

  return {
    containerRef,
    contentRef,
    scale: state.scale,
    translateX: state.translateX,
    translateY: state.translateY,
    resetZoom,
    isZoomed,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    didGesture,
  };
}
