import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client using privileged secret key or fallback credentials
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rdmapdajjygalfsntvkl.supabase.co';
  const defaultFallbackKey = Buffer.from('c2Jfc2VjcmV0XzVHN1A1SGpHTzY3V2YzaUNMOWRfTmdfRGs2a3NSQlo=', 'base64').toString('utf8');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || defaultFallbackKey;

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export default async function handler(req, res) {
  // CORS Headers for universal browser and embed access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Sanitize token from query or URL
  let token = req.query.token;
  if (typeof token === 'string') {
    token = token.split('?')[0].split('&')[0].trim();
  }
  if (!token && req.url) {
    const match = req.url.match(/\/(?:api\/share|raw|f)\/([a-zA-Z0-9_-]+)/i);
    if (match) token = match[1];
  }

  const urlStr = req.url || '';
  const isDirectFileRequest =
    req.query.raw === '1' ||
    req.query.raw === 'true' ||
    req.query.embed === '1' ||
    req.query.inline === '1' ||
    req.query.redirect === '1' ||
    urlStr.includes('raw=1') ||
    urlStr.includes('raw=true') ||
    urlStr.includes('embed=1');

  const { action, download, password } = req.query;

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing share token',
      developer: 'ALTRIVELLE TECHNOLOGIES',
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch share link record
    const { data: shareLink, error: linkError } = await supabase
      .from('share_links')
      .select('*, files(*)')
      .eq('token', token.trim())
      .single();

    if (linkError || !shareLink) {
      return res.status(404).json({
        success: false,
        error: 'Share link not found or invalid token',
        developer: 'ALTRIVELLE TECHNOLOGIES',
      });
    }

    // 2. Check revoked state
    if (shareLink.is_revoked) {
      return res.status(410).json({
        success: false,
        error: 'This share link has been revoked by the owner',
        developer: 'ALTRIVELLE TECHNOLOGIES',
      });
    }

    // 3. Check expiration
    if (shareLink.expires_at) {
      const expirationDate = new Date(shareLink.expires_at);
      if (expirationDate.getTime() <= Date.now()) {
        return res.status(410).json({
          success: false,
          error: 'This share link has expired',
          expiredAt: shareLink.expires_at,
          developer: 'ALTRIVELLE TECHNOLOGIES',
        });
      }
    }

    // 4. Check download limits
    if (shareLink.max_downloads && shareLink.download_count >= shareLink.max_downloads) {
      return res.status(403).json({
        success: false,
        error: 'Download limit reached for this share link',
        downloadCount: shareLink.download_count,
        maxDownloads: shareLink.max_downloads,
        developer: 'ALTRIVELLE TECHNOLOGIES',
      });
    }

    const file = shareLink.files;
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'The shared file no longer exists or was deleted',
        developer: 'ALTRIVELLE TECHNOLOGIES',
      });
    }

    // 5. Password protection check
    const hasPassword = Boolean(shareLink.password_hash);

    if (action === 'verify') {
      const providedPassword = (req.body && req.body.password) || password;
      if (!hasPassword || (providedPassword && providedPassword.trim() === shareLink.password_hash.trim())) {
        return res.status(200).json({
          success: true,
          verified: true,
          developer: 'ALTRIVELLE TECHNOLOGIES',
        });
      } else {
        return res.status(401).json({
          success: false,
          error: 'Incorrect passcode. Please check the secret access code and try again.',
          requirePassword: true,
          developer: 'ALTRIVELLE TECHNOLOGIES',
        });
      }
    }

    if (hasPassword && (action === 'download' || isDirectFileRequest)) {
      const providedPassword = (req.body && req.body.password) || password;
      if (!providedPassword || providedPassword.trim() !== shareLink.password_hash.trim()) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password. Please enter the correct password to access this file.',
          requirePassword: true,
          developer: 'ALTRIVELLE TECHNOLOGIES',
        });
      }
    }

    // 6. Action: Metadata lookup (for share landing page)
    if (!isDirectFileRequest && action !== 'download' && download !== '1') {
      return res.status(200).json({
        success: true,
        file: {
          id: file.id,
          name: file.name,
          size_bytes: file.size_bytes,
          mime_type: file.mime_type,
          created_at: file.created_at,
          is_public: file.is_public,
        },
        link: {
          token: shareLink.token,
          expires_at: shareLink.expires_at,
          download_count: shareLink.download_count,
          max_downloads: shareLink.max_downloads,
          has_password: hasPassword,
        },
        developer: 'ALTRIVELLE TECHNOLOGIES',
      });
    }

    // 7. Action: Direct Raw Stream or Download
    const isInline = isDirectFileRequest && download !== '1';

    // Increment download counter safely
    try {
      await supabase.rpc('increment_share_download', { p_token: token.trim() });
    } catch (_) {}

    // A. Direct Binary Buffer Proxy (Optimal for HTML <img>, <video>, and local files like check.html)
    // Files up to 4.5 MB can be streamed directly without redirects
    if (file.size_bytes && file.size_bytes <= 4500000) {
      try {
        const { data: fileBlob, error: dlError } = await supabase.storage
          .from('filelink-files')
          .download(file.storage_path);

        if (!dlError && fileBlob) {
          const buffer = Buffer.from(await fileBlob.arrayBuffer());
          res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
          res.setHeader(
            'Content-Disposition',
            isInline ? 'inline' : `attachment; filename="${encodeURIComponent(file.name)}"`
          );

          if (req.method === 'HEAD') {
            return res.status(200).end();
          }

          return res.status(200).send(buffer);
        }
      } catch (streamErr) {
        console.warn('Direct stream proxy failed, falling back to signed URL redirect:', streamErr);
      }
    }

    // B. Signed URL Redirect Fallback (for larger files)
    const { data: signedData, error: signError } = await supabase.storage
      .from('filelink-files')
      .createSignedUrl(file.storage_path, 3600, {
        download: isInline ? false : file.name,
      });

    if (signError || !signedData?.signedUrl) {
      return res.status(500).json({
        success: false,
        error: 'Could not generate secure file URL',
        developer: 'ALTRIVELLE TECHNOLOGIES',
      });
    }

    if (isDirectFileRequest) {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      return res.redirect(302, signedData.signedUrl);
    }

    return res.status(200).json({
      success: true,
      downloadUrl: signedData.signedUrl,
      fileName: file.name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      developer: 'ALTRIVELLE TECHNOLOGIES',
    });
  } catch (error) {
    console.error('Error resolving share link:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error resolving share link',
      developer: 'ALTRIVELLE TECHNOLOGIES',
    });
  }
}
