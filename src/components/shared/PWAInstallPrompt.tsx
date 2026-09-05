'use client';
import { useEffect, useState, useCallback } from 'react';
import { Download, X, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import '@/styles/pwa-install.css';

const DISMISS_KEY = 'pwa_install_dismissed_v2';
const INSTALLED_KEY = 'pwa_app_installed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (isNaN(ts)) return false; // legacy '1' value → treat as expired
  return Date.now() - ts < DISMISS_TTL_MS;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred]       = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt]   = useState(false);
  const [showIOS, setShowIOS]         = useState(false);
  const [visible, setVisible]         = useState(false);
  const [installed, setInstalled]     = useState(false);
  const [storeName, setStoreName]     = useState('ShopBD');

  useEffect(() => {
    // 1. If already running as installed Standalone PWA, DO NOTHING
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // 2. Check if user already marked as installed
    if (typeof localStorage !== 'undefined' && localStorage.getItem(INSTALLED_KEY)) {
      setInstalled(true);
      return;
    }

    // Read application title
    const titleEl = document.querySelector('meta[name="application-name"]');
    if (titleEl) {
      setStoreName(titleEl.getAttribute('content') || 'ShopBD');
    }

    // 3. Android & Desktop Chrome native install prompt listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferred(installEvent);

      // Show install prompt quickly (1.5 seconds) if not recently dismissed (within 7 days)
      if (!isDismissed()) {
        setTimeout(() => {
          setShowPrompt(true);
          setTimeout(() => setVisible(true), 50);
        }, 1500);
      }
    };

    // 4. Listen for successful install
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setShowIOS(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(INSTALLED_KEY, '1');
      }
      haptics.success();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. iOS Safari fallback helper (if not standalone)
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS()) {
      if (!isDismissed()) {
        iosTimer = setTimeout(() => {
          setShowIOS(true);
          setTimeout(() => setVisible(true), 50);
        }, 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferred) return;
    haptics.heavy();
    
    // Trigger the real native OS app install dialog
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;

    if (outcome === 'accepted') {
      haptics.success();
      setInstalled(true);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(INSTALLED_KEY, '1');
      }
    }

    setVisible(false);
    setDeferred(null);
    setTimeout(() => setShowPrompt(false), 400);
  };

  const handleDismiss = () => {
    setVisible(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
    setTimeout(() => {
      setShowPrompt(false);
      setShowIOS(false);
    }, 400);
  };

  // If already installed as PWA standalone, render NOTHING
  if (installed || isStandalone()) {
    return null;
  }

  // Android & Desktop Chrome native install popup
  if (showPrompt && deferred) {
    return (
      <aside
        className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
        role="dialog"
        aria-label="Install App"
      >
        <button
          type="button"
          className="pwa-install__close"
          onClick={handleDismiss}
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="pwa-install__header">
          <img
            src="/icons/icon-192.png"
            alt={storeName}
            className="pwa-install__icon"
          />
          <div>
            <div className="pwa-install__name">{storeName}</div>
            <div className="pwa-install__sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} color="#f59e0b" />
              <span>Official Native App</span>
            </div>
          </div>
        </div>

        <p className="pwa-install__body">
          Install the full app on your phone for faster loading, offline access, and instant order notifications!
        </p>

        <div className="pwa-install__actions">
          <button
            type="button"
            className="pwa-install__btn pwa-install__btn--install"
            onClick={handleInstallClick}
            id="pwa-install-btn"
          >
            <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            <span>Install App</span>
          </button>
          <button
            type="button"
            className="pwa-install__btn pwa-install__btn--dismiss"
            onClick={handleDismiss}
            id="pwa-install-dismiss-btn"
          >
            Later
          </button>
        </div>
      </aside>
    );
  }

  // iOS Safari "Add to Home Screen" guide
  if (showIOS) {
    return (
      <aside
        className={`pwa-ios-guide ${visible ? 'pwa-ios-guide--visible' : ''}`}
        role="dialog"
        aria-label="Install on iPhone"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
            <Smartphone size={15} color="var(--color-primary)" />
            <span>Install {storeName} on iOS</span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>

        <p style={{ margin: '0 0 6px', fontSize: '12px', lineHeight: 1.4, color: '#cbd5e1' }}>
          Tap the <strong>Share</strong> button <span style={{ fontSize: '14px' }}>⎋</span> at the bottom of Safari, then scroll and select <strong>&ldquo;Add to Home Screen ⊞&rdquo;</strong>.
        </p>
      </aside>
    );
  }

  return null;
}
