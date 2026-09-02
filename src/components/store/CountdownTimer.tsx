'use client';

import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string | null;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 12,
    minutes: 34,
    seconds: 56,
  });

  useEffect(() => {
    // If target date is provided, calculate delta, otherwise use rolling 24h timer
    const target = targetDate ? new Date(targetDate).getTime() : Date.now() + 24 * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="countdown-wrapper">
      <div className="countdown-digit">
        <div className="countdown-num">{String(timeLeft.hours).padStart(2, '0')}</div>
        <div className="countdown-label">Hours</div>
      </div>
      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)' }}>:</span>
      <div className="countdown-digit">
        <div className="countdown-num">{String(timeLeft.minutes).padStart(2, '0')}</div>
        <div className="countdown-label">Mins</div>
      </div>
      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)' }}>:</span>
      <div className="countdown-digit">
        <div className="countdown-num">{String(timeLeft.seconds).padStart(2, '0')}</div>
        <div className="countdown-label">Secs</div>
      </div>
    </div>
  );
}
