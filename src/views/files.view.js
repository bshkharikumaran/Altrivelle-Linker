import { filesService } from '../services/files.service.js';
import { projectsService } from '../services/projects.service.js';
import { authService } from '../services/auth.service.js';
import { toast } from '../ui/toast.js';
import { icons } from '../ui/icons.js';
import { previewManager } from '../ui/preview.js';
import { modal } from '../ui/modal.js';
import { shareService } from '../services/share.service.js';
import { openShareModal } from '../ui/shareModal.js';

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
        btn.addEventListener('click', async () => {
          const user = await authService.getCurrentUser();
          if (!user) {
            this.showLoginRequiredModal();
            return;
          }
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
                <button type="button" class="btn-icon btn-share-file" data-id="${file.id}" onclick="window.__altrivelleShareFile && window.__altrivelleShareFile('${file.id}')" title="Share">
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
                        <button type="button" class="action-icon-btn btn-share-file" data-id="${file.id}" onclick="window.__altrivelleShareFile && window.__altrivelleShareFile('${file.id}')" title="Share Link">
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
      uploadBtn.addEventListener('click', async () => {
        const user = await authService.getCurrentUser();
        if (!user) {
          this.showLoginRequiredModal();
          return;
        }
        uploadInput.click();
      });
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
        const file = this.files.find((f) => String(f.id) === String(btn.dataset.id));
        if (file) {
          openShareModal(file, () => this.loadData(container));
        } else {
          toast.error('File not found for sharing.');
        }
      });
    });

    // Also clicking the "Shared" badge on a file card opens the share manager
    area.querySelectorAll('.file-card-badge').forEach((badge) => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = badge.closest('.file-card');
        const fileId = card?.dataset.id;
        const file = this.files.find((f) => f.id === fileId);
        if (file) {
          openShareModal(file, () => this.loadData(container));
        }
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

  openShareManagerModal(file, container) {
    openShareModal(file, () => this.loadData(container));
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

  showLoginRequiredModal() {
    modal.open(`
      <div class="modal-auth-prompt text-center p-3">
        <div class="modal-auth-icon mb-3 flex-center">
          <img src="/assets/altrivelle-linker-logo.png" alt="Altrivelle Linker" style="width: 52px; height: 52px; border-radius: 12px; box-shadow: 0 4px 16px rgba(2,132,199,0.35);" onerror="this.style.display='none'" />
        </div>
        <h3 class="font-bold text-lg mb-1">Account Required for Cloud Storage</h3>
        <p class="text-sm text-muted mb-4">
          To upload and preserve files in your encrypted cloud vault, sign in or create a free account. You can also send files instantly without an account using Direct P2P Transfers.
        </p>
        <div class="flex-col gap-2">
          <a href="#auth" class="btn btn-primary btn-block flex-center gap-2" onclick="document.querySelector('.modal-backdrop')?.remove()">
            ${icons.logIn(16)} <span>Sign In to Account</span>
          </a>
          <a href="#auth" class="btn btn-outline btn-block flex-center gap-2" onclick="document.querySelector('.modal-backdrop')?.remove()">
            ${icons.userPlus(16)} <span>Create Free Account</span>
          </a>
          <a href="#transfers" class="btn btn-ghost btn-block flex-center gap-2 text-primary" onclick="document.querySelector('.modal-backdrop')?.remove()">
            ${icons.sparkles(16)} <span>Use Direct Device-to-Device Transfer (No Login)</span>
          </a>
        </div>
      </div>
    `);
  },
};
