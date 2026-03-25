'use client';

import React from 'react';
import { usePinchZoom } from '../hooks/usePinchZoom';

interface PinchZoomContainerProps {
  children: React.ReactNode;
}

export default function PinchZoomContainer({ children }: PinchZoomContainerProps) {
  const {
    containerRef,
    contentRef,
    isZoomed,
    resetZoom,
    handlers,
    didGesture,
  } = usePinchZoom();

  const handleClickCapture = (e: React.MouseEvent) => {
    if (didGesture.current) {
      e.stopPropagation();
      e.preventDefault();
      didGesture.current = false;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        overflow: 'hidden',
        touchAction: 'none',
        minHeight: '300px',
      }}
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      onClickCapture={handleClickCapture}
    >
      <div
        ref={contentRef}
        style={{
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </div>

      {isZoomed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          className="absolute top-2 right-2 z-50 px-3 py-1 text-xs font-medium rounded-full
            bg-lab-surface/90 text-lab-text border border-lab-border backdrop-blur-sm
            active:scale-95 transition-transform"
        >
          Fit
        </button>
      )}
    </div>
  );
}
