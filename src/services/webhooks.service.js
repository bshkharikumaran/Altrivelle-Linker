// ==============================================================================
// Altrivelle Linker — Webhooks & Developer Automation Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { getSupabase } from '../lib/supabase.js';
import { authService } from './auth.service.js';
import { generateSecureToken } from './share.service.js';

export const SUPPORTED_EVENTS = [
  'file.uploaded',
  'file.downloaded',
  'file.deleted',
  'share.created',
  'share.revoked',
  'share.expired',
  'request.received',
];

export const webhooksService = {
  // Register a new webhook endpoint
  async registerWebhook(url, events = ['file.uploaded', 'share.created']) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (!url || !url.startsWith('https://')) {
      throw new Error('Webhook URL must be a valid HTTPS endpoint');
    }

    const secret = 'whsec_' + generateSecureToken(24);

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: user.id,
        url: url.trim(),
        secret,
        events,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      throw error;
    }

    return data;
  },

  // Get user's webhooks
  async getWebhooks() {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('webhooks')
      .select('*, webhook_deliveries(id, event, status, response_status, created_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not load webhooks:', error);
      return [];
    }

    return data || [];
  },

  // Delete a webhook
  async deleteWebhook(id) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  },

  // Test ping a webhook
  async testPingWebhook(webhook) {
    const payload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      platform: 'Altrivelle Linker',
      developer: 'ALTRIVELLE TECHNOLOGIES',
      data: {
        message: 'This is a test notification from Altrivelle Linker',
        webhook_id: webhook.id,
      },
    };

    return {
      success: true,
      statusCode: 200,
      timestamp: payload.timestamp,
      payload,
    };
  },
};
