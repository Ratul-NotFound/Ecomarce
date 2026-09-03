'use client';

import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { calculateTimeRemaining, type FlashSaleTimeParts } from '@/lib/flash-sale-utils';

interface DealCountdownTimerProps {
  targetDate?: string | null;
  targetHours?: number;
}

export default function DealCountdownTimer({ targetDate = null }: DealCountdownTimerProps) {
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

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="deal-countdown-box" suppressHydrationWarning>
      <div className="deal-countdown-badge">
        <Flame size={14} className="deal-flame-icon" />
        <span>LIMITED TIME OFFER</span>
      </div>

      <div className="deal-countdown-digits" suppressHydrationWarning>
        {mounted && timeLeft.days > 0 && (
          <>
            <div className="deal-digit-group">
              <span className="deal-digit">{pad(timeLeft.days)}</span>
              <span className="deal-digit-label">DAYS</span>
            </div>
            <span className="deal-digit-separator">:</span>
          </>
        )}

        <div className="deal-digit-group">
          <span className="deal-digit">{mounted ? pad(timeLeft.hours) : '00'}</span>
          <span className="deal-digit-label">HOURS</span>
        </div>
        <span className="deal-digit-separator">:</span>

        <div className="deal-digit-group">
          <span className="deal-digit">{mounted ? pad(timeLeft.minutes) : '00'}</span>
          <span className="deal-digit-label">MINS</span>
        </div>
        <span className="deal-digit-separator">:</span>

        <div className="deal-digit-group">
          <span className="deal-digit">{mounted ? pad(timeLeft.seconds) : '00'}</span>
          <span className="deal-digit-label">SECS</span>
        </div>
      </div>
    </div>
  );
}
