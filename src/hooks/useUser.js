/**
 * useUser
 *
 * Subscribes to Supabase Auth state and returns the current user.
 * - { user: null, loading: true }  while the session is being resolved on mount
 * - { user: User, loading: false } when signed in
 * - { user: null, loading: false } when signed out
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useUser() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resolve the existing session synchronously on first render
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to future auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
