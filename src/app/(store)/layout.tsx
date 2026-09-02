import React from 'react';
import Header from '@/components/store/Header';
import Footer from '@/components/store/Footer';
import MobileNav from '@/components/store/MobileNav';
import TelegramChatWidget from '@/components/store/TelegramChatWidget';
import { ToastProvider } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/server';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import type { Category } from '@/types';
import '@/styles/store.css';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const categoryRepo = new CategoryRepository(supabase);
  let categories: Category[] = [];
  try {
    categories = await categoryRepo.findTopLevel();
  } catch (err) {
    console.error('Failed to load layout categories:', err);
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }} suppressHydrationWarning>
        <Header categories={categories} />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
        <MobileNav />
        <TelegramChatWidget />
      </div>
    </ToastProvider>
  );
}
