import { modal } from './modal.js';
import { icons } from './icons.js';
import { filesService } from '../services/files.service.js';
import { toast } from './toast.js';

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const previewManager = {
  async openPreview(file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = (file.mime_type || '').toLowerCase();

    // Show loading modal first
    modal.open(`
      <div class="preview-loading">
        <div class="spinner"></div>
        <p>Loading secure preview for <strong>${escapeHtml(file.name)}</strong>...</p>
      </div>
    `, {
      title: 'File Preview',
      maxWidth: 'max-w-4xl',
    });

    try {
      let previewUrl = null;
      let downloadUrl = null;

      // Get signed URLs
      if (file.storage_path) {
        [previewUrl, downloadUrl] = await Promise.all([
          filesService.getSignedPreviewUrl(file.storage_path),
          filesService.getSignedDownloadUrl(file.storage_path, file.name),
        ]);
      }

      let contentHtml = '';

      // 1. Image preview
      if (mime.startsWith('image/') && ext !== 'svg') {
        contentHtml = `
          <div class="preview-container image-preview-wrapper">
            <img src="${previewUrl}" alt="${escapeHtml(file.name)}" class="preview-img" loading="lazy" />
          </div>
        `;
      }
      // 2. SVG or HTML files (Security Rule: NEVER execute in app origin)
      else if (mime.includes('svg') || ext === 'svg' || mime.includes('html') || ext === 'html' || ext === 'htm') {
        contentHtml = `
          <div class="preview-security-notice">
            <div class="security-banner">
              ${icons.shield(28)}
              <div>
                <h4>Security Sandbox Notice</h4>
                <p>For your security, executable web content (HTML / SVG) is not rendered directly in the application origin to prevent cross-site scripting (XSS).</p>
              </div>
            </div>
            <div class="file-card-details">
              <div class="file-detail-icon">${icons.fileType(file.mime_type, file.name, 48)}</div>
              <h3>${escapeHtml(file.name)}</h3>
              <p class="file-meta">${formatBytes(file.size_bytes)} &bull; ${file.mime_type}</p>
            </div>
          </div>
        `;
      }
      // 3. PDF Preview
      else if (mime.includes('pdf') || ext === 'pdf') {
        contentHtml = `
          <div class="preview-container pdf-preview-wrapper">
            <iframe src="${previewUrl}#toolbar=0" class="preview-iframe" title="${escapeHtml(file.name)}" sandbox="allow-scripts allow-same-origin"></iframe>
          </div>
        `;
      }
      // 4. Video Preview
      else if (mime.startsWith('video/')) {
        contentHtml = `
          <div class="preview-container media-preview-wrapper">
            <video controls autoplay class="preview-video">
              <source src="${previewUrl}" type="${file.mime_type}">
              Your browser does not support HTML5 video.
            </video>
          </div>
        `;
      }
      // 5. Audio Preview
      else if (mime.startsWith('audio/')) {
        contentHtml = `
          <div class="preview-container audio-preview-wrapper">
            <div class="audio-cover">${icons.fileType(file.mime_type, file.name, 64)}</div>
            <h3>${escapeHtml(file.name)}</h3>
            <audio controls class="preview-audio">
              <source src="${previewUrl}" type="${file.mime_type}">
              Your browser does not support HTML5 audio.
            </audio>
          </div>
        `;
      }
      // 6. Text / Code preview
      else if (
        mime.startsWith('text/') ||
        ['txt', 'md', 'json', 'js', 'ts', 'css', 'py', 'sql', 'yaml', 'yml'].includes(ext)
      ) {
        try {
          const res = await fetch(previewUrl);
          const rawText = await res.text();
          const safeText = escapeHtml(rawText.slice(0, 50000)); // limit 50KB for fast render

          contentHtml = `
            <div class="preview-container text-preview-wrapper">
              <pre class="preview-code"><code>${safeText}</code></pre>
            </div>
          `;
        } catch {
          contentHtml = `
            <div class="preview-generic-box">
              <div class="file-detail-icon">${icons.fileType(file.mime_type, file.name, 48)}</div>
              <h3>${escapeHtml(file.name)}</h3>
              <p class="file-meta">${formatBytes(file.size_bytes)} &bull; ${file.mime_type}</p>
            </div>
          `;
        }
      }
      // 7. Generic Binary / Document
      else {
        contentHtml = `
          <div class="preview-generic-box">
            <div class="file-detail-icon">${icons.fileType(file.mime_type, file.name, 56)}</div>
            <h3>${escapeHtml(file.name)}</h3>
            <p class="file-meta">${formatBytes(file.size_bytes)} &bull; ${file.mime_type || 'Unknown MIME'}</p>
            <p class="preview-generic-desc">A live preview is not available for this file type. You can securely download it below.</p>
          </div>
        `;
      }

      // Render complete modal with controls and developer footer
      modal.open(`
        <div class="preview-modal-content">
          ${contentHtml}

          <div class="preview-footer-bar">
            <div class="preview-file-info">
              <span class="preview-name">${escapeHtml(file.name)}</span>
              <span class="preview-size">${formatBytes(file.size_bytes)}</span>
            </div>
            <div class="preview-actions">
              ${
                downloadUrl
                  ? `<a href="${downloadUrl}" download="${escapeHtml(file.name)}" class="btn btn-primary btn-sm">
                      ${icons.download(16)} Download File
                    </a>`
                  : ''
              }
              <button type="button" class="btn btn-secondary btn-sm" id="btn-close-preview">Close</button>
            </div>
          </div>
          <div class="preview-attribution">
            Protected by FileLink &bull; Developed by ALTRIVELLE TECHNOLOGIES
          </div>
        </div>
      `, {
        title: escapeHtml(file.name),
        maxWidth: 'max-w-4xl',
      });

      const closeBtn = document.getElementById('btn-close-preview');
      if (closeBtn) closeBtn.addEventListener('click', () => modal.close());
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(`Could not preview file: ${err.message}`);
      modal.close();
    }
  },
};
