import { getSupabase } from '../lib/supabase.js';

export const authService = {
  async signUp(email, password, fullName) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email) {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/#reset-password',
    });

    if (error) throw error;
    return data;
  },

  async getCurrentUser() {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  },

  async getSession() {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  },

  async getProfile() {
    const supabase = getSupabase();
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('Could not fetch profile:', error.message);
      // Return fallback profile structure
      return {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        storage_used: 0,
        storage_quota: 104857600,
      };
    }

    return data;
  },

  async updateProfile(updates) {
    const supabase = getSupabase();
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback) {
    const supabase = getSupabase();
    return supabase.auth.onAuthStateChange(callback);
  },
};
