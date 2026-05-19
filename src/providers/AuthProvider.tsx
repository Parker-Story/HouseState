import React, { createContext, useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { registerPushToken } from '@/src/lib/pushNotifications';
import { Profile } from '@/src/types/database';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type AuthState = {
  session: import('@supabase/supabase-js').Session | null;
  user: import('@supabase/supabase-js').User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setDisplayName: (name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthState['session']>(null);
  const [user, setUser] = useState<AuthState['user']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Failed to fetch profile:', error.message);
      return null;
    }
    return data as Profile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  const setDisplayName = useCallback(async (name: string) => {
    if (!user?.id) throw new Error('No authenticated user');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Display name is required');

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: trimmed });

    if (error) throw error;

    await refreshProfile();
  }, [user, refreshProfile]);

  useEffect(() => {
    if (user?.id) registerPushToken(user.id);
  }, [user?.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      let existingSession = null;
      try {
        const { data } = await supabase.auth.getSession();
        existingSession = data.session;
      } catch (err) {
        console.warn('Failed to restore session from storage:', err);
      }

      if (existingSession?.user) {
        if (!mounted) return;
        setSession(existingSession);
        setUser(existingSession.user);
        const p = await fetchProfile(existingSession.user.id);
        if (mounted) setProfile(p);
        if (mounted) setIsLoading(false);
        return;
      }

      // No session — create anonymous user
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('Anonymous auth failed:', error.message);
          throw error;
        }
        if (data.session && mounted) {
          setSession(data.session);
          setUser(data.session.user);
          // The DB trigger may need a moment to create the profile row;
          // retry a few times with a short backoff.
          let p: Profile | null = null;
          for (let attempt = 0; attempt < 4; attempt++) {
            p = await fetchProfile(data.session.user.id);
            if (p) break;
            await new Promise((r) => setTimeout(r, 200));
          }
          if (mounted) setProfile(p);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initialize();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value: AuthState = {
    session,
    user,
    profile,
    isLoading,
    isAuthenticated: !!session?.user,
    setDisplayName,
    refreshProfile,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
