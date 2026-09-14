'use client';

import { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import '@/styles/pwa-install.css';

export default function PWAInstallPrompt() {
  const { status, hasNativePrompt, isInstalling, device, triggerInstall } = usePWAInstall();

  const [showIosGuide, setShowIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [storeName, setStoreName] = useState('ShopBD');

  // Read store name from meta once on mount
  useEffect(() => {
    const el = document.querySelector<HTMLMetaElement>('meta[name="application-name"]');
    if (el?.content) setStoreName(el.content);
  }, []);

  // Animate in the banner once we know Chrome is ready
  useEffect(() => {
    if (status === false && hasNativePrompt && !dismissed) {
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [status, hasNativePrompt, dismissed]);

  // ── Nothing to render cases ────────────────────────────────────────────────

  // SSR / detecting: render nothing at all (prevents flash)
  if (status === null) return null;

  // Already installed: render nothing
  if (status === true) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInstall = async () => {
    if (device === 'ios') {
      setShowIosGuide(true);
      return;
    }
    const result = await triggerInstall();
    if (result === 'no-prompt' && device !== 'android') {
      // Desktop fallback: guide them to the browser's address bar install icon
      setShowIosGuide(true); // reuse modal, message adapts to device
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 350);
  };

  // ── Show conditions ────────────────────────────────────────────────────────

  // On iOS: always show the install option (no native prompt possible on iOS)
  const showIosBanner = device === 'ios' && !dismissed;

  // On Android/Desktop: only show when Chrome has the native prompt ready
  const showNativeBanner = hasNativePrompt && !dismissed;

  const showBanner = showNativeBanner || showIosBanner;

  return (
    <>
      {/* ── Floating Install Card ───────────────────────────────────────── */}
      {showBanner && (
        <aside
          className={`pwa-install ${visible || showIosBanner ? 'pwa-install--visible' : ''}`}
          role="complementary"
          aria-label={`Install ${storeName} App`}
          id="pwa-install-banner"
        >
          <button
            type="button"
            className="pwa-install__close"
            onClick={handleDismiss}
            aria-label="Close install banner"
          >
            <X size={15} />
          </button>

          <div className="pwa-install__header">
            <img src="/icons/icon-192.png" alt={storeName} className="pwa-install__icon" />
            <div>
              <div className="pwa-install__name">{storeName}</div>
              <div className="pwa-install__sub">
                <Sparkles size={11} color="#f59e0b" style={{ display: 'inline', marginRight: 3 }} />
                Free · Install as Native App
              </div>
            </div>
          </div>

          <div className="pwa-install__features">
            <span className="pwa-install__feature">⚡ Instant Launch</span>
            <span className="pwa-install__feature">🔔 Order Alerts</span>
            <span className="pwa-install__feature">📦 Works Offline</span>
          </div>

          {device === 'ios' && (
            <div className="pwa-install__hint">
              <span className="pwa-install__hint-icon">ℹ️</span>
              <span>On iOS: tap <strong>Share ⎋</strong> → <strong>Add to Home Screen</strong> in Safari to install.</span>
            </div>
          )}

          <div className="pwa-install__actions">
            {device !== 'ios' && (
              <button
                type="button"
                className="pwa-install__btn pwa-install__btn--install"
                onClick={handleInstall}
                disabled={isInstalling}
                id="pwa-install-btn"
              >
                <Download size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {isInstalling ? 'Installing…' : 'Install App'}
              </button>
            )}
            <button
              type="button"
              className="pwa-install__btn pwa-install__btn--dismiss"
              onClick={handleDismiss}
              id="pwa-install-dismiss-btn"
            >
              {device === 'ios' ? 'Got it' : 'Later'}
            </button>
          </div>
        </aside>
      )}

      {/* ── iOS / Desktop Guide Modal ─────────────────────────────────────── */}
      {showIosGuide && (
        <div
          className="pwa-modal-backdrop"
          onClick={() => setShowIosGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-label="How to install"
        >
          <div className="pwa-modal-card" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="pwa-install__close"
              onClick={() => setShowIosGuide(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="pwa-modal-header">
              <img src="/icons/icon-192.png" alt={storeName} className="pwa-modal-icon" />
              <div>
                <h3 className="pwa-modal-title">Install {storeName}</h3>
                <p className="pwa-modal-desc">
                  {device === 'ios' ? 'Install on iOS in 3 steps' : 'Install from your browser'}
                </p>
              </div>
            </div>

            {device === 'ios' ? (
              <div style={{ margin: '16px 0' }}>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">1</div>
                  <div className="pwa-step-text">Tap the <strong>Share button (⎋)</strong> at the bottom of Safari</div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">2</div>
                  <div className="pwa-step-text">Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">3</div>
                  <div className="pwa-step-text">Tap <strong>Add</strong> — it opens as a full standalone app!</div>
                </div>
              </div>
            ) : (
              <div style={{ margin: '16px 0' }}>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">1</div>
                  <div className="pwa-step-text">Look at the <strong>address bar</strong> in Chrome — top right</div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">2</div>
                  <div className="pwa-step-text">Click the <strong>Install icon (⊕)</strong> or &quot;Install {storeName}&quot;</div>
                </div>
                <div className="pwa-step-card">
                  <div className="pwa-step-badge">3</div>
                  <div className="pwa-step-text">Or open the <strong>browser menu (⋮)</strong> and tap <strong>&quot;Install app&quot;</strong></div>
                </div>
              </div>
            )}

            <div className="pwa-modal-actions">
              <button
                type="button"
                className="pwa-install__btn pwa-install__btn--dismiss"
                onClick={() => setShowIosGuide(false)}
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


