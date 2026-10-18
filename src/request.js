// ==============================================================================
// Altrivelle Linker — File Request Public Client
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { fileRequestsService } from './services/requests.service.js';
import { themeManager } from './ui/theme.js';
import { icons } from './ui/icons.js';
import { toast } from './ui/toast.js';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

try {
  injectAnalytics();
  injectSpeedInsights();
} catch (_) {}

function formatBytes(bytes, decimals = 0) {
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

document.addEventListener('DOMContentLoaded', async () => {
  themeManager.init();

  const container = document.getElementById('request-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  let token = urlParams.get('token');

  if (!token) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'r' && parts[1]) {
      token = parts[1];
    }
  }

  if (!token) {
    container.innerHTML = `
      <div class="share-status-card error-card glass-panel animate-scale-up">
        <div class="status-icon-wrapper text-danger">${icons.close(36)}</div>
        <h2>Invalid File Request Link</h2>
        <p>No valid request token was provided in the URL.</p>
        <a href="/" class="btn btn-primary mt-4">Go to Altrivelle Linker</a>
        <div class="developer-note">Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong></div>
      </div>
    `;
    return;
  }

  try {
    const res = await fileRequestsService.resolveRequestToken(token);

    if (!res || !res.valid) {
      container.innerHTML = `
        <div class="share-status-card error-card glass-panel animate-scale-up">
          <div class="status-icon-wrapper text-warning">${icons.clock(36)}</div>
          <h2>Request Unavailable</h2>
          <p class="error-detail-msg">${escapeHtml(res?.error || 'This file request link has expired or reached capacity.')}</p>
          <a href="/" class="btn btn-secondary mt-4">Back to Home</a>
          <div class="developer-note">Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong></div>
        </div>
      `;
      return;
    }

    renderSubmissionForm(container, res.request, token);
  } catch (err) {
    console.error('Error resolving request:', err);
    container.innerHTML = `
      <div class="share-status-card error-card glass-panel">
        <div class="status-icon-wrapper text-danger">${icons.close(36)}</div>
        <h2>Unable to Connect</h2>
        <p>${escapeHtml(err.message)}</p>
        <a href="/" class="btn btn-secondary mt-4">Go to Home</a>
      </div>
    `;
  }
});

