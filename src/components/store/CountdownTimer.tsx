'use client';

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string | null;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    hours: 12,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    // If target date is provided, calculate delta, otherwise use rolling 24h timer
    const target = targetDate ? new Date(targetDate).getTime() : Date.now() + 24 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="countdown-wrapper" suppressHydrationWarning>
      <div className="countdown-digit">
        <span className="countdown-num" suppressHydrationWarning>
          {mounted ? String(timeLeft.hours).padStart(2, '0') : '12'}
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
