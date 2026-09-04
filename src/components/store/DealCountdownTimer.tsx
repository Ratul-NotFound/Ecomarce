'use client';

import React from 'react';
import CountdownTimer, { type CountdownTimerProps } from './CountdownTimer';

export default function DealCountdownTimer(props: CountdownTimerProps) {
  return <CountdownTimer {...props} variant="deal" />;
}
