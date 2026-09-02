'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
}

export default function DualRangeSlider({
  min = 0,
  max = 10000,
  step = 100,
  minVal: initialMin,
  maxVal: initialMax,
  onChange,
}: DualRangeSliderProps) {
  const [minVal, setMinVal] = useState(initialMin);
  const [maxVal, setMaxVal] = useState(initialMax);
  const minValRef = useRef(initialMin);
  const maxValRef = useRef(initialMax);
  const rangeRef = useRef<HTMLDivElement>(null);

  // Convert to percentage
  const getPercent = useCallback(
    (value: number) => Math.round(((value - min) / (max - min)) * 100),
    [min, max]
  );

  // Update internal state when props change
  useEffect(() => {
    setMinVal(initialMin);
    minValRef.current = initialMin;
  }, [initialMin]);

  useEffect(() => {
    setMaxVal(initialMax);
    maxValRef.current = initialMax;
  }, [initialMax]);

  // Set width of the range to decrease from the left side
  useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxValRef.current);

    if (rangeRef.current) {
      rangeRef.current.style.left = `${minPercent}%`;
      rangeRef.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, getPercent]);

  // Set width of the range to decrease from the right side
  useEffect(() => {
    const minPercent = getPercent(minValRef.current);
    const maxPercent = getPercent(maxVal);

    if (rangeRef.current) {
      rangeRef.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [maxVal, getPercent]);

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(event.target.value), maxVal - step);
    setMinVal(value);
    minValRef.current = value;
    onChange(value, maxVal);
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(event.target.value), minVal + step);
    setMaxVal(value);
    maxValRef.current = value;
    onChange(minVal, value);
  };

  return (
    <div className="dual-slider-wrapper">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minVal}
        onChange={handleMinChange}
        className="dual-slider-thumb dual-slider-thumb--left"
        style={{ zIndex: minVal > max - 100 ? 5 : 3 }}
        aria-label="Minimum Price"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxVal}
        onChange={handleMaxChange}
        className="dual-slider-thumb dual-slider-thumb--right"
        style={{ zIndex: 4 }}
        aria-label="Maximum Price"
      />

      <div className="dual-slider-track">
        <div className="dual-slider-track__rail" />
        <div ref={rangeRef} className="dual-slider-track__fill" />
      </div>
    </div>
  );
}
