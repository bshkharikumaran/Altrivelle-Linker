// ==============================================================================
// Altrivelle Linker — Unified Share Modal & Access Link Generator
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

import { modal } from './modal.js';
import { icons } from './icons.js';
import { toast } from './toast.js';
import { shareService } from '../services/share.service.js';
import { riskAdvisor } from '../services/riskAdvisor.service.js';

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard.writeText failed, using fallback:', err);
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err2) {
    console.warn('Fallback copy failed:', err2);
    return false;
  }
}

export function openShareModal(file, onUpdate = null) {
  if (!file || !file.id) {
    toast.error('Cannot share: invalid file reference.');
    return;
  }

  modal.open(`
    <div class="share-modal-form animate-fade-in">
      <div class="share-modal-file-banner">
        <div class="banner-file-icon">
          ${icons.fileType(file.mime_type, file.name, 36)}
        </div>
        <div class="banner-file-info">
          <h4 class="banner-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h4>
          <span class="banner-file-meta">${formatBytes(file.size_bytes)} &bull; ${file.mime_type || 'Unknown MIME'}</span>
        </div>
      </div>

      <!-- Share Risk Advisor Panel -->
      <div class="risk-advisor-box mt-3" id="share-risk-advisor-box">
        <div class="risk-loading">Analyzing security profile...</div>
      </div>

      <!-- Create Link Controls -->
      <div class="share-controls-grid mt-3">
        <div class="form-group">
          <label for="share-expiry-input">Link Expiration</label>
          <select id="share-expiry-input" class="form-select">
            <option value="1h">1 Hour (Single Use)</option>
            <option value="1d">1 Day</option>
            <option value="7d" selected>7 Days (Recommended)</option>
            <option value="30d">30 Days</option>
            <option value="never">No Expiration</option>
          </select>
        </div>

        <div class="form-group">
          <label for="share-limit-input">Download Limit (Optional)</label>
          <input type="number" id="share-limit-input" min="1" class="form-input" placeholder="Unlimited" />
        </div>
      </div>

      <div class="form-group">
        <label for="share-password-input">Access Password (Optional)</label>
        <input type="text" id="share-password-input" class="form-input" placeholder="Leave empty for public link" />
      </div>

      <!-- Result Container (Revealed after generation) -->
      <div id="share-result-container" class="hidden share-result-expanded mt-3">
        <div class="result-group">
          <label class="font-medium text-xs text-muted mb-1 block">Web Share Page (Interactive Landing Page)</label>
          <div class="input-with-button">
            <input type="text" id="modal-share-link" readonly class="form-input form-input-sm font-mono" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-web-link" title="Copy Web Share Link">
              ${icons.copy(14)} Share Link
            </button>
          </div>
        </div>

        <div class="result-group mt-2">
          <label class="font-medium text-xs text-muted mb-1 block flex-between">
            <span>Direct File Link (For HTML Files / Raw URL)</span>
            <span class="badge badge-primary text-2xs">Raw Asset</span>
          </label>
          <div class="input-with-button">
            <input type="text" id="modal-direct-link" readonly class="form-input form-input-sm font-mono" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-direct-file-link" title="Copy Direct File Link">
              ${icons.link(14)} Direct Link
            </button>
          </div>
          <p class="form-hint text-xs">Direct 302 URL to stream into HTML <code>&lt;img&gt;</code>, <code>&lt;video&gt;</code>, or <code>&lt;a&gt;</code> tags.</p>
        </div>

        <div class="result-group mt-2">
          <label class="font-medium text-xs text-muted mb-1 block">Ready-to-Use HTML Snippet</label>
          <div class="input-with-button">
            <input type="text" id="modal-html-snippet" readonly class="form-input form-input-sm font-mono" />
            <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-html-tag" title="Copy HTML Snippet">
              ${icons.copy(14)} Copy HTML
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Action Buttons -->
      <div class="modal-footer-actions mt-4">
        <button type="button" class="btn btn-secondary" id="btn-close-share-modal">Close</button>
        <button type="button" class="btn btn-primary" id="btn-generate-share-link">
          ${icons.sparkles(16)} Generate Share Link
        </button>
      </div>

      <!-- Existing Active Links Section -->
      <div class="existing-links-section mt-4">
        <h4 class="existing-links-title">Active & Past Links for this File</h4>
        <div id="existing-share-links-container" class="existing-links-list">
          <div class="loading-state-inline p-2 text-muted text-xs">
            <span class="spinner-small mr-2"></span> Loading active links...
          </div>
        </div>
      </div>

      <div class="modal-credit-footer mt-4">
        Altrivelle Linker &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
      </div>
    </div>
  `, {
    title: `Share "${file.name}"`,
    maxWidth: 'max-w-lg',
  });

  const expirySelect = document.getElementById('share-expiry-input');
  const passwordInput = document.getElementById('share-password-input');
  const limitInput = document.getElementById('share-limit-input');
  const riskBox = document.getElementById('share-risk-advisor-box');
  const generateBtn = document.getElementById('btn-generate-share-link');
  const closeBtn = document.getElementById('btn-close-share-modal');

  closeBtn?.addEventListener('click', () => modal.close());

  // Dynamic Risk Advisor
  const updateRiskProfile = () => {
    if (!riskBox) return;
    const analysis = riskAdvisor.analyze({
      fileName: file.name,
      duration: expirySelect?.value || '7d',
      password: passwordInput?.value || '',
      maxDownloads: limitInput?.value || null,
    });

    riskBox.innerHTML = `
      <div class="risk-card risk-${analysis.level.toLowerCase()}">
        <div class="risk-header">
          <span class="risk-pill ${analysis.badgeClass}">${icons.shield(12)} Risk Level: ${analysis.level}</span>
          <span class="risk-points">${analysis.riskPoints} pts</span>
        </div>
        <p class="risk-summary-text">${analysis.summary}</p>
        ${
          analysis.recommendations.length > 0
            ? `<ul class="risk-recs-list">${analysis.recommendations.map((r) => `<li>&bull; ${r}</li>`).join('')}</ul>`
            : ''
        }
      </div>
    `;
  };

  updateRiskProfile();
  [expirySelect, passwordInput, limitInput].forEach((el) => {
    el?.addEventListener('input', updateRiskProfile);
    el?.addEventListener('change', updateRiskProfile);
  });

  // Asynchronous loader for existing links
  const loadExistingLinks = async () => {
    const listContainer = document.getElementById('existing-share-links-container');
    if (!listContainer) return;

    try {
      const links = await shareService.getFileShareLinks(file.id, file);
      if (!links || links.length === 0) {
        listContainer.innerHTML = `<p class="empty-subtext text-xs text-muted">No share links generated yet for this file.</p>`;
        return;
      }

      listContainer.innerHTML = links
        .map((l) => `
          <div class="link-item-row ${l.is_revoked || l.isExpired ? 'link-inactive' : ''}">
            <div class="link-item-meta">
              <span class="link-token font-mono">${escapeHtml(l.token)}</span>
              <span class="link-status text-xs">
                ${
                  l.is_revoked
                    ? '<span class="text-danger font-medium">Revoked</span>'
                    : l.isExpired
                    ? '<span class="text-warning font-medium">Expired</span>'
                    : '<span class="text-success font-medium">Active</span>'
                }
                &bull; ${l.download_count} downloads
              </span>
            </div>
            <div class="link-item-actions">
              ${
                !l.is_revoked && !l.isExpired
                  ? `
                  <button type="button" class="btn-icon btn-action-copy-web" data-url="${escapeHtml(l.shareUrl)}" title="Copy Web Share Link">
                    ${icons.copy(16)}
                  </button>
                  <button type="button" class="btn-icon btn-action-copy-direct" data-url="${escapeHtml(l.directFileUrl)}" title="Copy Direct File Link (For HTML)">
                    ${icons.link(16)}
                  </button>
                  <button type="button" class="btn-icon btn-action-copy-tag" data-snippet="${escapeHtml(l.htmlSnippet)}" title="Copy HTML Snippet Tag">
                    ${icons.sparkles(16)}
                  </button>
                  <button type="button" class="btn-icon btn-action-edit" data-id="${l.id}" title="Edit Link Settings in DB">
                    ${icons.edit(16)}
                  </button>
                  <button type="button" class="btn-icon text-danger btn-action-revoke" data-id="${l.id}" title="Revoke Link in DB">
                    ${icons.close(16)}
                  </button>
                `
                  : `
                  <button type="button" class="btn-icon btn-action-edit" data-id="${l.id}" title="Reactivate / Edit Link Settings in DB">
                    ${icons.edit(16)}
                  </button>
                  <button type="button" class="btn-icon text-muted btn-action-delete" data-id="${l.id}" title="Delete Record from DB">
                    ${icons.trash(16)}
                  </button>
                `
              }
            </div>
          </div>

          <!-- Edit Link Rules & Database Sync Drawer -->
          <div class="link-edit-drawer hidden mt-2 p-3 glass-panel animate-scale-up" id="edit-drawer-${l.id}">
            <div class="text-xs font-semibold mb-2 flex-between">
              <span>Database Sync &bull; Token <code class="font-mono text-primary">${escapeHtml(l.token)}</code></span>
              <button type="button" class="btn-icon text-muted btn-close-edit" data-id="${l.id}" style="padding:2px;">&times;</button>
            </div>
            <div class="grid-2 gap-2 text-left">
              <div>
                <label class="text-xs font-medium">Extend / Change Expiry</label>
                <select class="form-input text-xs mt-1 edit-expiry-select" data-id="${l.id}">
                  <option value="1h">1 Hour</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d" selected>7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="never">Never (Persistent)</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-medium">Max Downloads Limit</label>
                <input type="number" class="form-input text-xs mt-1 edit-limit-input" data-id="${l.id}" min="1" placeholder="Unlimited" value="${l.max_downloads || ''}" />
              </div>
            </div>
            <div class="mt-2 text-left">
              <label class="text-xs font-medium">Passcode (leave empty to clear)</label>
              <input type="text" class="form-input text-xs mt-1 edit-pw-input" data-id="${l.id}" placeholder="Enter new passcode or clear" value="${escapeHtml(l.password_hash || '')}" />
            </div>
            <div class="flex-between mt-3">
              <label class="text-xs flex-center gap-1 cursor-pointer">
                <input type="checkbox" class="edit-revoke-check" data-id="${l.id}" ${l.is_revoked ? 'checked' : ''} /> Revoke link access
              </label>
              <button type="button" class="btn btn-primary btn-sm btn-save-link-db" data-id="${l.id}">
                ${icons.check(14)} Save Changes to DB
              </button>
            </div>
          </div>
        `)
        .join('');

      // Bind link action buttons
      listContainer.querySelectorAll('.btn-action-copy-web').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await copyToClipboard(btn.dataset.url);
          toast.success('Web share page link copied to clipboard!');
        });
      });

      listContainer.querySelectorAll('.btn-action-copy-direct').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await copyToClipboard(btn.dataset.url);
          toast.success('Direct file link copied (ready to use in HTML)!');
        });
      });

      listContainer.querySelectorAll('.btn-action-copy-tag').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await copyToClipboard(btn.dataset.snippet);
          toast.success('HTML snippet copied to clipboard!');
        });
      });

      // Edit toggle
      listContainer.querySelectorAll('.btn-action-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
          const drawer = listContainer.querySelector(`#edit-drawer-${btn.dataset.id}`);
          if (drawer) {
            drawer.classList.toggle('hidden');
          }
        });
      });

      listContainer.querySelectorAll('.btn-close-edit').forEach((btn) => {
        btn.addEventListener('click', () => {
          const drawer = listContainer.querySelector(`#edit-drawer-${btn.dataset.id}`);
          if (drawer) drawer.classList.add('hidden');
        });
      });

      // Save to DB
      listContainer.querySelectorAll('.btn-save-link-db').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const linkId = btn.dataset.id;
          const expirySelect = listContainer.querySelector(`.edit-expiry-select[data-id="${linkId}"]`);
          const limitInput = listContainer.querySelector(`.edit-limit-input[data-id="${linkId}"]`);
          const pwInput = listContainer.querySelector(`.edit-pw-input[data-id="${linkId}"]`);
          const revokeCheck = listContainer.querySelector(`.edit-revoke-check[data-id="${linkId}"]`);

          btn.disabled = true;
          btn.innerHTML = `<span class="spinner-small mr-1"></span> Saving...`;

          try {
            await shareService.updateShareLink(linkId, {
              duration: expirySelect?.value || '7d',
              password: pwInput?.value || null,
              maxDownloads: limitInput?.value || null,
              is_revoked: Boolean(revokeCheck?.checked),
            });
            toast.success('Share link updated in Supabase database!');
            await loadExistingLinks();
            onUpdate?.();
          } catch (err) {
            toast.error(`Could not update link: ${err.message}`);
            btn.disabled = false;
            btn.innerHTML = `${icons.check(14)} Save Changes to DB`;
          }
        });
      });

      listContainer.querySelectorAll('.btn-action-revoke').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await shareService.revokeShareLink(btn.dataset.id);
            toast.success('Share link revoked in database.');
            await loadExistingLinks();
            onUpdate?.();
          } catch (err) {
            toast.error(`Could not revoke link: ${err.message}`);
          }
        });
      });

      listContainer.querySelectorAll('.btn-action-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await shareService.deleteShareLink(btn.dataset.id);
            toast.success('Link record deleted from database.');
            await loadExistingLinks();
            onUpdate?.();
          } catch (err) {
            toast.error(`Could not delete record: ${err.message}`);
          }
        });
      });
    } catch (err) {
      listContainer.innerHTML = `<p class="empty-subtext text-xs text-muted">No links available.</p>`;
    }
  };

  loadExistingLinks();

  // Generate Link Handler
  generateBtn?.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="spinner-small mr-2"></span> Generating...`;

    const duration = expirySelect.value;
    const password = passwordInput.value;
    const maxDownloads = limitInput.value;

    try {
      const link = await shareService.createShareLink(file.id, {
        duration,
        password,
        maxDownloads,
        file,
      });

      const resultBox = document.getElementById('share-result-container');
      const shareInput = document.getElementById('modal-share-link');
      const directInput = document.getElementById('modal-direct-link');
      const htmlSnippetInput = document.getElementById('modal-html-snippet');

      if (shareInput) shareInput.value = link.shareUrl;
      if (directInput) directInput.value = link.directFileUrl;
      if (htmlSnippetInput) htmlSnippetInput.value = link.htmlSnippet;

      resultBox?.classList.remove('hidden');

      document.getElementById('btn-copy-web-link').onclick = async () => {
        await copyToClipboard(link.shareUrl);
        toast.success('Web share link copied to clipboard!');
      };

      document.getElementById('btn-copy-direct-file-link').onclick = async () => {
        await copyToClipboard(link.directFileUrl);
        toast.success('Direct file link copied (ready to use in HTML)!');
      };

      document.getElementById('btn-copy-html-tag').onclick = async () => {
        await copyToClipboard(link.htmlSnippet);
        toast.success('HTML snippet copied to clipboard!');
      };

      // Auto-copy direct file link
      await copyToClipboard(link.directFileUrl);
      toast.success('Share link generated & direct file link copied!');

      generateBtn.disabled = false;
      generateBtn.innerHTML = `${icons.sparkles(16)} Regenerate Link`;

      // Refresh existing links and parent view
      await loadExistingLinks();
      onUpdate?.();
    } catch (err) {
      console.error('Error generating link:', err);
      toast.error(`Could not generate share link: ${err.message}`);
      generateBtn.disabled = false;
      generateBtn.innerHTML = `${icons.sparkles(16)} Generate Share Link`;
    }
  });
}

// Global registry for access across views
if (typeof window !== 'undefined') {
  window.openShareModalForFile = openShareModal;
}
