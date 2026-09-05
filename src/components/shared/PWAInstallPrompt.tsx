'use client';
import { useEffect, useState } from 'react';
import { haptics } from '@/lib/haptics';
import '@/styles/pwa-install.css';

const INSTALL_KEY = 'pwa_install_dismissed_v1';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred]       = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS]         = useState(false);
  const [visible, setVisible]         = useState(false);
  const [storeName, setStoreName]     = useState('This App');

  useEffect(() => {
    if (isStandalone()) return;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(INSTALL_KEY)) return;

    // Try to get store name from meta tag if available
    const titleEl = document.querySelector('meta[name="application-name"]');
    if (titleEl) setStoreName(titleEl.getAttribute('content') || 'This App');

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferred(e);
      setTimeout(() => { setShowAndroid(true); setTimeout(() => setVisible(true), 50); }, 30_000);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS()) {
      iosTimer = setTimeout(() => setShowIOS(true), 20_000);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    haptics.heavy();
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') haptics.success();
    setVisible(false); setDeferred(null);
    setTimeout(() => setShowAndroid(false), 400);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(INSTALL_KEY, '1');
    setTimeout(() => { setShowAndroid(false); setShowIOS(false); }, 400);
  };

  if (showAndroid) {
    return (
      <div className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`} role="dialog">
        <div className="pwa-install__header">
          <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
          <div>
            <div className="pwa-install__name">{storeName}</div>
            <div className="pwa-install__sub">Add to Home Screen</div>
          </div>
        </div>
        <p className="pwa-install__body">Install for instant access — no app store needed. Works like a native app!</p>
        <div className="pwa-install__actions">
          <button className="pwa-install__btn pwa-install__btn--install" onClick={handleInstall} id="pwa-install-btn">Install App</button>
          <button className="pwa-install__btn pwa-install__btn--dismiss" onClick={handleDismiss} id="pwa-install-dismiss-btn">Later</button>
        </div>
      </div>
    );
  }

  if (showIOS) {
    return (
      <div className="pwa-ios-guide" role="dialog">
        <p>📲 Install <strong>{storeName}</strong> — tap <strong>Share ↑</strong> then <strong>&ldquo;Add to Home Screen&rdquo;</strong>!</p>
        <button onClick={handleDismiss} style={{ marginTop: 8, background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Dismiss</button>
      </div>
    );
  }

  return null;
}