function renderSubmissionForm(container, request, token) {
  let selectedFile = null;

  container.innerHTML = `
    <div class="share-file-card glass-panel animate-scale-up">
      <div class="share-file-header">
        <div class="share-file-icon text-primary">
          ${icons.uploadCloud(36)}
        </div>
        <div class="share-file-title-group">
          <h1 class="share-file-name">${escapeHtml(request.title)}</h1>
          <p class="request-desc-text">${escapeHtml(request.description) || 'Please upload the requested documents below.'}</p>
          <div class="share-file-meta-row">
            <span class="meta-tag">Max File Size: ${formatBytes(request.max_size_bytes)}</span>
            <span class="meta-separator">&bull;</span>
            <span class="meta-tag">DropBox &bull; Secure Client Submission</span>
          </div>
        </div>
      </div>

      <form id="submission-form" class="request-submission-form">
        <!-- Dropzone -->
        <div class="upload-dropzone request-dropzone" id="req-dropzone">
          <input type="file" id="req-file-input" class="hidden" />
          <div class="dropzone-inner" id="req-dropzone-inner">
            <div class="dropzone-icon-box">${icons.uploadCloud(32)}</div>
            <h4 id="req-selected-filename">Drag and drop file here, or browse</h4>
            <p class="dropzone-hint">Support for all formats up to ${formatBytes(request.max_size_bytes)}</p>
            <button type="button" class="btn btn-outline btn-sm" id="btn-browse-req">Select File</button>
          </div>
        </div>

        <div class="form-row-2 mt-4">
          <div class="form-group">
            <label for="contributor-name">Your Full Name</label>
            <input type="text" id="contributor-name" class="form-input" placeholder="e.g. Sarah Jenkins" required />
          </div>
          <div class="form-group">
            <label for="contributor-email">Email Address (Optional)</label>
            <input type="email" id="contributor-email" class="form-input" placeholder="sarah@example.com" />
          </div>
        </div>

        <div class="upload-progress-box hidden" id="req-progress-box">
          <div class="progress-bar-track">
            <div class="progress-bar-fill bg-primary" id="req-progress-fill" style="width: 0%;"></div>
          </div>
          <span class="text-muted font-mono" id="req-progress-text">Uploading...</span>
        </div>

        <button type="submit" class="btn btn-primary btn-block btn-lg mt-4" id="btn-submit-request-file">
          ${icons.uploadCloud(18)} Submit File Securely
        </button>
      </form>

      <div class="share-card-footer-branding">
        <img src="/assets/altrivelle-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="share-footer-logo" onerror="this.style.display='none'" />
        <span>Secured by <strong>Altrivelle Linker</strong> &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong></span>
      </div>
    </div>
  `;

  const fileInput = container.querySelector('#req-file-input');
  const browseBtn = container.querySelector('#btn-browse-req');
  const filenameText = container.querySelector('#req-selected-filename');
  const dropzone = container.querySelector('#req-dropzone');
  const form = container.querySelector('#submission-form');
  const submitBtn = container.querySelector('#btn-submit-request-file');
  const progressBox = container.querySelector('#req-progress-box');
  const progressFill = container.querySelector('#req-progress-fill');
  const progressText = container.querySelector('#req-progress-text');

  browseBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) {
      selectedFile = e.target.files[0];
      filenameText.innerHTML = `Selected: <strong>${escapeHtml(selectedFile.name)}</strong> (${formatBytes(selectedFile.size)})`;
    }
  });

  // Drag & drop
  if (dropzone) {
    ['dragenter', 'dragover'].forEach((n) => {
      dropzone.addEventListener(n, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
      });
    });
    ['dragleave', 'drop'].forEach((n) => {
      dropzone.addEventListener(n, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer?.files?.length) {
        selectedFile = e.dataTransfer.files[0];
        filenameText.innerHTML = `Selected: <strong>${escapeHtml(selectedFile.name)}</strong> (${formatBytes(selectedFile.size)})`;
      }
    });
  }

  // Form submit
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning('Please select a file to submit');
      return;
    }

    const contributorName = container.querySelector('#contributor-name')?.value;
    const contributorEmail = container.querySelector('#contributor-email')?.value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Encrypting & Uploading...';
    progressBox.classList.remove('hidden');

    try {
      await fileRequestsService.submitFileToRequest(
        token,
        selectedFile,
        contributorName,
        contributorEmail,
        (percent) => {
          progressFill.style.width = `${percent}%`;
          progressText.textContent = `Uploading: ${percent}%`;
        }
      );

      // Render confirmation receipt
      container.innerHTML = `
        <div class="share-file-card glass-panel animate-scale-up text-center">
          <div class="status-icon-wrapper text-success mb-3">${icons.check(40)}</div>
          <h2>Submission Successful!</h2>
          <p class="mt-2">Thank you, <strong>${escapeHtml(contributorName)}</strong>. Your file <strong>"${escapeHtml(selectedFile.name)}"</strong> has been encrypted and securely delivered.</p>
          
          <div class="specs-list mt-4 text-left">
            <div class="spec-item">
              <span class="spec-label">File Received</span>
              <span class="spec-value">${escapeHtml(selectedFile.name)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Payload Size</span>
              <span class="spec-value">${formatBytes(selectedFile.size)}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Submission Timestamp</span>
              <span class="spec-value">${new Date().toLocaleString()}</span>
            </div>
          </div>

          <a href="/" class="btn btn-outline mt-4">Visit Altrivelle Linker</a>

          <div class="share-card-footer-branding mt-4">
            <img src="/assets/altrivelle-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="share-footer-logo" onerror="this.style.display='none'" />
            <span>Altrivelle Linker &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong></span>
          </div>
        </div>
      `;
      toast.success('File delivered successfully!');
    } catch (err) {
      console.error('Submission failed:', err);
      toast.error(`Submission error: ${err.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit File Securely';
      progressBox.classList.add('hidden');
    }
  });
}
