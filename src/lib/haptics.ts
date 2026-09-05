// src/lib/haptics.ts — Haptic feedback via Vibration API (safe in all environments)
type HapticPattern = number | number[];
function vibrate(pattern: HapticPattern) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { navigator.vibrate(pattern); } catch {}
}

export const haptics = {
  tap:       () => vibrate(10),
  doubleTap: () => vibrate([15, 30, 15]),
  success:   () => vibrate([50, 30, 50, 30, 100]),
  error:     () => vibrate([100, 50, 200]),
  cartAdd:   () => vibrate([30, 20, 80]),
  navigate:  () => vibrate(5),
  heavy:     () => vibrate([80, 40, 80, 40, 200]),
};
