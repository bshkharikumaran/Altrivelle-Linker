import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config.js';

let supabaseClient = null;

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (APP_CONFIG.isConfigured()) {
    try {
      supabaseClient = createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabaseClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  }

  // Fallback safe dummy client if keys are not set up yet
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error('Supabase URL and Anon Key are not yet configured. Please set them in .env'),
      }),
      signUp: async () => ({
        data: null,
        error: new Error('Supabase URL and Anon Key are not yet configured. Please set them in .env'),
      }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({
        error: new Error('Supabase URL and Anon Key are not yet configured. Please set them in .env'),
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        order: () => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase credentials not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase credentials not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase credentials not configured') }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: new Error('Supabase credentials not configured') }),
        createSignedUrl: () => Promise.resolve({ data: null, error: new Error('Supabase credentials not configured') }),
        remove: () => Promise.resolve({ error: new Error('Supabase credentials not configured') }),
      }),
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  };
}

export const supabase = getSupabase();
