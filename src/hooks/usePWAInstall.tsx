'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DeviceType = 'ios' | 'android' | 'desktop';

/**
 * Three-state install status:
 *   null    = not yet determined (SSR / first paint — render nothing install-related)
 *   true    = confirmed installed as standalone PWA
 *   false   = confirmed NOT installed
 */
export type InstallStatus = null | boolean;

export interface PWAInstallState {
  /** null while detecting, true if installed, false if not installed */
  status: InstallStatus;
  /** Chrome has fired beforeinstallprompt and is ready for a real WebAPK/app install */
  hasNativePrompt: boolean;
  /** Install is in progress (prompt shown, waiting for user choice) */
  isInstalling: boolean;
  /** Device platform */
  device: DeviceType;
  /**
   * Trigger Chrome's native install dialog.
   * Returns 'installed' if user accepted, 'dismissed' if declined, 'no-prompt' if Chrome isn't ready.
   */
  triggerInstall: () => Promise<'installed' | 'dismissed' | 'no-prompt'>;
}

declare global {
  interface Window {
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if the page is running as an installed standalone PWA right now. */
export function isInstalledStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

export function getDeviceType(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

// ─── Context (single state machine shared across all consumers) ──────────────

const PWAInstallContext = createContext<PWAInstallState | null>(null);

// ─── Provider (mount once in store layout) ───────────────────────────────────

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  // null = unknown (before client-side detection), true = installed, false = not installed
  const [status, setStatus] = useState<InstallStatus>(null);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 1. Immediately detect if already installed
    const installed = isInstalledStandalone();
    setStatus(installed);
    setDevice(getDeviceType());

    if (installed) return; // already installed — no need to track prompts

    // 2. Capture prompt intercepted by the early inline <head> script
    if (window.__pwaInstallPrompt) {
      deferredPromptRef.current = window.__pwaInstallPrompt;
      setHasNativePrompt(true);
    }

    // 3. Chrome fires this when it's ready to install as a real WebAPK/app
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // prevent the browser's automatic mini-infobar
      const evt = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = evt;
      window.__pwaInstallPrompt = evt;
      setHasNativePrompt(true);
    };

    // 4. Custom event from inline <head> script (fires when it captures the prompt early)
    const onInstallReady = () => {
      if (window.__pwaInstallPrompt) {
        deferredPromptRef.current = window.__pwaInstallPrompt;
        setHasNativePrompt(true);
      }
    };

    // 5. Fires after installation is fully complete
    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      window.__pwaInstallPrompt = null;
      setStatus(true);
      setHasNativePrompt(false);
    };

    // 6. Detect if app launched in standalone mode (e.g. user opened it from home screen)
    const mq = window.matchMedia('(display-mode: standalone)');
    const onMQChange = (e: MediaQueryListEvent) => {
      if (e.matches) setStatus(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('pwa-install-ready', onInstallReady);
    window.addEventListener('pwa-installed', onAppInstalled);
    mq.addEventListener?.('change', onMQChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('pwa-install-ready', onInstallReady);
      window.removeEventListener('pwa-installed', onAppInstalled);
      mq.removeEventListener?.('change', onMQChange);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'installed' | 'dismissed' | 'no-prompt'> => {
    // Re-check live — React state may be 1 render behind
    if (isInstalledStandalone()) {
      setStatus(true);
      return 'installed';
    }

    const prompt = deferredPromptRef.current ?? window.__pwaInstallPrompt;
    if (!prompt || typeof prompt.prompt !== 'function') {
      return 'no-prompt';
    }

    setIsInstalling(true);
    try {
      // This opens Chrome's real install dialog (WebAPK on Android, app install on desktop).
      // It is NOT "Add to Home Screen" — Chrome controls this dialog entirely.
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;

      // The prompt object can only be used once — discard it regardless of outcome
      deferredPromptRef.current = null;
      window.__pwaInstallPrompt = null;
      setHasNativePrompt(false);

      if (outcome === 'accepted') {
        // appinstalled event will also fire; we update status here for instant UI response
        setStatus(true);
        return 'installed';
      }
      return 'dismissed';
    } catch {
      return 'no-prompt';
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return (
    <PWAInstallContext.Provider value={{ status, hasNativePrompt, isInstalling, device, triggerInstall }}>
      {children}
    </PWAInstallContext.Provider>
  );
}

// ─── Hook used by components ─────────────────────────────────────────────────

export function usePWAInstall(): PWAInstallState {
  const ctx = useContext(PWAInstallContext);
  if (!ctx) throw new Error('usePWAInstall must be used inside <PWAInstallProvider>');
  return ctx;
}
