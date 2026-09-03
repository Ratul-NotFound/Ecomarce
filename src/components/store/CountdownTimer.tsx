'use client';

import React, { useState, useEffect } from 'react';
import { calculateTimeRemaining, type FlashSaleTimeParts } from '@/lib/flash-sale-utils';

interface CountdownTimerProps {
  targetDate?: string | null;
}

export default function CountdownTimer({ targetDate = null }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<FlashSaleTimeParts>(() => 
    calculateTimeRemaining(targetDate)
  );

  useEffect(() => {
    setMounted(true);

    const updateTimer = () => {
      setTimeLeft(calculateTimeRemaining(targetDate));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="countdown-wrapper" suppressHydrationWarning>
      {mounted && timeLeft.days > 0 && (
        <>
          <div className="countdown-digit">
            <span className="countdown-num" suppressHydrationWarning>
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span className="countdown-label">Days</span>
          </div>
          <span className="countdown-separator">:</span>
        </>
      )}

      <div className="countdown-digit">
        <span className="countdown-num" suppressHydrationWarning>
          {mounted ? String(timeLeft.hours).padStart(2, '0') : '00'}
        </span>
        <span className="countdown-label">Hours</span>
      </div>
      <span className="countdown-separator">:</span>

      <div className="countdown-digit">
        <span className="countdown-num" suppressHydrationWarning>
          {mounted ? String(timeLeft.minutes).padStart(2, '0') : '00'}
        </span>
        <span className="countdown-label">Mins</span>
      </div>
      <span className="countdown-separator">:</span>

      <div className="countdown-digit">
        <span className="countdown-num" suppressHydrationWarning>
          {mounted ? String(timeLeft.seconds).padStart(2, '0') : '00'}
        </span>
        <span className="countdown-label">Secs</span>
      </div>
    </div>
  );
}
