'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) {
          setUser(user);
          if (user) {
            await fetchProfile(user.id);
          }
        }
      } catch (err) {
        console.error('Error fetching auth user:', err);
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback${
      redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    }`;
    await supabase.auth.signInWithOAuth({
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
