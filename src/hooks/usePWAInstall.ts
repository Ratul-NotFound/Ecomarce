'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { haptics } from '@/lib/haptics';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstall: BeforeInstallPromptEvent | null;
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

/**
 * Accurately check if the user is currently running inside the standalone PWA application.
 * Note: Avoid checking (display-mode: fullscreen) or (display-mode: minimal-ui) as they
 * produce false positives in desktop fullscreen or mobile collapsible toolbars.
 */
export function isInstalledStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function getDeviceType(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export function usePWAInstall() {
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [hasNativePrompt, setHasNativePrompt] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [device, setDevice] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect device
    setDevice(getDeviceType());

    // Clean legacy test blocking keys from localStorage so users aren't locked out
    try {
      localStorage.removeItem('pwa_app_installed');
      localStorage.removeItem('pwa_banner_hidden_until');
      localStorage.removeItem('pwa_installed');
    } catch {}

    // Check if running standalone
    const standalone = isInstalledStandalone();
    setIsInstalled(standalone);
    if (standalone) return;

    // Check if early capture in <head> already intercepted the prompt
    const earlyPrompt = window.__pwaInstall || window.__pwaInstallPrompt;
    if (earlyPrompt) {
      deferredPromptRef.current = earlyPrompt;
      setHasNativePrompt(true);
    }

    // Listener for custom event dispatched from inline script
    const onPromptReady = () => {
      const prompt = window.__pwaInstall || window.__pwaInstallPrompt;
      if (prompt) {
        deferredPromptRef.current = prompt;
        setHasNativePrompt(true);
      }
    };

    // Direct listener on window in case event fires after React mount
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const pEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = pEvent;
      window.__pwaInstall = pEvent;
      window.__pwaInstallPrompt = pEvent;
      setHasNativePrompt(true);
    };

    // App installed listener (fired when installation completes)
    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      window.__pwaInstall = null;
      window.__pwaInstallPrompt = null;
      setIsInstalled(true);
      setHasNativePrompt(false);
      setShowGuide(false);
      haptics.success();
    };

    // Media query listener for display-mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setShowGuide(false);
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    window.addEventListener('pwa-install-ready', onPromptReady);
    document.addEventListener('pwa-install-ready', onPromptReady);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('pwa-install-ready', onPromptReady);
      document.removeEventListener('pwa-install-ready', onPromptReady);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', onMediaChange);
      }
    };
  }, []);

  const installApp = useCallback(async (): Promise<boolean> => {
    if (isInstalledStandalone()) {
      setIsInstalled(true);
      return true;
    }

    const promptEvent = deferredPromptRef.current || window.__pwaInstall || window.__pwaInstallPrompt;

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      setIsInstalling(true);
      haptics.heavy();
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          haptics.success();
          setIsInstalled(true);
          deferredPromptRef.current = null;
          window.__pwaInstall = null;
          window.__pwaInstallPrompt = null;
          setHasNativePrompt(false);
          setShowGuide(false);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
        setShowGuide(true);
        return false;
      } finally {
        setIsInstalling(false);
      }
    }

    // If native prompt is not yet ready or unsupported (iOS Safari / desktop address bar)
    setShowGuide(true);
    return false;
  }, []);

  return {
    isInstalled,
    canInstall: !isInstalled,
    hasNativePrompt,
    isInstalling,
    device,
    showGuide,
    setShowGuide,
    installApp,
  };
}
