import React from 'react';
import Header from '@/components/store/Header';
import Footer from '@/components/store/Footer';
import MobileNav from '@/components/store/MobileNav';
import TelegramChatWidget from '@/components/store/TelegramChatWidget';
import { ToastProvider } from '@/components/shared/ToastProvider';
import PushNotificationPrompt from '@/components/shared/PushNotificationPrompt';
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt';
import { createClient } from '@/lib/supabase/server';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import type { Category } from '@/types';
import '@/styles/store.css';

import { getStoreSettings } from '@/lib/store-settings';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const categoryRepo = new CategoryRepository(supabase);
  let categories: Category[] = [];
  try {
    categories = await categoryRepo.findTopLevel();
  } catch (err) {
    console.error('Failed to load layout categories:', err);
  }

  const settings = await getStoreSettings();

  const dynamicThemeVars: Record<string, string> = {};
  if (settings.primary_color) dynamicThemeVars['--color-primary'] = settings.primary_color;
  if (settings.secondary_color) dynamicThemeVars['--color-primary-dark'] = settings.secondary_color;
  if (settings.accent_color) dynamicThemeVars['--color-accent'] = settings.accent_color;
  if (settings.color_bg) dynamicThemeVars['--color-bg'] = settings.color_bg;
  if (settings.color_text) dynamicThemeVars['--color-text-primary'] = settings.color_text;

  return (
    <ToastProvider>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100dvh',
          ...(dynamicThemeVars as any),
        }}
        suppressHydrationWarning
      >
        <Header
          categories={categories}
          storeName={settings.store_name}
          storeLogo={settings.store_logo_url}
          announcement={{
            enabled: settings.announcement_bar_enabled,
            text: settings.announcement_bar_text,
            link: settings.announcement_bar_link,
          }}
        />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer settings={settings} />
        <MobileNav />
        <TelegramChatWidget />
        <PushNotificationPrompt />
        <PWAInstallPrompt />
      </div>
    </ToastProvider>
  );
}
