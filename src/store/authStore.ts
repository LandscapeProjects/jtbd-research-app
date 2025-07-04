import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  },

  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (error) throw error;

    // The trigger will automatically create the profile
    // But let's ensure it exists with a manual check
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email,
          full_name: fullName,
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }
  },

  signOut: async () => {
    try {
      console.log('🚪 Starting clean logout...');
      
      // 1. Clear local state immediately to prevent auth guards from triggering
      set({ 
        user: null, 
        profile: null, 
        loading: false 
      });
      
      // 2. Sign out from Supabase (don't await to prevent delays)
      supabase.auth.signOut().catch(error => {
        console.error('Supabase signOut error (non-blocking):', error);
      });
      
      // 3. Clear any cached data
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. Single clean redirect to root (which will show login)
      window.location.href = '/';
      
    } catch (error) {
      console.error('Logout error:', error);
      // Force clean redirect even on error
      set({ user: null, profile: null, loading: false });
      window.location.href = '/';
    }
  },

  initialize: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try to get profile, create if missing
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // If profile doesn't exist, create it
        if (error && error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 'User',
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            profile = newProfile;
          }
        }

        set({ user, profile });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 User signed out, clearing state');
        set({ user: null, profile: null });
        return;
      }

      if (session?.user) {
        // Get or create profile
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // If profile doesn't exist, create it
        if (error && error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || 
                        session.user.email?.split('@')[0] || 'User',
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
          } else {
            profile = newProfile;
          }
        }

        set({ user: session.user, profile });
      }
    });
  },
}));