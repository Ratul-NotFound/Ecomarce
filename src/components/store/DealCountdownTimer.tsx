'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Flame } from 'lucide-react';

interface DealCountdownTimerProps {
  targetHours?: number;
}

export default function DealCountdownTimer({ targetHours = 8 }: DealCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: targetHours,
    minutes: 42,
    seconds: 15,
  });

  useEffect(() => {
    // Calculate countdown from persistent or fixed window
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        }
        if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        }
        if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: targetHours, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetHours]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="deal-countdown-box">
      <div className="deal-countdown-badge">
        <Flame size={14} className="deal-flame-icon" />
        <span>LIMITED TIME OFFER</span>
      </div>

      <div className="deal-countdown-digits">
        <div className="deal-digit-group">
          <span className="deal-digit">{pad(timeLeft.hours)}</span>
          <span className="deal-digit-label">HOURS</span>
        </div>
        <span className="deal-digit-separator">:</span>
        <div className="deal-digit-group">
          <span className="deal-digit">{pad(timeLeft.minutes)}</span>
          <span className="deal-digit-label">MINS</span>
        </div>
        <span className="deal-digit-separator">:</span>
        <div className="deal-digit-group">
          <span className="deal-digit">{pad(timeLeft.seconds)}</span>
          <span className="deal-digit-label">SECS</span>
        </div>
      </div>
    </div>
  );
}
