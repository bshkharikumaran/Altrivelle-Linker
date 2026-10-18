import { getSupabase } from '../lib/supabase.js';
import { authService } from './auth.service.js';

// Generate cryptographically secure random token
export function generateSecureToken(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export const shareService = {
  // Calculate expiration ISO string from duration preset
  calculateExpiration(durationPreset, customDate = null) {
    if (!durationPreset || durationPreset === 'never') return null;
    if (durationPreset === 'custom' && customDate) {
      return new Date(customDate).toISOString();
    }

    const now = new Date();
    switch (durationPreset) {
      case '1h':
        now.setHours(now.getHours() + 1);
        break;
      case '1d':
        now.setDate(now.getDate() + 1);
        break;
      case '7d':
        now.setDate(now.getDate() + 7);
        break;
      case '30d':
        now.setDate(now.getDate() + 30);
        break;
      default:
        return null;
    }
    return now.toISOString();
  },

  async createShareLink(fileId, options = {}) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated. Please sign in to create share links.');

    const {
      duration = '7d',
      customDate = null,
      password = null,
      maxDownloads = null,
      file = null,
    } = options;

    const token = generateSecureToken(14);
    const expiresAt = this.calculateExpiration(duration, customDate);

    const { data, error } = await supabase
      .from('share_links')
      .insert({
        file_id: fileId,
        user_id: user.id,
        token,
        expires_at: expiresAt,
        is_revoked: false,
        max_downloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
        password_hash: password && password.trim() ? password.trim() : null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating share link:', error);
      throw error;
    }

    const fileMeta = file || data?.files || { name: 'file', mime_type: '' };

    return {
      ...data,
      files: fileMeta,
      shareUrl: this.buildShareUrl(token),
      directFileUrl: this.buildDirectFileUrl(token),
      htmlSnippet: this.buildHtmlSnippet(fileMeta, token),
    };
  },

  async getFileShareLinks(fileId, file = null) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((link) => ({
        ...link,
        shareUrl: this.buildShareUrl(link.token),
        directFileUrl: this.buildDirectFileUrl(link.token),
        htmlSnippet: this.buildHtmlSnippet(file || link.files || { name: 'file' }, link.token),
        isExpired: link.expires_at ? new Date(link.expires_at) <= new Date() : false,
      }));
    } catch (err) {
      console.warn('Could not load share links for file:', err);
      return [];
    }
  },

  async revokeShareLink(linkId) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('share_links')
      .update({ is_revoked: true })
      .eq('id', linkId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteShareLink(linkId) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('share_links')
      .delete()
      .eq('id', linkId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  },

  buildShareUrl(token) {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    // Format works with Vercel rewrites (/s/:token) and standalone /share.html?token=...
    return `${origin}/share.html?token=${encodeURIComponent(token)}`;
  },

  buildDirectFileUrl(token) {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    // Resolves directly to the raw binary/media stream via 302 redirect for HTML embeds & direct file access
    return `${origin}/api/share/${encodeURIComponent(token)}?raw=1`;
  },

  buildHtmlSnippet(file, token) {
    const directUrl = this.buildDirectFileUrl(token);
    const mime = (file?.mime_type || '').toLowerCase();
    const name = (file?.name || 'file').replace(/"/g, '&quot;');

    if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(name)) {
      return `<img src="${directUrl}" alt="${name}" />`;
    }
    if (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(name)) {
      return `<video controls src="${directUrl}"></video>`;
    }
    if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(name)) {
      return `<audio controls src="${directUrl}"></audio>`;
    }
    if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
      return `<iframe src="${directUrl}" width="100%" height="600px"></iframe>`;
    }
    return `<a href="${directUrl}" download="${name}">${name}</a>`;
  },

  // Resolve token for the recipient's share landing page
  async resolveShareToken(token, password = null) {
    if (!token || typeof token !== 'string') {
      return {
        success: false,
        error: 'Invalid or missing share token.',
        developer: 'ALTRIVELLE TECHNOLOGIES',
      };
    }

    const cleanToken = token.trim();

    // 1. Try serverless function first (handles private storage paths, server-side validation, Vercel & Vite local dev)
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(cleanToken)}?action=metadata`);
      if (res.ok) {
        const json = await res.json();
        if (json && typeof json === 'object') {
          return json;
        }
      } else if (res.status === 404 || res.status === 410 || res.status === 403) {
        const json = await res.json().catch(() => null);
        if (json?.error) {
          return {
            success: false,
            error: json.error,
            developer: json.developer || 'ALTRIVELLE TECHNOLOGIES',
          };
        }
      }
    } catch {
      // Continue to direct Supabase fallbacks
    }

    // 2. Fallback to direct Supabase RPC (client-side execution via resolve_share_token)
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.rpc('resolve_share_token', { p_token: cleanToken });

      if (!error && data) {
        const result = Array.isArray(data) ? data[0] : data;
        if (result && result.valid) {
          return {
            success: true,
            file: {
              id: result.file_id,
              name: result.file_name,
              size_bytes: result.size_bytes,
              mime_type: result.mime_type,
              storage_path: result.storage_path,
            },
            link: {
              token: cleanToken,
              expires_at: result.expires_at,
              download_count: result.download_count,
              max_downloads: result.max_downloads,
              has_password: result.has_password,
            },
            developer: result.developer_credit || 'ALTRIVELLE TECHNOLOGIES',
          };
        } else if (result && !result.valid) {
          return {
            success: false,
            error: result.reason || 'Invalid or expired share link.',
            developer: 'ALTRIVELLE TECHNOLOGIES',
          };
        }
      }
    } catch (rpcErr) {
      console.warn('Supabase RPC resolve_share_token not ready or failed:', rpcErr?.message);
    }

    // 3. Fallback to Direct Supabase Table Query (resilience if RPC was not yet run in remote SQL editor)
    try {
      const { data: link, error: linkErr } = await supabase
        .from('share_links')
        .select('*, files(*)')
        .eq('token', cleanToken)
        .maybeSingle();

      if (linkErr || !link) {
        return {
          success: false,
          error: 'Share link not found or token has expired.',
          developer: 'ALTRIVELLE TECHNOLOGIES',
        };
      }

      // Check revoked
      if (link.is_revoked) {
        return {
          success: false,
          error: 'This share link has been revoked by the owner.',
          developer: 'ALTRIVELLE TECHNOLOGIES',
        };
      }

      // Check expiration
      if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
        return {
          success: false,
          error: 'This share link has expired.',
          developer: 'ALTRIVELLE TECHNOLOGIES',
        };
      }

      // Check max downloads
      if (link.max_downloads && link.download_count >= link.max_downloads) {
        return {
          success: false,
          error: 'The maximum download limit for this link has been reached.',
          developer: 'ALTRIVELLE TECHNOLOGIES',
        };
      }

      const file = link.files;
      if (!file) {
        return {
          success: false,
          error: 'The shared file record is initializing or unavailable.',
          developer: 'ALTRIVELLE TECHNOLOGIES',
        };
      }

      return {
        success: true,
        file: {
          id: file.id,
          name: file.name,
          size_bytes: file.size_bytes,
          mime_type: file.mime_type,
          storage_path: file.storage_path,
        },
        link: {
          token: cleanToken,
          expires_at: link.expires_at,
          download_count: link.download_count,
          max_downloads: link.max_downloads,
          has_password: Boolean(link.password_hash),
        },
        developer: 'ALTRIVELLE TECHNOLOGIES',
      };
    } catch (dbErr) {
      console.error('Direct table fallback error:', dbErr);
    }

    // Default graceful failure (never expose raw internal stack traces)
    return {
      success: false,
      error: 'Unable to resolve share link. Please verify the link with the sender.',
      developer: 'ALTRIVELLE TECHNOLOGIES',
    };
  },

  // Get recipient download URL
  async getRecipientDownloadUrl(token, storagePath, fileName, password = null) {
    const cleanToken = (token || '').trim();

    // 1. Try serverless API
    try {
      const res = await fetch(
        `/api/share/${encodeURIComponent(cleanToken)}?action=download${password ? `&password=${encodeURIComponent(password)}` : ''}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.downloadUrl) return data.downloadUrl;
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error) {
          throw new Error(errJson.error);
        }
      }
    } catch (apiErr) {
      if (apiErr.message && !apiErr.message.includes('fetch')) {
        throw apiErr;
      }
    }

    // 2. Direct Supabase Storage signed URL
    const supabase = getSupabase();
    try {
      await supabase.rpc('increment_share_download', { p_token: cleanToken });
    } catch {
      // non-blocking
    }

    const { data, error } = await supabase.storage
      .from('filelink-files')
      .createSignedUrl(storagePath, 60, {
        download: fileName,
      });

    if (error) throw error;
    return data.signedUrl;
  },

  // Verify passcode with serverless API and client fallback
  async verifyPassword(token, password) {
    const cleanToken = (token || '').trim();
    const cleanPw = (password || '').trim();

    // 1. Try serverless verify endpoint
    try {
      const res = await fetch(
        `/api/share/${encodeURIComponent(cleanToken)}?action=verify&password=${encodeURIComponent(cleanPw)}`
      );
      if (res.ok) {
        return { success: true };
      }
      if (res.status === 401) {
        const json = await res.json().catch(() => null);
        return {
          success: false,
          error: json?.error || 'Incorrect passcode. Access denied.',
        };
      }
    } catch {
      // Continue to DB check
    }

    // 2. Direct Supabase fallback
    try {
      const supabase = getSupabase();
      const { data: link, error } = await supabase
        .from('share_links')
        .select('password_hash')
        .eq('token', cleanToken)
        .maybeSingle();

      if (error || !link) {
        return { success: false, error: 'Could not verify passcode' };
      }

      if (!link.password_hash || link.password_hash.trim() === cleanPw) {
        return { success: true };
      }
      return { success: false, error: 'Incorrect passcode. Please check the access code and try again.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

