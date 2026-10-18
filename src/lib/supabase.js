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

  // Safe chainable fallback query builder
  const createChainableQuery = () => {
    const chain = {
      select: () => chain,
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => chain,
      delete: () => chain,
      eq: () => chain,
      neq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null, count: 0 }),
    };
    return chain;
  };

  // Fallback safe dummy client if keys are not set up yet
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error('Supabase credentials not configured.'),
      }),
      signUp: async () => ({
        data: null,
        error: new Error('Supabase credentials not configured.'),
      }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({
        error: new Error('Supabase credentials not configured.'),
      }),
    },
    from: () => createChainableQuery(),
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
