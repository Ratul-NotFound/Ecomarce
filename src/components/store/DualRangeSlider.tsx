'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface DualRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
}

export default function DualRangeSlider({
  min = 0,
  max = 10000,
  step = 50,
  minVal,
  maxVal,
  onChange,
}: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  // Helper to round value to step
  const snapToStep = useCallback((val: number) => {
    const stepped = Math.round((val - min) / step) * step + min;
    return Math.max(min, Math.min(max, stepped));
  }, [min, max, step]);

  // Convert clientX into a stepped value
  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + pos * (max - min);
      return snapToStep(rawValue);
    },
    [min, max, snapToStep]
  );

  const handlePointerDown = (thumb: 'min' | 'max', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveThumb(thumb);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeThumb) return;
    const newVal = getValueFromPosition(e.clientX);

    if (activeThumb === 'min') {
      const boundedMin = Math.min(newVal, maxVal - step);
      onChange(boundedMin, maxVal);
    } else {
      const boundedMax = Math.max(newVal, minVal + step);
      onChange(minVal, boundedMax);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeThumb) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveThumb(null);
    }
  };

  // Track click to jump nearest thumb
  const handleTrackClick = (e: React.MouseEvent) => {
    const clickVal = getValueFromPosition(e.clientX);
    const distToMin = Math.abs(clickVal - minVal);
    const distToMax = Math.abs(clickVal - maxVal);

    if (distToMin < distToMax) {
      const boundedMin = Math.min(clickVal, maxVal - step);
      onChange(boundedMin, maxVal);
    } else {
      const boundedMax = Math.max(clickVal, minVal + step);
      onChange(minVal, boundedMax);
    }
  };

  const minPercent = Math.max(0, Math.min(100, ((minVal - min) / (max - min)) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxVal - min) / (max - min)) * 100));

  return (
    <div
      className="custom-dual-slider"
      ref={trackRef}
      onClick={handleTrackClick}
    >
      {/* Background Track Rail */}
      <div className="custom-dual-slider__rail" />

      {/* Active Range Highlight */}
      <div
        className="custom-dual-slider__fill"
        style={{
          left: `${minPercent}%`,
          width: `${Math.max(0, maxPercent - minPercent)}%`,
        }}
      />

      {/* Left Thumb (Min) */}
      <div
        className={`custom-dual-slider__thumb ${activeThumb === 'min' ? 'custom-dual-slider__thumb--active' : ''}`}
        style={{ left: `${minPercent}%` }}
        onPointerDown={e => handlePointerDown('min', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={maxVal - step}
        aria-valuenow={minVal}
        tabIndex={0}
        aria-label="Minimum Price"
      />

      {/* Right Thumb (Max) */}
      <div
        className={`custom-dual-slider__thumb ${activeThumb === 'max' ? 'custom-dual-slider__thumb--active' : ''}`}
        style={{ left: `${maxPercent}%` }}
        onPointerDown={e => handlePointerDown('max', e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={minVal + step}
        aria-valuemax={max}
        aria-valuenow={maxVal}
        tabIndex={0}
        aria-label="Maximum Price"
      />
    </div>
  );
}
