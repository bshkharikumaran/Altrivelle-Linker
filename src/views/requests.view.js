// ==============================================================================
// Altrivelle Linker — File Requests (DropBox) Dashboard View
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { fileRequestsService } from '../services/requests.service.js';
import { projectsService } from '../services/projects.service.js';
import { toast } from '../ui/toast.js';
import { icons } from '../ui/icons.js';
import { modal } from '../ui/modal.js';
import { filesService } from '../services/files.service.js';

function formatBytes(bytes) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

export const requestsView = {
  requests: [],
  projects: [],

  async render(container) {
    container.innerHTML = `
      <div class="requests-page animate-fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">File Requests (DropBox)</h1>
            <p class="view-subtitle">Generate secure upload links to collect files from clients or students without requiring them to register</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" id="btn-create-request-modal">
              ${icons.uploadCloud(18)} New File Request
            </button>
          </div>
        </div>

        <div id="requests-content-container">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading file requests...</p>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-create-request-modal')?.addEventListener('click', () => {
      this.openCreateModal(container);
    });

    await this.loadData(container);
  },

  async loadData(container) {
    try {
      const [requests, projects] = await Promise.all([
        fileRequestsService.getMyRequests(),
        projectsService.getProjects(),
      ]);

      this.requests = requests || [];
      this.projects = projects || [];

      this.renderRequestsList(container);
    } catch (err) {
      console.error('Error loading requests:', err);
      toast.error('Failed to load file requests.');
    }
  },

  renderRequestsList(container) {
    const content = container.querySelector('#requests-content-container');
    if (!content) return;

    if (!this.requests.length) {
      content.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">${icons.uploadCloud(48)}</div>
          <h3>No Active File Requests</h3>
          <p>Create a request link to receive assignments, invoices, or client deliverables directly into your private storage.</p>
          <button class="btn btn-primary" id="btn-empty-create-req">
            ${icons.uploadCloud(18)} Create Your First Request
          </button>
        </div>
      `;
      content.querySelector('#btn-empty-create-req')?.addEventListener('click', () => {
        this.openCreateModal(container);
      });
      return;
    }

    content.innerHTML = `
      <div class="requests-grid">
        ${this.requests
          .map((req) => {
            const hasSubmissions = req.submissions && req.submissions.length > 0;
            return `
            <div class="section-card request-item-card animate-scale-up" data-id="${req.id}">
              <div class="section-card-header">
                <div>
                  <h3 class="section-title">${escapeHtml(req.title)}</h3>
                  <p class="section-subtitle">${escapeHtml(req.description) || 'No custom instructions provided'}</p>
                </div>
                <div class="request-status-badges">
                  ${
                    req.is_active && !req.isExpired
                      ? `<span class="badge badge-success">${icons.check(12)} Active</span>`
                      : `<span class="badge badge-subtle">Closed / Expired</span>`
                  }
                  <span class="badge badge-project">${req.submissions_count || 0} Submissions</span>
                </div>
              </div>

              <!-- Share Link Box -->
              <div class="request-link-box">
                <span class="link-label">Public Submission URL:</span>
                <div class="input-with-button mt-1">
                  <input type="text" readonly value="${req.requestUrl}" class="form-input-sm font-mono" />
                  <button type="button" class="btn btn-secondary btn-sm btn-copy-req-url" data-url="${req.requestUrl}">
                    ${icons.copy(14)} Copy
                  </button>
                </div>
              </div>

              <!-- Submissions List -->
              <div class="received-submissions-section mt-4">
                <h4>Received Submissions (${req.submissions.length})</h4>
                ${
                  !hasSubmissions
                    ? `<p class="empty-subtext">No files submitted yet.</p>`
                    : `
                    <div class="submissions-table-wrapper mt-2">
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th>Contributor</th>
                            <th>File Name</th>
                            <th>Size</th>
                            <th>Received</th>
                            <th class="text-right">Download</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${req.submissions
                            .map(
                              (sub) => `
                            <tr>
                              <td>
                                <strong>${escapeHtml(sub.contributor_name)}</strong>
                                ${sub.contributor_email ? `<br><small class="text-muted">${escapeHtml(sub.contributor_email)}</small>` : ''}
                              </td>
                              <td>${escapeHtml(sub.file_name)}</td>
                              <td>${formatBytes(sub.size_bytes)}</td>
                              <td>${formatDate(sub.created_at)}</td>
                              <td class="text-right">
                                <button type="button" class="action-icon-btn btn-download-sub" data-path="${sub.storage_path}" data-name="${escapeHtml(sub.file_name)}">
                                  ${icons.download(16)}
                                </button>
                              </td>
                            </tr>
                          `
                            )
                            .join('')}
                        </tbody>
                      </table>
                    </div>
                  `
                }
              </div>

              <div class="request-card-footer mt-4">
                <span class="text-muted text-xs">Expires: ${formatDate(req.expires_at)}</span>
                <div class="request-footer-actions">
                  ${
                    req.is_active && !req.isExpired
                      ? `<button type="button" class="btn btn-outline btn-sm btn-close-req" data-id="${req.id}">Close Request</button>`
                      : ''
                  }
                  <button type="button" class="btn btn-outline btn-sm text-danger btn-delete-req" data-id="${req.id}">Delete</button>
                </div>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;

    this.bindListEvents(content, container);
  },

  bindListEvents(content, container) {
    // Copy URLs
    content.querySelectorAll('.btn-copy-req-url').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.url);
        toast.success('File Request link copied to clipboard!');
      });
    });

    // Download submitted files
    content.querySelectorAll('.btn-download-sub').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const url = await filesService.getSignedDownloadUrl(btn.dataset.path, btn.dataset.name);
          const a = document.createElement('a');
          a.href = url;
          a.download = btn.dataset.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.success(`Download started for ${btn.dataset.name}`);
        } catch (err) {
          toast.error(`Download failed: ${err.message}`);
        }
      });
    });

    // Close request
    content.querySelectorAll('.btn-close-req').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await fileRequestsService.closeRequest(btn.dataset.id);
          toast.success('File request closed.');
          await this.loadData(container);
        } catch (err) {
          toast.error(`Could not close request: ${err.message}`);
        }
      });
    });

    // Delete request
    content.querySelectorAll('.btn-delete-req').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await fileRequestsService.deleteRequest(btn.dataset.id);
          toast.success('File request deleted.');
          await this.loadData(container);
        } catch (err) {
          toast.error(`Could not delete request: ${err.message}`);
        }
      });
    });
  },

  openCreateModal(container) {
    modal.open(`
      <div class="create-request-form">
        <p class="modal-subtitle">Generate a secure upload portal for external clients to submit files.</p>

        <div class="form-group">
          <label for="req-title-input">Request Title</label>
          <input type="text" id="req-title-input" class="form-input" placeholder="e.g. Q4 Tax Documents / Client Assets" required />
        </div>

        <div class="form-group">
          <label for="req-desc-input">Instructions for Uploader (Optional)</label>
          <textarea id="req-desc-input" class="form-textarea" rows="3" placeholder="Please upload high-resolution PDF or archive files..."></textarea>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label for="req-duration-select">Expiration Window</label>
            <select id="req-duration-select" class="form-select">
              <option value="1d">1 Day</option>
              <option value="7d" selected>7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
          <div class="form-group">
            <label for="req-max-submissions">Max Submissions</label>
            <input type="number" id="req-max-submissions" class="form-input" value="20" min="1" max="500" />
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-create-req">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-submit-create-req">Create Request Link</button>
        </div>

        <div class="modal-credit-footer">
          Altrivelle Linker &bull; Developed by ALTRIVELLE TECHNOLOGIES
        </div>
      </div>
    `, {
      title: 'New File Request',
      maxWidth: 'max-w-md',
    });

    document.getElementById('btn-cancel-create-req')?.addEventListener('click', () => modal.close());
    document.getElementById('btn-submit-create-req')?.addEventListener('click', async () => {
      const title = document.getElementById('req-title-input')?.value.trim();
      const desc = document.getElementById('req-desc-input')?.value.trim();
      const duration = document.getElementById('req-duration-select')?.value;
      const maxSubmissions = document.getElementById('req-max-submissions')?.value;

      if (!title) {
        toast.warning('Please enter a request title');
        return;
      }

      try {
        const req = await fileRequestsService.createRequest({
          title,
          description: desc,
          duration,
          maxSubmissions: parseInt(maxSubmissions, 10) || 20,
        });

        navigator.clipboard.writeText(req.requestUrl);
        toast.success('File Request link created and copied to clipboard!');
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Could not create request: ${err.message}`);
      }
    });
  },
};
