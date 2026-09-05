'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Sparkles, Monitor, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import '@/styles/pwa-install.css';

const SESSION_DISMISS_KEY = 'pwa_prompt_dismissed_session';

export default function PWAInstallPrompt() {
  const {
    isInstalled,
    hasNativePrompt,
    isInstalling,
    device,
    showGuide,
    setShowGuide,
    installApp,
  } = usePWAInstall();

  const [showBanner, setShowBanner] = useState(false);
  const [visible, setVisible] = useState(false);
  const [storeName, setStoreName] = useState('ShopBD');

  useEffect(() => {
    // If installed as a standalone PWA, show nothing
    if (isInstalled) return;

    // Check if dismissed for current session
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_DISMISS_KEY)) {
      return;
    }

    // Read store name from meta tag if available
    const appNameEl = document.querySelector('meta[name="application-name"]');
    if (appNameEl) {
      const name = appNameEl.getAttribute('content');
      if (name) setStoreName(name);
    }

    // Delay banner entrance slightly for smooth page load experience
    const timer = setTimeout(() => {
      setShowBanner(true);
      requestAnimationFrame(() => setVisible(true));
    }, 600);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  // If already running as an installed PWA, render absolutely nothing
  if (isInstalled) {
    return null;
  }

  const handleDismiss = () => {
    setVisible(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    }
    setTimeout(() => setShowBanner(false), 350);
  };

  const handleDirectInstallClick = async () => {
    await installApp();
  };

  return (
    <>
      {/* ── Floating Install Card (Always displays when not installed) ── */}
      {showBanner && (
        <aside
          className={`pwa-install ${visible ? 'pwa-install--visible' : ''}`}
          role="dialog"
          aria-label={`Install ${storeName} App`}
          id="pwa-install-banner"
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
              <div className="pwa-install__sub">
                <Sparkles size={11} color="#f59e0b" style={{ display: 'inline', marginRight: '3px' }} />
                Free · Full Standalone App
              </div>
            </div>
          </div>

          <div className="pwa-install__features">
            <span className="pwa-install__feature">⚡ 1-Tap Launch</span>
            <span className="pwa-install__feature">🔔 Order Alerts</span>
            <span className="pwa-install__feature">📦 Offline Access</span>
          </div>

          <div className="pwa-install__actions">
            <button
              type="button"
              className="pwa-install__btn pwa-install__btn--install"
              onClick={handleDirectInstallClick}
              disabled={isInstalling}
              id="pwa-install-btn"
            >
              <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {isInstalling ? 'Installing…' : 'Direct Install'}
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
      )}

      {/* ── Guided Installation Modal (When direct prompt needs browser action) ── */}
      {showGuide && (
        <div
          className="pwa-modal-backdrop"
          onClick={() => setShowGuide(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="pwa-install__close"
              onClick={() => setShowGuide(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="pwa-modal-header">
              <img
                src="/icons/icon-192.png"
                alt={storeName}
                className="pwa-modal-icon"
              />
              <div>
                <h3 className="pwa-modal-title">Install {storeName}</h3>
                <p className="pwa-modal-desc">
                  {device === 'ios'
                    ? 'Follow 3 simple steps to install on iOS'
                    : 'Install as a dedicated native app on your device'}
                </p>
              </div>
            </div>

            {device === 'ios' ? (
              <div className="pwa-install__ios-steps" style={{ margin: '16px 0' }}>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">1</div>
                  <div className="pwa-step-text">
                    Tap the <strong>Share button (⎋)</strong> at the bottom of Safari
                  </div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">2</div>
                  <div className="pwa-step-text">
                    Scroll down and select <strong>&quot;Add to Home Screen&quot; ⊞</strong>
                  </div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">3</div>
                  <div className="pwa-step-text">
                    Tap <strong>Add</strong> in the top-right corner — it launches as a full app!
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ margin: '16px 0' }}>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">1</div>
                  <div className="pwa-step-text">
                    Look at your browser&apos;s <strong>address bar</strong> at the top right
                  </div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">2</div>
                  <div className="pwa-step-text">
                    Click the <strong>⊕ Install {storeName}</strong> or <strong>💻 app icon</strong>
                  </div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">3</div>
                  <div className="pwa-step-text">
                    Or click the browser menu <strong>(⋮)</strong> and tap <strong>&quot;Install {storeName}&quot;</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="pwa-modal-actions">
              {hasNativePrompt && (
                <button
                  type="button"
                  className="pwa-install__btn pwa-install__btn--install"
                  onClick={handleDirectInstallClick}
                  disabled={isInstalling}
                  style={{ flex: 2 }}
                >
                  <Download size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  {isInstalling ? 'Installing…' : 'Trigger Install Dialog'}
                </button>
              )}
              <button
                type="button"
                className="pwa-install__btn pwa-install__btn--dismiss"
                onClick={() => setShowGuide(false)}
                style={{ flex: 1 }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
