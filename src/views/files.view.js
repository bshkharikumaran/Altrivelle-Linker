import { filesService } from '../services/files.service.js';
import { projectsService } from '../services/projects.service.js';
import { toast } from '../ui/toast.js';
import { icons } from '../ui/icons.js';
import { previewManager } from '../ui/preview.js';
import { modal } from '../ui/modal.js';
import { shareService } from '../services/share.service.js';

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

export const filesView = {
  files: [],
  projects: [],
  viewMode: 'grid', // 'grid' or 'list'
  filterType: 'all',
  filterProject: 'all',
  searchQuery: '',
  sortBy: 'created_at',
  sortOrder: 'desc',

  async render(container) {
    container.innerHTML = `
      <div class="files-page animate-fade-in">
        <!-- Header -->
        <div class="view-header">
          <div>
            <h1 class="view-title">File Manager</h1>
            <p class="view-subtitle">Browse, preview, organize, and share all stored assets</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" id="btn-create-project-shortcut">
              ${icons.folderPlus(18)} New Project
            </button>
            <button class="btn btn-primary" id="btn-trigger-upload">
              ${icons.uploadCloud(18)} Upload
            </button>
            <input type="file" id="files-page-upload-input" multiple class="hidden" />
          </div>
        </div>

        <!-- Toolbar: Search, Filters, View Modes -->
        <div class="files-toolbar">
          <div class="toolbar-left">
            <div class="search-input-wrapper">
              <span class="search-icon">${icons.search(18)}</span>
              <input type="text" id="file-search-input" placeholder="Search files by name..." value="${escapeHtml(this.searchQuery)}" />
              ${this.searchQuery ? `<button type="button" class="btn-clear-search" id="btn-clear-search">&times;</button>` : ''}
            </div>

            <!-- Category Pills -->
            <div class="filter-pills">
              <button class="pill-btn ${this.filterType === 'all' ? 'active' : ''}" data-type="all">All</button>
              <button class="pill-btn ${this.filterType === 'images' ? 'active' : ''}" data-type="images">Images</button>
              <button class="pill-btn ${this.filterType === 'documents' ? 'active' : ''}" data-type="documents">Documents</button>
              <button class="pill-btn ${this.filterType === 'media' ? 'active' : ''}" data-type="media">Media</button>
              <button class="pill-btn ${this.filterType === 'archives' ? 'active' : ''}" data-type="archives">Archives</button>
            </div>
          </div>

          <div class="toolbar-right">
            <!-- Project Filter -->
            <select id="project-filter-select" class="form-select-sm">
              <option value="all">All Projects</option>
              <option value="unassigned" ${this.filterProject === 'unassigned' ? 'selected' : ''}>Unassigned</option>
            </select>

            <!-- Sort By -->
            <select id="sort-filter-select" class="form-select-sm">
              <option value="created_at-desc" ${this.sortBy === 'created_at' && this.sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
              <option value="created_at-asc" ${this.sortBy === 'created_at' && this.sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
              <option value="name-asc" ${this.sortBy === 'name' && this.sortOrder === 'asc' ? 'selected' : ''}>Name (A-Z)</option>
              <option value="size_bytes-desc" ${this.sortBy === 'size_bytes' && this.sortOrder === 'desc' ? 'selected' : ''}>Largest Size</option>
            </select>

            <!-- Grid / List Switcher -->
            <div class="view-mode-toggle">
              <button type="button" class="view-toggle-btn ${this.viewMode === 'grid' ? 'active' : ''}" id="btn-view-grid" title="Grid View">
                ${icons.grid(18)}
              </button>
              <button type="button" class="view-toggle-btn ${this.viewMode === 'list' ? 'active' : ''}" id="btn-view-list" title="List View">
                ${icons.list(18)}
              </button>
            </div>
          </div>
        </div>

        <!-- Files Content Area -->
        <div id="files-display-area" class="files-display-area">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading files...</p>
          </div>
        </div>
      </div>
    `;

    this.bindStaticEvents(container);
    await this.loadData(container);
  },

  async loadData(container) {
    try {
      const [files, projects] = await Promise.all([
        filesService.getFiles({
          projectId: this.filterProject,
          search: this.searchQuery,
          type: this.filterType,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder,
        }),
        projectsService.getProjects(),
      ]);

      this.files = files || [];
      this.projects = projects || [];

      this.updateProjectSelect(container);
      this.renderFiles(container);
    } catch (err) {
      console.error('Error loading files:', err);
      toast.error('Failed to load files.');
    }
  },

  updateProjectSelect(container) {
    const select = container.querySelector('#project-filter-select');
    if (!select) return;

    select.innerHTML = `
      <option value="all" ${this.filterProject === 'all' ? 'selected' : ''}>All Projects</option>
      <option value="unassigned" ${this.filterProject === 'unassigned' ? 'selected' : ''}>Unassigned</option>
      ${this.projects
        .map(
          (p) => `<option value="${p.id}" ${this.filterProject === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
        )
        .join('')}
    `;
  },

  renderFiles(container) {
    const area = container.querySelector('#files-display-area');
    if (!area) return;

    if (!this.files.length) {
      area.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">${icons.files(48)}</div>
          <h3>No files found</h3>
          <p>${this.searchQuery ? 'Try clearing your search or filters.' : 'Upload files or create a project to get started.'}</p>
          <button class="btn btn-primary" id="btn-empty-upload">
            ${icons.uploadCloud(18)} Upload Files Now
          </button>
        </div>
      `;
      const btn = area.querySelector('#btn-empty-upload');
      if (btn) {
        btn.addEventListener('click', () => {
          container.querySelector('#files-page-upload-input')?.click();
        });
      }
      return;
    }

    if (this.viewMode === 'grid') {
      this.renderGridView(area);
    } else {
      this.renderListView(area);
    }

    this.bindFileCardEvents(area, container);
  },

  renderGridView(area) {
    area.innerHTML = `
      <div class="files-grid animate-fade-in">
        ${this.files
          .map((file) => {
            const hasShare = file.share_links && file.share_links.length > 0;
            return `
            <div class="file-card" data-id="${file.id}">
              <div class="file-card-preview btn-preview-file" data-id="${file.id}">
                <div class="file-card-icon">
                  ${icons.fileType(file.mime_type, file.name, 48)}
                </div>
                ${
                  hasShare
                    ? `<span class="badge badge-success file-card-badge">${icons.share(12)} Shared</span>`
                    : ''
                }
              </div>

              <div class="file-card-info">
                <h4 class="file-card-name btn-preview-file" data-id="${file.id}" title="${escapeHtml(file.name)}">
                  ${escapeHtml(file.name)}
                </h4>
                <div class="file-card-meta">
                  <span>${formatBytes(file.size_bytes)}</span>
                  <span>&bull;</span>
                  <span>${formatDate(file.created_at)}</span>
                </div>
                ${
                  file.projects
                    ? `<div class="file-card-project">
                        <span class="color-dot" style="background-color: ${file.projects.color || '#2563eb'}"></span>
                        <span class="project-tag-name">${escapeHtml(file.projects.name)}</span>
                      </div>`
                    : ''
                }
              </div>

              <div class="file-card-actions">
                <button type="button" class="btn-icon btn-preview-file" data-id="${file.id}" title="Preview">
                  ${icons.eye(16)}
                </button>
                <button type="button" class="btn-icon btn-share-file" data-id="${file.id}" title="Share">
                  ${icons.share(16)}
                </button>
                <button type="button" class="btn-icon btn-download-file" data-id="${file.id}" title="Download">
                  ${icons.download(16)}
                </button>
                <button type="button" class="btn-icon btn-rename-file" data-id="${file.id}" title="Rename">
                  ${icons.edit(16)}
                </button>
                <button type="button" class="btn-icon btn-delete-file text-danger" data-id="${file.id}" title="Delete">
                  ${icons.trash(16)}
                </button>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    `;
  },

  renderListView(area) {
    area.innerHTML = `
      <div class="section-card animate-fade-in">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Project</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.files
                .map((file) => {
                  const hasShare = file.share_links && file.share_links.length > 0;
                  return `
                  <tr data-id="${file.id}">
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
                          : `<span class="badge badge-subtle">Unassigned</span>`
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
                        <button type="button" class="action-icon-btn btn-preview-file" data-id="${file.id}" title="Preview">
                          ${icons.eye(16)}
                        </button>
                        <button type="button" class="action-icon-btn btn-share-file" data-id="${file.id}" title="Share Link">
                          ${icons.share(16)}
                        </button>
                        <button type="button" class="action-icon-btn btn-download-file" data-id="${file.id}" title="Download">
                          ${icons.download(16)}
                        </button>
                        <button type="button" class="action-icon-btn btn-rename-file" data-id="${file.id}" title="Rename">
                          ${icons.edit(16)}
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
      </div>
    `;
  },

  bindStaticEvents(container) {
    // Search input with debounce
    const searchInput = container.querySelector('#file-search-input');
    let searchTimeout = null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
          this.searchQuery = e.target.value;
          await this.loadData(container);
        }, 300);
      });
    }

    const clearSearchBtn = container.querySelector('#btn-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', async () => {
        this.searchQuery = '';
        searchInput.value = '';
        await this.loadData(container);
      });
    }

    // Category pills
    container.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        container.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterType = btn.dataset.type;
        await this.loadData(container);
      });
    });

    // Project filter
    const projectSelect = container.querySelector('#project-filter-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', async (e) => {
        this.filterProject = e.target.value;
        await this.loadData(container);
      });
    }

    // Sort select
    const sortSelect = container.querySelector('#sort-filter-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', async (e) => {
        const [sortBy, sortOrder] = e.target.value.split('-');
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        await this.loadData(container);
      });
    }

    // Grid / List toggles
    const gridBtn = container.querySelector('#btn-view-grid');
    const listBtn = container.querySelector('#btn-view-list');

    if (gridBtn) {
      gridBtn.addEventListener('click', () => {
        this.viewMode = 'grid';
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        this.renderFiles(container);
      });
    }

    if (listBtn) {
      listBtn.addEventListener('click', () => {
        this.viewMode = 'list';
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        this.renderFiles(container);
      });
    }

    // Upload triggers
    const uploadInput = container.querySelector('#files-page-upload-input');
    const uploadBtn = container.querySelector('#btn-trigger-upload');
    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener('click', () => uploadInput.click());
    }

    if (uploadInput) {
      uploadInput.addEventListener('change', async (e) => {
        const filesList = Array.from(e.target.files || []);
        if (filesList.length) {
          uploadBtn.disabled = true;
          uploadBtn.textContent = 'Uploading...';
          for (const file of filesList) {
            try {
              const projId = this.filterProject !== 'all' && this.filterProject !== 'unassigned' ? this.filterProject : null;
              await filesService.uploadFile(file, projId);
              toast.success(`"${file.name}" uploaded successfully`);
            } catch (err) {
              toast.error(`"${file.name}" failed: ${err.message}`);
            }
          }
          uploadBtn.disabled = false;
          uploadBtn.innerHTML = `${icons.uploadCloud(18)} Upload`;
          uploadInput.value = '';
          await this.loadData(container);
        }
      });
    }

    // Project shortcut
    const projShortcut = container.querySelector('#btn-create-project-shortcut');
    if (projShortcut) {
      projShortcut.addEventListener('click', () => {
        window.location.hash = '#projects';
      });
    }
  },

  bindFileCardEvents(area, container) {
    // Preview
    area.querySelectorAll('.btn-preview-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const file = this.files.find((f) => f.id === btn.dataset.id);
        if (file) previewManager.openPreview(file);
      });
    });

    // Share
    area.querySelectorAll('.btn-share-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const file = this.files.find((f) => f.id === btn.dataset.id);
        if (file) this.openShareManagerModal(file, container);
      });
    });

    // Download
    area.querySelectorAll('.btn-download-file').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const file = this.files.find((f) => f.id === btn.dataset.id);
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

    // Rename
    area.querySelectorAll('.btn-rename-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const file = this.files.find((f) => f.id === btn.dataset.id);
        if (file) this.openRenameModal(file, container);
      });
    });

    // Delete
    area.querySelectorAll('.btn-delete-file').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const file = this.files.find((f) => f.id === btn.dataset.id);
        if (file) this.openDeleteConfirmModal(file, container);
      });
    });
  },

  async openShareManagerModal(file, container) {
    // Load existing links
    let links = [];
    try {
      links = await shareService.getFileShareLinks(file.id);
    } catch (err) {
      console.warn('Could not load links:', err);
    }

    modal.open(`
      <div class="share-manager-modal">
        <p class="share-modal-subtitle">Share <strong>${escapeHtml(file.name)}</strong> with collaborators</p>

        <!-- Create New Link Form -->
        <div class="share-create-box">
          <h4>Create New Share Link</h4>
          <div class="form-row-2">
            <div class="form-group">
              <label for="share-duration">Expiration</label>
              <select id="share-duration" class="form-select-sm">
                <option value="1h">1 Hour</option>
                <option value="1d">1 Day</option>
                <option value="7d" selected>7 Days</option>
                <option value="30d">30 Days</option>
                <option value="never">No Expiration</option>
              </select>
            </div>
            <div class="form-group">
              <label for="share-limit">Download Limit</label>
              <input type="number" id="share-limit" class="form-input-sm" placeholder="Unlimited" min="1" />
            </div>
          </div>
          <div class="form-group">
            <label for="share-pw">Optional Password</label>
            <input type="text" id="share-pw" class="form-input-sm" placeholder="Leave empty for public access" />
          </div>

          <button type="button" class="btn btn-primary btn-sm" id="btn-submit-create-link">
            ${icons.sparkles(14)} Generate Link
          </button>

          <!-- Generated Link Output Container -->
          <div id="new-link-output" class="share-result-expanded hidden mt-3">
            <div class="result-group">
              <label class="font-medium text-xs text-muted mb-1 block">Web Share Page (Interactive)</label>
              <div class="input-with-button">
                <input type="text" id="new-share-url" readonly class="form-input form-input-sm font-mono" />
                <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-new-share">${icons.copy(14)} Share Link</button>
              </div>
            </div>
            <div class="result-group mt-2">
              <label class="font-medium text-xs text-muted mb-1 block flex-between">
                <span>Direct File Link (For HTML Files / Raw URL)</span>
                <span class="badge badge-primary text-2xs">Raw Asset</span>
              </label>
              <div class="input-with-button">
                <input type="text" id="new-direct-url" readonly class="form-input form-input-sm font-mono" />
                <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-new-direct">${icons.link(14)} Direct Link</button>
              </div>
              <p class="form-hint text-xs">Direct 302 URL to stream into HTML <code>&lt;img&gt;</code>, <code>&lt;video&gt;</code>, or <code>&lt;a&gt;</code> tags.</p>
            </div>
            <div class="result-group mt-2">
              <label class="font-medium text-xs text-muted mb-1 block">Ready-to-Use HTML Snippet</label>
              <div class="input-with-button">
                <input type="text" id="new-html-snippet" readonly class="form-input form-input-sm font-mono" />
                <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-new-html">${icons.copy(14)} Copy HTML</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Existing Active Links -->
        <div class="existing-links-section">
          <h4>Active & Past Links (${links.length})</h4>
          <div class="existing-links-list" id="existing-links-list">
            ${
              links.length === 0
                ? `<p class="empty-subtext">No share links have been generated yet for this file.</p>`
                : links
                    .map(
                      (l) => `
                    <div class="link-item-row ${l.is_revoked || l.isExpired ? 'link-inactive' : ''}">
                      <div class="link-item-meta">
                        <span class="link-token font-mono">${escapeHtml(l.token)}</span>
                        <span class="link-status">
                          ${
                            l.is_revoked
                              ? '<span class="text-danger">Revoked</span>'
                              : l.isExpired
                              ? '<span class="text-warning">Expired</span>'
                              : '<span class="text-success">Active</span>'
                          }
                          &bull; ${l.download_count} downloads
                        </span>
                      </div>
                      <div class="link-item-actions">
                        ${
                          !l.is_revoked && !l.isExpired
                            ? `
                            <button type="button" class="btn-icon btn-copy-link" data-url="${l.shareUrl}" title="Copy Web Share Link">
                              ${icons.copy(16)}
                            </button>
                            <button type="button" class="btn-icon btn-copy-direct-link" data-url="${l.directFileUrl}" title="Copy Direct File Link (For HTML / Raw URL)">
                              ${icons.link(16)}
                            </button>
                            <button type="button" class="btn-icon btn-copy-html-tag" data-snippet="${escapeHtml(l.htmlSnippet)}" title="Copy HTML Snippet Tag">
                              ${icons.sparkles(16)}
                            </button>
                            <button type="button" class="btn-icon text-danger btn-revoke-link" data-id="${l.id}" title="Revoke Link">
                              ${icons.close(16)}
                            </button>
                          `
                            : `
                            <button type="button" class="btn-icon text-muted btn-delete-link" data-id="${l.id}" title="Delete Record">
                              ${icons.trash(16)}
                            </button>
                          `
                        }
                      </div>
                    </div>
                  `
                    )
                    .join('')
            }
          </div>
        </div>

        <div class="modal-credit-footer">
          FileLink &bull; Developed by ALTRIVELLE TECHNOLOGIES
        </div>
      </div>
    `, {
      title: 'Manage Share Links',
      maxWidth: 'max-w-lg',
    });

    // Copy links
    document.querySelectorAll('.btn-copy-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.url);
        toast.success('Share page link copied to clipboard!');
      });
    });

    // Copy direct file links
    document.querySelectorAll('.btn-copy-direct-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.url);
        toast.success('Direct file link copied (use in HTML)!');
      });
    });

    // Copy HTML snippets
    document.querySelectorAll('.btn-copy-html-tag').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.snippet);
        toast.success('HTML embed snippet copied to clipboard!');
      });
    });

    // Revoke link
    document.querySelectorAll('.btn-revoke-link').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await shareService.revokeShareLink(btn.dataset.id);
          toast.success('Share link revoked.');
          modal.close();
          await this.loadData(container);
        } catch (err) {
          toast.error(`Failed to revoke link: ${err.message}`);
        }
      });
    });

    // Delete link record
    document.querySelectorAll('.btn-delete-link').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await shareService.deleteShareLink(btn.dataset.id);
          toast.success('Link record deleted.');
          modal.close();
          await this.loadData(container);
        } catch (err) {
          toast.error(`Failed to delete record: ${err.message}`);
        }
      });
    });

    // Create link
    document.getElementById('btn-submit-create-link')?.addEventListener('click', async () => {
      const duration = document.getElementById('share-duration').value;
      const maxDownloads = document.getElementById('share-limit').value;
      const password = document.getElementById('share-pw').value;
      const submitBtn = document.getElementById('btn-submit-create-link');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';

      try {
        const link = await shareService.createShareLink(file.id, {
          duration,
          maxDownloads,
          password,
        });

        const outputContainer = document.getElementById('new-link-output');
        const shareInput = document.getElementById('new-share-url');
        const directInput = document.getElementById('new-direct-url');
        const htmlInput = document.getElementById('new-html-snippet');

        shareInput.value = link.shareUrl;
        directInput.value = link.directFileUrl;
        htmlInput.value = link.htmlSnippet;

        outputContainer.classList.remove('hidden');

        document.getElementById('btn-copy-new-share').onclick = () => {
          navigator.clipboard.writeText(link.shareUrl);
          toast.success('Share page link copied!');
        };
        document.getElementById('btn-copy-new-direct').onclick = () => {
          navigator.clipboard.writeText(link.directFileUrl);
          toast.success('Direct file link copied (use in HTML)!');
        };
        document.getElementById('btn-copy-new-html').onclick = () => {
          navigator.clipboard.writeText(link.htmlSnippet);
          toast.success('HTML snippet copied!');
        };

        navigator.clipboard.writeText(link.directFileUrl);
        toast.success('Link created & direct file link copied to clipboard!');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${icons.sparkles(14)} Generate Another Link`;
        await this.loadData(container);
      } catch (err) {
        toast.error(`Could not create link: ${err.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${icons.sparkles(14)} Generate Link`;
      }
    });
  },

  openRenameModal(file, container) {
    modal.open(`
      <div class="rename-file-form">
        <div class="form-group">
          <label for="rename-file-input">New File Name</label>
          <input type="text" id="rename-file-input" class="form-input" value="${escapeHtml(file.name)}" required />
        </div>
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-rename">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-rename">Save Changes</button>
        </div>
      </div>
    `, {
      title: 'Rename File',
      maxWidth: 'max-w-md',
    });

    document.getElementById('btn-cancel-rename').addEventListener('click', () => modal.close());
    document.getElementById('btn-confirm-rename').addEventListener('click', async () => {
      const newName = document.getElementById('rename-file-input').value.trim();
      if (!newName) {
        toast.warning('Please enter a valid file name');
        return;
      }

      try {
        await filesService.renameFile(file.id, newName);
        toast.success('File renamed successfully.');
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Rename failed: ${err.message}`);
      }
    });
  },

  openDeleteConfirmModal(file, container) {
    modal.open(`
      <div class="delete-confirm-content">
        <div class="delete-icon-box text-danger">
          ${icons.trash(32)}
        </div>
        <h3>Delete File Permanently?</h3>
        <p>Are you sure you want to delete <strong>${escapeHtml(file.name)}</strong>? All active share links will stop working immediately.</p>
        
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-del">Cancel</button>
          <button type="button" class="btn btn-danger" id="btn-confirm-del">Delete Permanently</button>
        </div>
      </div>
    `, {
      title: 'Confirm Deletion',
      maxWidth: 'max-w-md',
    });

    document.getElementById('btn-cancel-del').addEventListener('click', () => modal.close());
    document.getElementById('btn-confirm-del').addEventListener('click', async () => {
      try {
        await filesService.deleteFile(file.id, file.storage_path);
        toast.success(`"${file.name}" deleted.`);
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Delete failed: ${err.message}`);
      }
    });
  },
};
