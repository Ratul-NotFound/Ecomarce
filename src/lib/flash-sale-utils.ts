// src/lib/flash-sale-utils.ts
// ============================================================
// Single source of truth for Flash Sale countdown calculations
// and multi-client time synchronization across storefront & admin.
// ============================================================

export interface FlashSaleTimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  totalSeconds: number;
  isExpired: boolean;
}

/**
 * Computes a deterministic, zero-drift synchronized anchor for flash sales.
 * Uses Bangladesh Standard Time (UTC+6) midnight cycle by default.
 * Every user in any browser receives the EXACT same target timestamp.
 */
export function getDeterministicFlashSaleEnd(cycleHours: number = 24): Date {
  const now = new Date();
  
  // Bangladesh is UTC+6
  const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
  const bdNow = new Date(now.getTime() + BD_OFFSET_MS);

  // Target: End of current BD day at 23:59:59.999 (or cycleHours window)
  const targetBd = new Date(bdNow);
  
  if (cycleHours >= 24) {
    targetBd.setUTCHours(23, 59, 59, 999);
    // If less than 5 minutes remain in the day, roll over to the next day's midnight
    if (targetBd.getTime() - bdNow.getTime() < 5 * 60 * 1000) {
      targetBd.setUTCDate(targetBd.getUTCDate() + 1);
    }
  } else {
    // Cycle in chunks of cycleHours (e.g. 6 hours: 00:00, 06:00, 12:00, 18:00)
    const currentHour = bdNow.getUTCHours();
    const nextHourBlock = Math.floor(currentHour / cycleHours) * cycleHours + cycleHours;
    targetBd.setUTCHours(nextHourBlock, 0, 0, 0);
    if (targetBd.getTime() <= bdNow.getTime()) {
      targetBd.setUTCHours(targetBd.getUTCHours() + cycleHours);
    }
  }

  // Convert BD time back to standard UTC timestamp
  return new Date(targetBd.getTime() - BD_OFFSET_MS);
}

/**
 * Resolves the single authoritative Flash Sale end timestamp (ISO string).
 * 
 * Precedence:
 * 1. Store setting `homepage_flash_sale_end` if set and in future.
 * 2. Earliest future `flash_sale_ends_at` from active flash sale products.
 * 3. Deterministic daily anchor (midnight BST) — guarantees never null, never drifts.
 */
export function resolveFlashSaleEndTime(
  settings?: { homepage_flash_sale_end?: string | null; deals_timer_hours?: number },
  products?: Array<{ flash_sale_ends_at?: string | null; is_flash_sale?: boolean }>
): string {
  const now = Date.now();

  // 1. Store settings override
  if (settings?.homepage_flash_sale_end) {
    const settingEnd = new Date(settings.homepage_flash_sale_end).getTime();
    if (!isNaN(settingEnd) && settingEnd > now) {
      return new Date(settingEnd).toISOString();
    }
  }

  // 2. Active products with future dates
  if (products && products.length > 0) {
    const validEndTimes = products
      .filter(p => p.is_flash_sale !== false && p.flash_sale_ends_at)
      .map(p => new Date(p.flash_sale_ends_at!).getTime())
      .filter(t => !isNaN(t) && t > now);

    if (validEndTimes.length > 0) {
      const earliest = Math.min(...validEndTimes);
      return new Date(earliest).toISOString();
    }
  }

  // 3. Fallback to synchronized cycle anchor (e.g. daily midnight BST or deals_timer_hours)
  const cycleHours = settings?.deals_timer_hours && settings.deals_timer_hours > 0 ? settings.deals_timer_hours : 24;
  return getDeterministicFlashSaleEnd(cycleHours).toISOString();
}

/**
 * Calculates countdown units from a target ISO string.
 */
export function calculateTimeRemaining(targetIso: string | null): FlashSaleTimeParts {
  const now = Date.now();
  let targetTime: number;

  if (targetIso) {
    const parsed = new Date(targetIso).getTime();
    targetTime = isNaN(parsed) ? getDeterministicFlashSaleEnd().getTime() : parsed;
  } else {
    targetTime = getDeterministicFlashSaleEnd().getTime();
  }

  const diffMs = Math.max(0, targetTime - now);
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const totalHours = Math.floor(totalSeconds / 3600);

  return {
    days,
    hours,
    minutes,
    seconds,
    totalHours,
    totalSeconds,
    isExpired: diffMs <= 0,
  };
}
