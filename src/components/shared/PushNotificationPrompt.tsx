'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import '@/styles/push-prompt.css';

const DISMISS_KEY = 'pwa_push_prompt_dismissed_v2';

export default function PushNotificationPrompt() {
  const { user } = useAuth();
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [shown, setShown]     = useState(false);

  useEffect(() => {
    if (!user) return;

    // If permission was already granted by the browser, auto-subscribe silently to ensure DB record exists
    if (permission === 'granted' && !isSubscribed && !isLoading) {
      subscribe().catch(() => {});
      return;
    }

    if (permission === 'granted' || permission === 'denied' || permission === 'unsupported') return;
    if (isSubscribed) return;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)) return;

    // Show prompt 2.5s after user is authenticated
    const timer = setTimeout(() => {
      setShown(true);
      setTimeout(() => setVisible(true), 50);
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, permission, isSubscribed, isLoading, subscribe]);

  if (!shown) return null;

  const handleAllow = async () => {
    setVisible(false);
    await subscribe();
    setTimeout(() => setShown(false), 500);
  };

  const handleDismiss = () => {
    setVisible(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
    setTimeout(() => setShown(false), 500);
  };

  return (
    <div className={`push-prompt ${visible ? 'push-prompt--visible' : ''}`} role="dialog" aria-label="Enable notifications">
      <button className="push-prompt__close" onClick={handleDismiss} aria-label="Close">✕</button>
      <div className="push-prompt__bell" aria-hidden="true">🔔</div>
      <div className="push-prompt__content">
        <p className="push-prompt__title">Stay updated on your orders</p>
        <p className="push-prompt__body">
          Get instant alerts when your order status updates, or when customer support replies — even when the app is closed.
        </p>
        <div className="push-prompt__actions">
          <button className="push-prompt__btn push-prompt__btn--allow" onClick={handleAllow} disabled={isLoading} id="push-allow-btn">
            {isLoading ? 'Enabling…' : '🔔 Enable Notifications'}
          </button>
          <button className="push-prompt__btn push-prompt__btn--dismiss" onClick={handleDismiss} id="push-dismiss-btn">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
