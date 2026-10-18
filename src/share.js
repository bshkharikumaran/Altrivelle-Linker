// ==============================================================================
// Altrivelle Linker — Public Share Client & Trust Passport Resolver
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

import { shareService } from './services/share.service.js';
import { themeManager } from './ui/theme.js';
import { icons } from './ui/icons.js';
import { toast } from './ui/toast.js';
import { trustPassport } from './ui/trustPassport.js';
import { annotationsComponent } from './ui/annotations.js';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

try {
  injectAnalytics();
  injectSpeedInsights();
} catch (_) {}

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return 'Never expires (Owner revocable)';
  const date = new Date(isoStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize dark theme by default
  themeManager.init();

  // Bind theme toggle button
  const themeBtn = document.getElementById('btn-theme-toggle-share');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      themeManager.toggle();
    });
  }

  const container = document.getElementById('share-card-container');
  if (!container) return;

  // Extract token from search query or URL path
  const urlParams = new URLSearchParams(window.location.search);
  let token = urlParams.get('token');

  if (!token) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 's' && pathParts[1]) {
      token = pathParts[1];
    }
  }

  if (!token) {
    container.innerHTML = `
      <div class="share-status-card error-card glass-panel animate-scale-up">
        <div class="status-icon-wrapper text-danger">
          ${icons.close(36)}
        </div>
        <h2>Invalid Link Request</h2>
        <p>No valid share token was detected in the URL query. Please verify the URL provided by the file sender.</p>
        <a href="/" class="btn btn-primary mt-4">Go to Altrivelle Linker</a>
        <div class="developer-note">
          Platform developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
        </div>
      </div>
    `;
    return;
  }

  try {
    const result = await shareService.resolveShareToken(token);

    if (!result || !result.success) {
      const errorMsg = result?.error || 'This link has expired or has been revoked by the owner.';
      const isExpired = errorMsg.toLowerCase().includes('expired') || errorMsg.toLowerCase().includes('limit');
      const isRevoked = errorMsg.toLowerCase().includes('revoked');
      const isSelfDestructed = errorMsg.toLowerCase().includes('limit') || errorMsg.toLowerCase().includes('destruct');

      container.innerHTML = `
        <div class="share-status-card error-card glass-panel animate-scale-up">
          <div class="status-icon-wrapper ${isExpired ? 'text-warning' : 'text-danger'}">
            ${isSelfDestructed ? icons.clock(40) : isExpired ? icons.clock(40) : icons.shieldAlert(40)}
          </div>
          <h2>${isSelfDestructed ? 'File Has Self-Destructed' : isExpired ? 'Share Link Expired' : isRevoked ? 'Access Revoked' : 'Share Link Unavailable'}</h2>
          <p class="error-detail-msg">${escapeHtml(errorMsg)}</p>
          <div class="info-checklist">
            <p>&bull; ${isSelfDestructed ? 'This was an ephemeral transfer that permanently purged after single-use download.' : 'Links expire automatically based on the sender’s security policy.'}</p>
            <p>&bull; The file owner may have revoked access or set a burn-after-reading rule.</p>
            <p>&bull; Contact the sender if you require renewed access to this file.</p>
          </div>
          <div class="status-action-row mt-4">
            <a href="/" class="btn btn-primary">Open Altrivelle Linker</a>
            <button type="button" class="btn btn-outline" id="btn-retry-share">Retry Verification</button>
          </div>
          <div class="developer-note">
            Secured by Altrivelle Linker &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
          </div>
        </div>
      `;

      document.getElementById('btn-retry-share')?.addEventListener('click', () => {
        window.location.reload();
      });
      return;
    }

    const file = result.file;
    const link = result.link;

    // Check if password required
    if (link.has_password) {
      container.innerHTML = `
        <div class="share-card glass-panel animate-scale-up" id="share-password-card">
          <div class="share-password-box">
            <div class="password-lock-icon">${icons.lock(36)}</div>
            <h2>Password Protected Transfer</h2>
            <p>This file is protected with end-to-end access authentication by the owner. Enter the secret passcode to access file details and download.</p>
            
            <div id="pw-error-banner" class="alert alert-danger hidden mt-3"></div>

            <form id="share-password-form" class="mt-3">
              <div class="form-group text-left">
                <label for="input-share-pw">Passcode / Key</label>
                <input type="password" id="input-share-pw" class="form-input" placeholder="Enter secret passcode" required autofocus />
              </div>
              <button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-unlock-file">
                ${icons.key(18)} Unlock & Access File
              </button>
            </form>

            <div class="developer-note">
              Encrypted Transfer &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
            </div>
          </div>
        </div>
      `;

      const pwCard = document.getElementById('share-password-card');
      const pwForm = document.getElementById('share-password-form');
      const pwInput = document.getElementById('input-share-pw');
      const pwErrorBanner = document.getElementById('pw-error-banner');
      const unlockBtn = document.getElementById('btn-unlock-file');

      pwForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const enteredPassword = (pwInput?.value || '').trim();
        if (!enteredPassword) return;

        if (unlockBtn) {
          unlockBtn.disabled = true;
          unlockBtn.textContent = 'Verifying Passcode...';
        }
        if (pwErrorBanner) pwErrorBanner.classList.add('hidden');

        try {
          // Explicitly verify password before granting access to file details or download
          const verifyResult = await shareService.verifyPassword(token, enteredPassword);
          if (!verifyResult || !verifyResult.success) {
            const errMsg = verifyResult?.error || 'Incorrect passcode. Please check the secret code and try again.';
            if (pwErrorBanner) {
              pwErrorBanner.textContent = `❌ ${errMsg}`;
              pwErrorBanner.classList.remove('hidden');
            }
            if (pwCard) {
              pwCard.classList.add('shake-error');
              setTimeout(() => pwCard.classList.remove('shake-error'), 600);
            }
            toast.error(errMsg);
            if (pwInput) {
              pwInput.select();
              pwInput.focus();
            }
            if (unlockBtn) {
              unlockBtn.disabled = false;
              unlockBtn.innerHTML = `${icons.key(18)} Unlock & Access File`;
            }
            return;
          }

          // Passcode is verified! Proceed to reveal the file card
          toast.success('Passcode verified successfully.');
          renderActiveFileCard(container, file, link, token, enteredPassword);
        } catch (pwErr) {
          if (pwErrorBanner) {
            pwErrorBanner.textContent = `❌ ${pwErr.message || 'Incorrect passcode. Access denied.'}`;
            pwErrorBanner.classList.remove('hidden');
          }
          toast.error(pwErr.message || 'Incorrect passcode');
          if (unlockBtn) {
            unlockBtn.disabled = false;
            unlockBtn.innerHTML = `${icons.key(18)} Unlock & Access File`;
          }
        }
      });
      return;
    }

    renderActiveFileCard(container, file, link, token);
  } catch (err) {
    console.error('Error resolving token:', err);
    container.innerHTML = `
      <div class="share-status-card error-card glass-panel animate-scale-up">
        <div class="status-icon-wrapper text-warning">
          ${icons.alert(36)}
        </div>
        <h2>Share Verification Notice</h2>
        <p>Could not immediately verify this link. Please check your internet connection or verify the link with the sender.</p>
        <div class="status-action-row mt-4">
          <button type="button" class="btn btn-primary" onclick="window.location.reload()">Retry Now</button>
          <a href="/" class="btn btn-outline">Go to Home</a>
        </div>
        <div class="developer-note">
          Platform developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
        </div>
      </div>
    `;
  }
});

