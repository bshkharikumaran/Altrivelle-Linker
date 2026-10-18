import { filesService } from '../services/files.service.js';
import { projectsService } from '../services/projects.service.js';
import { toast } from '../ui/toast.js';
import { icons } from '../ui/icons.js';
import { previewManager } from '../ui/preview.js';
import { modal } from '../ui/modal.js';
import { shareService } from '../services/share.service.js';
import { riskAdvisor } from '../services/riskAdvisor.service.js';
import { trustPassport } from '../ui/trustPassport.js';
import { openShareModal as showShareModalDialog } from '../ui/shareModal.js';
import { APP_CONFIG } from '../config.js';

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const date = new Date(isoStr);
  return date.toLocaleDateString(undefined, {
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

export const dashboardView = {
  stats: null,
  recentFiles: [],
  projects: [],
  selectedUploadProject: '',

  async render(container) {
    container.innerHTML = `
      <div class="dashboard-page animate-fade-in">
        <!-- Dashboard Header -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Overview Dashboard</h1>
            <p class="view-subtitle">Intelligent file transfers, storage quotas, and security monitoring</p>
          </div>
          <div class="header-actions">
            <a href="#transfers" class="btn btn-outline">
              ${icons.sparkles(16)} Adaptive Transfers
            </a>
            <button class="btn btn-primary" id="btn-quick-upload">
              ${icons.uploadCloud(18)} Upload Files
            </button>
          </div>
        </div>

        <!-- Metrics Cards -->
        <div class="stats-grid" id="stats-grid-container">
          <div class="stat-card skeleton-card"></div>
          <div class="stat-card skeleton-card"></div>
          <div class="stat-card skeleton-card"></div>
          <div class="stat-card skeleton-card"></div>
        </div>

        <!-- Upload Drop Zone -->
        <div class="upload-section">
          <div class="upload-dropzone" id="dropzone">
            <input type="file" id="file-input" multiple class="hidden" />
            <div class="dropzone-glow"></div>
            <div class="dropzone-inner">
              <div class="dropzone-icon-box">
                ${icons.uploadCloud(36, 'upload-cloud-icon')}
              </div>
              <h3 class="dropzone-title">Drag and drop your files here</h3>
              <p class="dropzone-hint">
                Support for all formats up to <strong>${APP_CONFIG.maxUploadSizeMB} MB</strong> &bull; Zero-Trust Isolated Storage
              </p>
              <div class="dropzone-actions">
                <button type="button" class="btn btn-outline" id="btn-browse-files">
                  Browse Files
                </button>
                <div class="upload-project-picker">
                  <label for="upload-project-select" class="sr-only">Assign to project</label>
                  <select id="upload-project-select" class="form-select-sm">
                    <option value="">No Project (Root)</option>
                  </select>
                </div>
              </div>
            </div>
            <!-- Upload Progress Overlay / List -->
            <div id="upload-progress-list" class="upload-progress-list hidden"></div>
          </div>
        </div>

        <!-- Recent Uploads Section -->
        <div class="section-card recent-uploads-card">
          <div class="section-card-header">
            <div>
              <h2 class="section-title">Recent Files</h2>
              <p class="section-subtitle">Quickly preview, inspect Trust Passport, or generate secure links</p>
            </div>
            <a href="#files" class="link-btn-text">
              View all files ${icons.files(14)}
            </a>
          </div>

          <div id="recent-files-table-container">
            <div class="skeleton-table">
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
              <div class="skeleton-row"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindStaticEvents(container);
    await this.loadData(container);
  },

  async loadData(container) {
    try {
      const results = await Promise.allSettled([
        filesService.getStats(),
        filesService.getFiles({ sortBy: 'created_at', sortOrder: 'desc' }),
        projectsService.getProjects(),
      ]);

      const stats = results[0].status === 'fulfilled' ? results[0].value : null;
      const files = results[1].status === 'fulfilled' ? results[1].value : [];
      const projects = results[2].status === 'fulfilled' ? results[2].value : [];

      this.stats = stats || {
        totalFiles: files.length,
        totalBytes: files.reduce((acc, f) => acc + (f.size_bytes || 0), 0),
        quotaBytes: APP_CONFIG.defaultQuotaBytes,
        projectCount: projects.length,
        publicCount: files.filter((f) => f.is_public).length,
        privateCount: files.filter((f) => !f.is_public).length,
      };
      this.recentFiles = (files || []).slice(0, 5);
      this.projects = projects || [];

      this.renderStats(container);
      this.renderProjectsDropdown(container);
      this.renderRecentFiles(container);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      this.stats = this.stats || {
        totalFiles: 0,
        totalBytes: 0,
        quotaBytes: APP_CONFIG.defaultQuotaBytes,
        projectCount: 0,
        publicCount: 0,
        privateCount: 0,
      };
      this.renderStats(container);
      this.renderProjectsDropdown(container);
      this.renderRecentFiles(container);
    }
  },

  renderStats(container) {
    const grid = container.querySelector('#stats-grid-container');
    if (!grid) return;

    const used = this.stats?.totalBytes || 0;
    const quota = this.stats?.quotaBytes || APP_CONFIG.defaultQuotaBytes;
    const percent = Math.min(100, Math.round((used / quota) * 100));

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon-wrapper text-blue">
          ${icons.files(22)}
        </div>
        <div class="stat-content">
          <span class="stat-label">Total Files</span>
          <span class="stat-value">${this.stats?.totalFiles || 0}</span>
          <span class="stat-subtext">${this.stats?.publicCount || 0} public &bull; ${this.stats?.privateCount || 0} private</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper text-indigo">
          ${icons.folder(22)}
        </div>
        <div class="stat-content">
          <span class="stat-label">Active Projects</span>
          <span class="stat-value">${this.stats?.projectCount || 0}</span>
          <span class="stat-subtext">Workspaces</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper text-emerald">
          ${icons.hardDrive(22)}
        </div>
        <div class="stat-content">
          <span class="stat-label">Storage Allocation</span>
          <span class="stat-value">${formatBytes(used)}</span>
          <span class="stat-subtext">${percent}% of ${formatBytes(quota)} quota</span>
          <div class="progress-bar-track">
            <div class="progress-bar-fill ${percent > 85 ? 'bg-danger' : percent > 65 ? 'bg-warning' : 'bg-primary'}" style="width: ${percent}%;"></div>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-wrapper text-purple">
          ${icons.shield(22)}
        </div>
        <div class="stat-content">
          <span class="stat-label">Security & Isolation</span>
          <span class="stat-value">Zero-Trust</span>
          <span class="stat-subtext">RLS & Trust Passport Active</span>
        </div>
      </div>
    `;
  },

  renderProjectsDropdown(container) {
    const select = container.querySelector('#upload-project-select');
    if (!select) return;

    select.innerHTML = `
      <option value="">No Project (Root)</option>
      ${this.projects
        .map(
          (p) => `<option value="${p.id}" ${this.selectedUploadProject === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
        )
        .join('')}
    `;

    select.addEventListener('change', (e) => {
      this.selectedUploadProject = e.target.value;
    });
  },

  renderRecentFiles(container) {
    const tableContainer = container.querySelector('#recent-files-table-container');
    if (!tableContainer) return;

    if (!this.recentFiles.length) {
      tableContainer.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">${icons.files(36)}</div>
          <h3>No files uploaded yet</h3>
          <p>Drag files into the upload zone above to get started with Altrivelle Linker.</p>
        </div>
      `;
      return;
    }

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Project</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Sharing</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.recentFiles
              .map((file) => {
                const hasShare = file.share_links && file.share_links.length > 0;
                return `
                <tr data-file-id="${file.id}">
                  <td>
                    <div class="table-file-name-cell">
                      <span class="file-icon">${icons.fileType(file.mime_type, file.name, 22)}</span>
                      <button type="button" class="file-link-name btn-preview-file" data-id="${file.id}">
                        ${escapeHtml(file.name)}
                      </button>
                    </div>
                  </td>
                  <td>
                    ${
                      file.projects
                        ? `<span class="badge badge-project" style="border-left: 3px solid ${file.projects.color || '#2563eb'}">${escapeHtml(file.projects.name)}</span>`
                        : `<span class="badge badge-subtle">None</span>`
                    }
                  </td>
                  <td class="text-nowrap">${formatBytes(file.size_bytes)}</td>
                  <td class="text-nowrap">${formatDate(file.created_at)}</td>
                  <td>
                    ${
                      hasShare
                        ? `<span class="badge badge-success">${icons.share(12)} Shared</span>`
                        : `<span class="badge badge-subtle">Private</span>`
                    }
                  </td>
                  <td class="text-right">
                    <div class="table-actions">
                      <button type="button" class="action-icon-btn btn-passport-file" data-id="${file.id}" title="Trust Passport">
                        ${icons.shield(16)}
                      </button>
                      <button type="button" class="action-icon-btn btn-preview-file" data-id="${file.id}" title="Preview">
                        ${icons.eye(16)}
                      </button>
                      <button type="button" class="action-icon-btn btn-share-file" data-id="${file.id}" onclick="window.__altrivelleShareFile && window.__altrivelleShareFile('${file.id}')" title="Share Link">
                        ${icons.share(16)}
                      </button>
                      <button type="button" class="action-icon-btn btn-download-file" data-id="${file.id}" title="Download">
                        ${icons.download(16)}
                      </button>
                      <button type="button" class="action-icon-btn btn-delete-file text-danger" data-id="${file.id}" title="Delete">
                        ${icons.trash(16)}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    this.bindTableEvents(tableContainer);
  },

  bindStaticEvents(container) {
    const fileInput = container.querySelector('#file-input');
    const browseBtn = container.querySelector('#btn-browse-files');
    const quickUploadBtn = container.querySelector('#btn-quick-upload');
    const dropzone = container.querySelector('#dropzone');

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => fileInput.click());
    }

    if (quickUploadBtn && fileInput) {
      quickUploadBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.length) {
          this.handleFilesUpload(Array.from(e.target.files), container);
          fileInput.value = '';
        }
      });
    }

    // Drag & Drop
    if (dropzone) {
      ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files?.length) {
          this.handleFilesUpload(Array.from(files), container);
        }
      });
    }
  },

  async handleFilesUpload(filesList, container) {
    const progressList = container.querySelector('#upload-progress-list');
    if (progressList) progressList.classList.remove('hidden');

    for (const file of filesList) {
      const itemEl = document.createElement('div');
      itemEl.className = 'upload-progress-item animate-fade-in';
      itemEl.innerHTML = `
        <div class="progress-item-details">
          <span class="progress-file-name">${escapeHtml(file.name)}</span>
          <span class="progress-file-size">${formatBytes(file.size)}</span>
        </div>
        <div class="progress-item-bar-track">
          <div class="progress-item-bar-fill" style="width: 5%;"></div>
        </div>
        <span class="progress-percent">0%</span>
      `;
      progressList.appendChild(itemEl);

      const fill = itemEl.querySelector('.progress-item-bar-fill');
      const text = itemEl.querySelector('.progress-percent');

      try {
        await filesService.uploadFile(file, this.selectedUploadProject || null, (percent) => {
          fill.style.width = `${percent}%`;
          text.textContent = `${percent}%`;
        });

        itemEl.classList.add('upload-complete');
        text.innerHTML = `${icons.check(14)} Done`;
        toast.success(`"${file.name}" uploaded successfully`);
      } catch (err) {
        console.error('Upload failed:', err);
        itemEl.classList.add('upload-error');
        text.textContent = 'Failed';
        toast.error(`"${file.name}" failed: ${err.message}`);
      }
    }

    setTimeout(async () => {
      await this.loadData(container);
      if (progressList) {
        setTimeout(() => {
          progressList.innerHTML = '';
          progressList.classList.add('hidden');
        }, 3000);
      }
    }, 1000);
  },

  bindTableEvents(tableContainer) {
    if (!tableContainer) return;

    // Helper to resolve file reference reliably
    const resolveFile = async (fileId) => {
      let file = this.recentFiles.find((f) => String(f.id) === String(fileId));
      if (!file) {
        try {
          const allFiles = await filesService.getFiles();
          file = (allFiles || []).find((f) => String(f.id) === String(fileId));
        } catch (err) {
          console.warn('File lookup fallback failed:', err);
        }
      }
      return file;
    };

    // 1. Direct event bindings on button elements
    tableContainer.querySelectorAll('.btn-passport-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(btn.dataset.id);
        if (file) this.openPassportModal(file);
      });
    });

    tableContainer.querySelectorAll('.btn-preview-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(btn.dataset.id);
        if (file) previewManager.openPreview(file);
      });
    });

    tableContainer.querySelectorAll('.btn-share-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(btn.dataset.id);
        if (file) {
          this.openShareModal(file);
        } else {
          toast.error('File not found for sharing.');
        }
      });
    });

    tableContainer.querySelectorAll('.btn-download-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(btn.dataset.id);
        if (file) {
          try {
            const url = await filesService.getSignedDownloadUrl(file.storage_path, file.name);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Download started for ${file.name}`);
          } catch (err) {
            toast.error(`Download failed: ${err.message}`);
          }
        }
      });
    });

    tableContainer.querySelectorAll('.btn-delete-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(btn.dataset.id);
        if (file) this.openDeleteConfirmModal(file);
      });
    });

    // 2. Event delegation as a backup in case of SVG or inner target clicks
    tableContainer.onclick = async (e) => {
      const shareBtn = e.target.closest('.btn-share-file');
      if (shareBtn) {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(shareBtn.dataset.id);
        if (file) {
          this.openShareModal(file);
        } else {
          toast.error('File not found for sharing.');
        }
        return;
      }

      const passportBtn = e.target.closest('.btn-passport-file');
      if (passportBtn) {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(passportBtn.dataset.id);
        if (file) this.openPassportModal(file);
        return;
      }

      const previewBtn = e.target.closest('.btn-preview-file');
      if (previewBtn) {
        e.preventDefault();
        e.stopPropagation();
        const file = await resolveFile(previewBtn.dataset.id);
        if (file) previewManager.openPreview(file);
        return;
      }
    };
  },

  openPassportModal(file) {
    modal.open(`
      <div class="passport-modal-wrapper">
        ${trustPassport.render({
          fileName: file.name,
          sizeBytes: file.size_bytes,
          mimeType: file.mime_type,
          sha256: file.sha256_hash || null,
          storageClass: 'Private Object Storage (Supabase)',
          sharingMode: 'Persistent Cloud',
          hasPassword: false,
        })}
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-primary" id="btn-close-passport">Done</button>
        </div>
      </div>
    `, {
      title: 'Trust Passport Manifest',
      maxWidth: 'max-w-lg',
    });

    document.getElementById('btn-close-passport')?.addEventListener('click', () => modal.close());
  },

  openShareModal(file) {
    if (!file) {
      toast.error('Invalid file reference for sharing.');
      return;
    }
    const mainContainer = document.getElementById('main-content-area');
    showShareModalDialog(file, () => {
      if (mainContainer) this.loadData(mainContainer);
    });
  },

  openDeleteConfirmModal(file) {
    modal.open(`
      <div class="delete-confirm-content">
        <div class="delete-icon-box text-danger">
          ${icons.trash(32)}
        </div>
        <h3>Delete File Permanently?</h3>
        <p>Are you sure you want to delete <strong>${escapeHtml(file.name)}</strong>? This will permanently remove the file and invalidate any active share links.</p>
        
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-delete">Cancel</button>
          <button type="button" class="btn btn-danger" id="btn-confirm-delete">Delete Permanently</button>
        </div>
      </div>
    `, {
      title: 'Confirm Deletion',
      maxWidth: 'max-w-md',
    });

    document.getElementById('btn-cancel-delete').addEventListener('click', () => modal.close());
    document.getElementById('btn-confirm-delete').addEventListener('click', async () => {
      const confirmBtn = document.getElementById('btn-confirm-delete');
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting...';

      try {
        await filesService.deleteFile(file.id, file.storage_path);
        toast.success(`"${file.name}" deleted.`);
        modal.close();
        const mainContainer = document.getElementById('main-content-area');
        if (mainContainer) await this.loadData(mainContainer);
      } catch (err) {
        toast.error(`Failed to delete: ${err.message}`);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete Permanently';
      }
    });
  },
};

// Global helper for opening the share modal from inline HTML or any dashboard element
if (typeof window !== 'undefined') {
  window.__altrivelleShareFile = async (fileId) => {
    if (!fileId) return;
    let file = dashboardView.recentFiles?.find((f) => String(f.id) === String(fileId));
    if (!file) {
      try {
        const allFiles = await filesService.getFiles();
        file = (allFiles || []).find((f) => String(f.id) === String(fileId));
      } catch (err) {
        console.warn('Global share file lookup fallback failed:', err);
      }
    }
    if (file) {
      dashboardView.openShareModal(file);
    } else {
      toast.error('File details not found for sharing.');
    }
  };
}

