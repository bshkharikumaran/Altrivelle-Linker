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

  async signInWithGoogle(options = {}) {
    const supabase = getSupabase();
    const origin = window.location.origin;
    const pathname = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    const redirectTo = options.redirectTo || `${origin}${pathname}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  isGoogleUser(user) {
    if (!user) return false;
    return (
      user.app_metadata?.provider === 'google' ||
      user.app_metadata?.providers?.includes('google') ||
      user.identities?.some((id) => id.provider === 'google') ||
      Boolean(user.user_metadata?.avatar_url?.includes('googleusercontent'))
    );
  },

  async getProfile() {
    const supabase = getSupabase();
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';
    const avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;
    const isGoogle = this.isGoogleUser(user);

    if (error || !data) {
      console.warn('Profile not found in DB, self-healing profile record:', error?.message);
      const fallbackProfile = {
        id: user.id,
        email: user.email,
        full_name: fullName,
        avatar_url: avatarUrl,
        is_google: isGoogle,
        storage_used: 0,
        storage_quota: 104857600,
        plan_tier: 'community',
        role: 'user',
      };

      try {
        const { data: created } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: avatarUrl || '',
            storage_used: 0,
            storage_quota: 104857600,
            plan_tier: 'community',
          }, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (created) return { ...created, is_google: isGoogle };
      } catch (_) {}

      return fallbackProfile;
    }

    // If profile exists in DB but user has a newer Google avatar, sync it
    if (avatarUrl && !data.avatar_url) {
      try {
        await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
        data.avatar_url = avatarUrl;
      } catch (_) {}
    }

    return { ...data, is_google: isGoogle };
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
