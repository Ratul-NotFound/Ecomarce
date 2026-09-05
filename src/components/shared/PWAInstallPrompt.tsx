'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, X, Smartphone, Sparkles, MoreVertical } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import '@/styles/pwa-install.css';

const INSTALLED_KEY = 'pwa_app_installed';
const HIDDEN_KEY    = 'pwa_banner_hidden_until';
const HIDDEN_TTL_MS = 3 * 24 * 60 * 60 * 1000; // re-show after 3 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaInstall: BeforeInstallPromptEvent | null;
  }
}

function isInstalledStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function isHiddenByUser(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const until = parseInt(localStorage.getItem(HIDDEN_KEY) || '0', 10);
  return Date.now() < until;
}

function getDeviceType(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export default function PWAInstallPrompt() {
  const [show, setShow]         = useState(false);
  const [visible, setVisible]   = useState(false);
  const [installing, setInstalling] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [storeName, setStoreName] = useState('ShopBD');
  const [device, setDevice]     = useState<'ios' | 'android' | 'desktop'>('android');
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Never show if already running as installed PWA
    if (isInstalledStandalone()) return;
    // Never show if user previously completed install
    if (typeof localStorage !== 'undefined' && localStorage.getItem(INSTALLED_KEY)) return;
    // Don't show if user hid it recently
    if (isHiddenByUser()) return;

    const deviceType = getDeviceType();
    setDevice(deviceType);

    // Read store name
    const appNameEl = document.querySelector('meta[name="application-name"]');
    if (appNameEl) setStoreName(appNameEl.getAttribute('content') || 'ShopBD');

    // -- Read the event captured by our early script in <head> --
    if (window.__pwaInstall) {
      deferredRef.current = window.__pwaInstall;
      setHasNativePrompt(true);
    }

    // Also listen for it arriving late (or arriving after we mount)
    const onReady = () => {
      if (window.__pwaInstall) {
        deferredRef.current = window.__pwaInstall;
        setHasNativePrompt(true);
      }
    };
    document.addEventListener('pwa-install-ready', onReady);

    // Listen for the app actually getting installed (native install event)
    const onInstalled = () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(INSTALLED_KEY, '1');
      }
      setShow(false);
      haptics.success();
    };
    window.addEventListener('appinstalled', onInstalled);

    // Show the banner — even without the native prompt (fallback instructions mode)
    setTimeout(() => {
      setShow(true);
      setTimeout(() => setVisible(true), 60);
    }, 800);

    return () => {
      document.removeEventListener('pwa-install-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredRef.current) return;
    haptics.heavy();
    setInstalling(true);

    try {
      await deferredRef.current.prompt(); // Opens Chrome's native WebAPK dialog
      const { outcome } = await deferredRef.current.userChoice;

      if (outcome === 'accepted') {
        haptics.success();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(INSTALLED_KEY, '1');
        }
        setVisible(false);
        setTimeout(() => setShow(false), 400);
      } else {
        // User cancelled the native dialog
        handleHide();
      }
    } catch {
      // prompt() threw — maybe already used; fall back to manual mode
      setHasNativePrompt(false);
    } finally {
      setInstalling(false);
      deferredRef.current = null;
      window.__pwaInstall = null;
    }
  };

  const handleHide = () => {
    setVisible(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HIDDEN_KEY, (Date.now() + HIDDEN_TTL_MS).toString());
    }
    setTimeout(() => setShow(false), 400);
  };

  if (!show) return null;

  /* ── iOS: step-by-step guide ─────────────────────────── */
  if (device === 'ios') {
    return (
      <aside
        className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
        role="dialog"
        aria-label="Install App on iPhone"
        id="pwa-install-ios"
      >
        <button type="button" className="pwa-install__close" onClick={handleHide} aria-label="Close">
          <X size={15} />
        </button>
        <div className="pwa-install__header">
          <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
          <div>
            <div className="pwa-install__name">{storeName}</div>
            <div className="pwa-install__sub">
              <Smartphone size={11} /> Install on iPhone / iPad
            </div>
          </div>
        </div>
        <div className="pwa-install__ios-steps">
          <div className="pwa-install__ios-step">
            <span className="pwa-install__ios-num">1</span>
            <span>Tap the <strong>Share</strong> <span style={{ fontSize: '15px' }}>⎋</span> button in Safari's toolbar</span>
          </div>
          <div className="pwa-install__ios-step">
            <span className="pwa-install__ios-num">2</span>
            <span>Scroll and tap <strong>"Add to Home Screen" ⊞</strong></span>
          </div>
          <div className="pwa-install__ios-step">
            <span className="pwa-install__ios-num">3</span>
            <span>Tap <strong>Add</strong> — opens as a full native app!</span>
          </div>
        </div>
        <button type="button" className="pwa-install__btn pwa-install__btn--dismiss" onClick={handleHide} style={{ width: '100%' }}>
          Got it
        </button>
      </aside>
    );
  }

  /* ── Android / Desktop with native prompt available ───── */
  if (hasNativePrompt) {
    return (
      <aside
        className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
        role="dialog"
        aria-label="Install App"
        id="pwa-install-banner"
      >
        <button type="button" className="pwa-install__close" onClick={handleHide} aria-label="Close">
          <X size={15} />
        </button>
        <div className="pwa-install__header">
          <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
          <div>
            <div className="pwa-install__name">{storeName}</div>
            <div className="pwa-install__sub">
              <Sparkles size={11} color="#f59e0b" /> Free · Installs as a native app
            </div>
          </div>
        </div>
        <div className="pwa-install__features">
          <span className="pwa-install__feature">⚡ Lightning fast</span>
          <span className="pwa-install__feature">🔔 Push alerts</span>
          <span className="pwa-install__feature">📦 Order tracking</span>
        </div>
        <div className="pwa-install__actions">
          <button
            type="button"
            className="pwa-install__btn pwa-install__btn--install"
            onClick={handleInstall}
            disabled={installing}
            id="pwa-install-btn"
          >
            <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            {installing ? 'Installing…' : 'Install App — Free'}
          </button>
          <button type="button" className="pwa-install__btn pwa-install__btn--dismiss" onClick={handleHide} id="pwa-install-dismiss-btn">
            Later
          </button>
        </div>
      </aside>
    );
  }

  /* ── Android / Desktop fallback: manual instructions ──── */
  return (
    <aside
      className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
      role="dialog"
      aria-label="Install App"
      id="pwa-install-manual"
    >
      <button type="button" className="pwa-install__close" onClick={handleHide} aria-label="Close">
        <X size={15} />
      </button>
      <div className="pwa-install__header">
        <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
        <div>
          <div className="pwa-install__name">Install {storeName}</div>
          <div className="pwa-install__sub">
            <Sparkles size={11} color="#f59e0b" /> Native app experience, free
          </div>
        </div>
      </div>
      <div className="pwa-install__ios-steps">
        <div className="pwa-install__ios-step">
          <span className="pwa-install__ios-num">1</span>
          <span>Tap the <strong>⋮ menu</strong> (three dots) at the top-right of Chrome</span>
        </div>
        <div className="pwa-install__ios-step">
          <span className="pwa-install__ios-num">2</span>
          <span>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></span>
        </div>
        <div className="pwa-install__ios-step">
          <span className="pwa-install__ios-num">3</span>
          <span>Tap <strong>Install</strong> — it installs as a real app, not a shortcut!</span>
        </div>
      </div>
      <button type="button" className="pwa-install__btn pwa-install__btn--dismiss" onClick={handleHide} style={{ width: '100%' }}>
        Got it
      </button>
    </aside>
  );
}
