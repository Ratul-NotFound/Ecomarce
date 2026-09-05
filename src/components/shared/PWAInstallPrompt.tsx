'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, X, Smartphone, Sparkles, Star } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import '@/styles/pwa-install.css';

const INSTALLED_KEY = 'pwa_app_installed';
const HIDDEN_KEY = 'pwa_banner_hidden_until';
const HIDDEN_TTL_MS = 3 * 24 * 60 * 60 * 1000; // re-show after 3 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Check if the app is running as a properly installed standalone PWA
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

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

export default function PWAInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [storeName, setStoreName] = useState('ShopBD');
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as real standalone PWA — show nothing
    if (isInstalledStandalone()) return;
    // User explicitly installed (appinstalled event fired before) — show nothing
    if (typeof localStorage !== 'undefined' && localStorage.getItem(INSTALLED_KEY)) return;
    // User hid it recently
    if (isHiddenByUser()) return;

    // Read store name from meta tag
    const appNameEl = document.querySelector('meta[name="application-name"]');
    if (appNameEl) setStoreName(appNameEl.getAttribute('content') || 'ShopBD');

    const isIosDevice = isIOS();
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // iOS: no beforeinstallprompt — just show the guide banner directly
      setCanInstall(true);
      setTimeout(() => setVisible(true), 100);
      return;
    }

    // Android/Desktop: capture the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault(); // Suppress Chrome's own mini-infobar
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      // Show immediately — no delay hiding behind a timer
      setTimeout(() => setVisible(true), 100);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setVisible(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(INSTALLED_KEY, '1');
      }
      haptics.success();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (isIos) {
      // iOS can't be programmatically installed — keep guide visible
      return;
    }
    if (!deferredRef.current) return;

    haptics.heavy();
    setInstalling(true);

    try {
      // THIS opens Chrome's native WebAPK install dialog
      await deferredRef.current.prompt();
      const { outcome } = await deferredRef.current.userChoice;

      if (outcome === 'accepted') {
        haptics.success();
        setCanInstall(false);
        setVisible(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(INSTALLED_KEY, '1');
        }
      } else {
        // User dismissed the native dialog — hide our banner for 3 days
        handleHide();
      }
    } catch {
      // prompt() can throw if called at wrong time
    } finally {
      setInstalling(false);
      deferredRef.current = null;
    }
  };

  const handleHide = () => {
    setVisible(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HIDDEN_KEY, (Date.now() + HIDDEN_TTL_MS).toString());
    }
    setTimeout(() => setCanInstall(false), 400);
  };

  if (!canInstall) return null;

  // iOS guide banner
  if (isIos) {
    return (
      <aside
        className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
        role="dialog"
        aria-label="Install App on iPhone"
        id="pwa-install-ios"
      >
        <button
          type="button"
          className="pwa-install__close"
          onClick={handleHide}
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="pwa-install__header">
          <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
          <div>
            <div className="pwa-install__name">{storeName}</div>
            <div className="pwa-install__sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Smartphone size={11} color="#a5b4fc" />
              <span>Install on iPhone / iPad</span>
            </div>
          </div>
        </div>

        <div className="pwa-install__ios-steps">
          <div className="pwa-install__ios-step">
            <span className="pwa-install__ios-num">1</span>
            <span>Tap the <strong>Share</strong> button <span style={{ fontSize: '15px' }}>⎋</span> in Safari</span>
          </div>
          <div className="pwa-install__ios-step">
            <span className="pwa-install__ios-num">2</span>
            <span>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> ⊞</span>
          </div>
          <div className="pwa-install__ios-step">
            <span className="pwa-install__ios-num">3</span>
            <span>Tap <strong>Add</strong> — the app installs like a native app!</span>
          </div>
        </div>
      </aside>
    );
  }

  // Android / Desktop — native install prompt available
  return (
    <aside
      className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
      role="dialog"
      aria-label="Install App"
      id="pwa-install-banner"
    >
      <button
        type="button"
        className="pwa-install__close"
        onClick={handleHide}
        aria-label="Close"
      >
        <X size={15} />
      </button>

      <div className="pwa-install__header">
        <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
        <div>
          <div className="pwa-install__name">{storeName}</div>
          <div className="pwa-install__sub" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={11} color="#f59e0b" />
            <span>Free • Installs like a native app</span>
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
          <span>{installing ? 'Installing…' : 'Install App — Free'}</span>
        </button>
        <button
          type="button"
          className="pwa-install__btn pwa-install__btn--dismiss"
          onClick={handleHide}
          id="pwa-install-dismiss-btn"
        >
          Later
        </button>
      </div>
    </aside>
  );
}
