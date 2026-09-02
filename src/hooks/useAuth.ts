'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize browser Supabase client
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (isMounted) {
          if (!error && data?.user) {
            setUser(data.user);
            await fetchProfile(data.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = async (redirectTo: string = '/auth') => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
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
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });
  };

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'admin' || profile?.role === 'moderator',
    signOut,
    signInWithGoogle,
    refreshProfile: () => (user ? fetchProfile(user.id) : Promise.resolve()),
  };
}
