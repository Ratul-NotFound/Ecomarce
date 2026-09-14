'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import '@/styles/pwa-install.css';

/**
 * Persistent footer install button.
 * - Always visible (ignores the banner snooze state).
 * - Hides only when the app is confirmed installed.
 * - Shows the iOS guide modal inline for Safari users.
 */
export default function FooterInstallButton() {
  const { status, hasNativePrompt, isInstalling, device, triggerInstall } = usePWAInstall();
  const [showIosHint, setShowIosHint] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Briefly flash a success state after installing
  useEffect(() => {
    if (status === true) setJustInstalled(true);
  }, [status]);

  // SSR: render nothing
  if (status === null) return null;
  // Already installed: show a small "installed" badge instead of a button
  if (status === true || justInstalled) {
    return (
      <div className="footer-install-installed">
        <CheckCircle2 size={15} />
        <span>App Installed</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (device === 'ios') {
      setShowIosHint(v => !v);
      return;
    }
    const result = await triggerInstall();
    if (result === 'no-prompt') {
      // Desktop fallback: show the same iOS-style hint
      setShowIosHint(v => !v);
    }
  };

  return (
    <div className="footer-install-wrap">
      <button
        type="button"
        className="footer-install-btn"
        onClick={handleClick}
        disabled={isInstalling}
        id="footer-install-app-btn"
        aria-label="Install App"
        aria-expanded={showIosHint}
      >
        {isInstalling ? (
          <>
            <span className="footer-install-spinner" aria-hidden="true" />
            Installing…
          </>
        ) : (
          <>
            <Smartphone size={15} />
            Install App
            <Download size={12} style={{ opacity: 0.75 }} />
          </>
        )}
      </button>

      {/* Inline guide panel for iOS / no-native-prompt fallback */}
      {showIosHint && (
        <div className="footer-install-hint" role="status">
          {device === 'ios' ? (
            <>
              <p><strong>Tap Share ⎋</strong> in Safari</p>
              <p>→ then <strong>Add to Home Screen</strong></p>
            </>
          ) : (
            <>
              <p>Look for the <strong>⊕ install icon</strong> in your browser&apos;s address bar</p>
              <p>or open the <strong>browser menu (⋮) → Install app</strong></p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
