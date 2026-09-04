'use client';

import { createClient } from '@/lib/supabase/client';
import { useSyncExternalStore, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

// ============================================================
// GLOBAL CLIENT-SIDE AUTH SINGLETON STORE
// Ensures only ONE auth state listener and ONE profile fetch
// exists across all components (Header, MobileNav, 50+ ProductCards, etc.)
// Prevents 40+ duplicate Supabase network round-trips per page.
// ============================================================

interface AuthStoreState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

let state: AuthStoreState = {
  user: null,
  profile: null,
  loading: true,
};

const listeners = new Set<() => void>();
let isInitialized = false;
let browserSupabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!browserSupabase) {
    browserSupabase = createClient();
  }
  return browserSupabase;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function extractAvatarUrl(user?: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  if (meta.avatar_url && typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) return meta.avatar_url;
  if (meta.picture && typeof meta.picture === 'string' && meta.picture.trim()) return meta.picture;
  if (Array.isArray(user.identities)) {
    for (const id of user.identities) {
      const idData = id.identity_data || {};
      if (idData.avatar_url && typeof idData.avatar_url === 'string' && idData.avatar_url.trim()) return idData.avatar_url;
      if (idData.picture && typeof idData.picture === 'string' && idData.picture.trim()) return idData.picture;
    }
  }
  return null;
}

async function fetchProfileSingleton(userId: string, authUser?: User | null) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const googleAvatar = extractAvatarUrl(authUser);
    const resolvedName =
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      authUser?.identities?.[0]?.identity_data?.full_name ||
      authUser?.identities?.[0]?.identity_data?.name ||
      authUser?.email?.split('@')[0] ||
      'Customer';

    if (data) {
      const profileData = { ...data } as Profile;
      if (!profileData.avatar_url && googleAvatar) {
        profileData.avatar_url = googleAvatar;
        supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', userId).then();
      }
      state = { ...state, profile: profileData };
      notify();
    } else {
      const fallbackProfile: Profile = {
        id: userId,
        full_name: resolvedName,
        phone: authUser?.user_metadata?.phone || null,
        avatar_url: googleAvatar,
        role: 'customer',
        referral_code: userId.slice(0, 8),
        referred_by: null,
        points: 0,
        created_at: new Date().toISOString(),
      };
      state = { ...state, profile: fallbackProfile };
      notify();

      supabase.from('profiles').upsert({
        id: userId,
        full_name: resolvedName,
        avatar_url: googleAvatar,
        role: 'customer',
      }).then();
    }
  } catch (err) {
    console.error('Failed to load profile:', err);
  }
}

async function initAuthSingleton() {
  if (isInitialized) return;
  isInitialized = true;
  const supabase = getSupabase();

  try {
    // 1. Instant local session lookup (0ms latency from localStorage)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      state = { ...state, user: session.user, loading: false };
      notify();
      fetchProfileSingleton(session.user.id, session.user);
    }

    // 2. Validate in background once
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      state = { ...state, user, loading: false };
      notify();
      await fetchProfileSingleton(user.id, user);
    } else {
      state = { ...state, user: null, profile: null, loading: false };
      notify();
    }
  } catch (err) {
    console.error('Error fetching auth user:', err);
    state = { ...state, loading: false };
    notify();
  }

  // 3. Single centralized event subscription
  supabase.auth.onAuthStateChange(async (event, session) => {
    const currentUser = session?.user ?? null;
    state = { ...state, user: currentUser, loading: false };
    if (currentUser) {
      notify();
      await fetchProfileSingleton(currentUser.id, currentUser);
    } else {
      state = { ...state, profile: null };
      notify();
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!isInitialized && typeof window !== 'undefined') {
    initAuthSingleton();
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AuthStoreState {
  return state;
}

const serverSnapshot: AuthStoreState = {
  user: null,
  profile: null,
  loading: false,
};

function getServerSnapshot(): AuthStoreState {
  return serverSnapshot;
}

const signOut = async (redirectTo: string = '/auth') => {
  try {
    state = { ...state, loading: true };
    notify();
    await getSupabase().auth.signOut();
  } catch (err) {
    console.warn('Sign out warning:', err);
  } finally {
    state = { user: null, profile: null, loading: false };
    notify();
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }
};

const signInWithGoogle = async (redirectTo?: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${origin}/auth/callback${
    redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
  }`;
  return getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  });
};

export function useAuth() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refreshProfile = useCallback(() => {
    return current.user ? fetchProfileSingleton(current.user.id, current.user) : Promise.resolve();
  }, [current.user]);

  const isSuperAdmin = Boolean(
    current.user?.id === '17267732-4774-45f6-8cfc-40ef0cdd602d' ||
    current.user?.user_metadata?.is_super_admin === true ||
    (current.user?.email && current.user.email.toLowerCase().trim() === 'm.h.ratul18@gmail.com')
  );

  const effectiveRole: 'super_admin' | 'admin' | 'moderator' | 'customer' =
    isSuperAdmin ? 'super_admin' :
    current.profile?.role === 'admin' ? 'admin' :
    current.profile?.role === 'moderator' ? 'moderator' :
    'customer';

  return {
    user: current.user,
    profile: current.profile,
    loading: current.loading,
    isAdmin: current.profile?.role === 'admin' || isSuperAdmin,
    isModerator: current.profile?.role === 'admin' || current.profile?.role === 'moderator' || isSuperAdmin,
    isSuperAdmin,
    effectiveRole,
    signOut,
    signInWithGoogle,
    refreshProfile,
  };
}