async function renderActiveFileCard(container, file, link, token, password = null) {
  const mime = (file.mime_type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isBurnAfterRead = link.max_downloads === 1;

  container.innerHTML = `
    <div class="share-file-card glass-panel animate-scale-up">
      ${isBurnAfterRead ? `
        <div class="ephemeral-alert-banner alert alert-warning mb-4">
          <div class="font-bold text-warning flex-center gap-2">
            ${icons.clock(18)} EPHEMERAL TRANSFER &bull; SELF-DESTRUCT ARMED
          </div>
          <p class="text-xs mt-1">
            This asset is programmed to self-destruct upon single download. Once downloaded, this link and file will be permanently purged from the server.
          </p>
        </div>
      ` : ''}

      <!-- File Main Header -->
      <div class="share-file-header">
        <div class="share-file-icon">
          ${icons.fileType(file.mime_type, file.name, 48)}
        </div>
        <div class="share-file-title-group">
          <h1 class="share-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h1>
          <div class="share-file-meta-row">
            <span class="meta-tag badge-size">${formatBytes(file.size_bytes)}</span>
            <span class="meta-separator">&bull;</span>
            <span class="meta-tag badge-expiry">Expires: ${formatDate(link.expires_at)}</span>
            ${link.max_downloads ? `<span class="meta-separator">&bull;</span><span class="meta-tag badge-downloads ${isBurnAfterRead ? 'badge-warning' : ''}">Downloads: ${link.download_count}/${link.max_downloads}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Preview Window if image or media -->
      <div id="share-inline-preview" class="share-preview-box">
        <div class="preview-placeholder">
          <span>Click download to verify and save file to your device</span>
        </div>
      </div>

      <!-- Download Action Button -->
      <div class="share-file-actions">
        <button type="button" class="btn btn-primary btn-lg btn-download-primary pulse-glow-btn" id="btn-download-shared-file">
          ${icons.download(22)} Download File
        </button>
      </div>

      <div id="download-destruct-notice" class="hidden mt-3 text-center text-xs text-warning font-semibold">
        🔥 Download initiated. Self-destruct completed — file record purged from server.
      </div>

      <!-- Trust Passport Section -->
      <div class="mt-4" id="trust-passport-container">
        ${trustPassport.render({
          fileName: file.name,
          sizeBytes: file.size_bytes,
          mimeType: file.mime_type,
          sha256: file.sha256_hash || null,
          storageClass: 'Private Encrypted Object Storage',
          sharingMode: isBurnAfterRead ? 'Ephemeral Transfer (Mode B: Auto-Purge)' : 'Adaptive Transfer (Mode A: Cloud)',
          expiresAt: link.expires_at,
          downloadCount: link.download_count,
          maxDownloads: link.max_downloads,
          hasPassword: Boolean(link.has_password),
        })}
      </div>

      <!-- Annotations & Collaboration Section -->
      <div class="mt-4 share-annotations-wrapper" id="share-annotations-mount">
      </div>

      <!-- Developer attribution requirement -->
      <div class="share-card-footer-branding">
        <img src="/assets/altrivelle-linker-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="share-footer-logo" onerror="this.style.display='none'" />
        <span>Shared securely via <strong>Altrivelle Linker</strong> &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong></span>
      </div>
    </div>
  `;

  // Download handler
  const downloadBtn = container.querySelector('#btn-download-shared-file');
  const destructNotice = container.querySelector('#download-destruct-notice');

  downloadBtn?.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <span class="spinner-small mr-2"></span> Generating Secure Download...
    `;

    try {
      const downloadUrl = await shareService.getRecipientDownloadUrl(token, file.storage_path, file.name, password);
      if (downloadUrl) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (downloadUrl.startsWith('blob:')) {
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
        }

        toast.success(`Download started for "${file.name}"`);
        downloadBtn.innerHTML = `${icons.check(20)} Download Started`;

        if (isBurnAfterRead) {
          if (destructNotice) destructNotice.classList.remove('hidden');
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = `🔥 File Self-Destructed`;
          downloadBtn.classList.remove('btn-primary');
          downloadBtn.classList.add('btn-secondary');
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      const friendlyMsg = err.message || 'Could not initialize download. Please try again.';
      toast.error(`Could not download file: ${friendlyMsg}`);
      downloadBtn.innerHTML = `${icons.download(22)} Download File`;
      downloadBtn.disabled = false;
    }
  });

  // Load preview asynchronously if image
  if (mime.startsWith('image/') && ext !== 'svg') {
    try {
      const previewUrl = await shareService.getRecipientDownloadUrl(token, file.storage_path, file.name, password);
      const previewContainer = container.querySelector('#share-inline-preview');
      if (previewContainer && previewUrl) {
        previewContainer.innerHTML = `
          <img src="${previewUrl}" alt="${escapeHtml(file.name)}" class="share-preview-image" />
        `;
      }
    } catch {
      // preview error non-blocking
    }
  }

  // Mount text annotations & collaboration
  const annotMount = container.querySelector('#share-annotations-mount');
  if (annotMount) {
    const previewImg = container.querySelector('.share-preview-image');
    annotationsComponent.mount(annotMount, {
      fileId: file.id || token,
      fileName: file.name,
      imageElement: previewImg,
      isReadOnly: false,
      currentUserName: 'Share Recipient',
    });
  }
}
