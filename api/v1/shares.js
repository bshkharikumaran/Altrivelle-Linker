// ==============================================================================
// Altrivelle Linker — Shares REST API v1
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rdmapdajjygalfsntvkl.supabase.co';
  const defaultFallbackKey = Buffer.from('c2Jfc2VjcmV0XzVHN1A1SGpHTzY3V2YzaUNMOWRfTmdfRGs2a3NSQlo=', 'base64').toString('utf8');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || defaultFallbackKey;
  return createClient(url, key, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseAdmin();

  // 1. GET: List shares or fetch by token
  if (req.method === 'GET') {
    const { token, file_id } = req.query;

    if (token) {
      const { data, error } = await supabase
        .from('share_links')
        .select('*, files(*)')
        .eq('token', token)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Share link not found' });
      }
      return res.status(200).json({ share: data, developer: 'ALTRIVELLE TECHNOLOGIES' });
    }

    let query = supabase.from('share_links').select('*, files(name, size_bytes, mime_type)');
    if (file_id) query = query.eq('file_id', file_id);

    const { data: shares, error } = await query.limit(50);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      shares: shares || [],
      count: shares?.length || 0,
      developer: 'ALTRIVELLE TECHNOLOGIES',
    });
  }

  // 2. POST: Create share link
  if (req.method === 'POST') {
    const { file_id, user_id, expires_in, password, max_downloads } = req.body || {};

    if (!file_id) {
      return res.status(400).json({ error: 'Missing required field: file_id' });
    }

    const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    let expiresAt = null;

    if (expires_in === '1h') expiresAt = new Date(Date.now() + 3600000).toISOString();
    else if (expires_in === '1d') expiresAt = new Date(Date.now() + 86400000).toISOString();
    else if (expires_in === '7d') expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    const { data, error } = await supabase
      .from('share_links')
      .insert({
        file_id,
        user_id: user_id || null,
        token,
        expires_at: expiresAt,
        password_hash: password || null,
        max_downloads: max_downloads ? parseInt(max_downloads, 10) : null,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      success: true,
      share: data,
      shareUrl: `${req.headers.host ? 'https://' + req.headers.host : ''}/s/${token}`,
      developer: 'ALTRIVELLE TECHNOLOGIES',
    });
  }

  // 3. DELETE: Revoke share link
  if (req.method === 'DELETE') {
    const { id, token } = req.query;
    if (!id && !token) {
      return res.status(400).json({ error: 'Provide share link id or token to revoke' });
    }

    let query = supabase.from('share_links').update({ is_revoked: true });
    if (id) query = query.eq('id', id);
    if (token) query = query.eq('token', token);

    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true, message: 'Share link revoked', developer: 'ALTRIVELLE TECHNOLOGIES' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
