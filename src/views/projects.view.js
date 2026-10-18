import { projectsService } from '../services/projects.service.js';
import { toast } from '../ui/toast.js';
import { icons } from '../ui/icons.js';
import { modal } from '../ui/modal.js';

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

const COLOR_PRESETS = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#ea580c', // Orange
  '#16a34a', // Green
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#e11d48', // Rose
];

export const projectsView = {
  projects: [],

  async render(container) {
    container.innerHTML = `
      <div class="projects-page animate-fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Projects & Folders</h1>
            <p class="view-subtitle">Organize and group your files into custom collaborative workspaces</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" id="btn-create-project">
              ${icons.folderPlus(18)} Create Project
            </button>
          </div>
        </div>

        <div id="projects-grid-area" class="projects-grid">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading projects...</p>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-create-project')?.addEventListener('click', () => {
      this.openCreateProjectModal(container);
    });

    await this.loadData(container);
  },

  async loadData(container) {
    try {
      this.projects = await projectsService.getProjects();
      this.renderProjects(container);
    } catch (err) {
      console.error('Error loading projects:', err);
      toast.error('Could not load projects.');
    }
  },

  renderProjects(container) {
    const grid = container.querySelector('#projects-grid-area');
    if (!grid) return;

    if (!this.projects.length) {
      grid.innerHTML = `
        <div class="empty-state-card col-span-full">
          <div class="empty-state-icon">${icons.folder(48)}</div>
          <h3>No projects yet</h3>
          <p>Group files into projects to easily organize shared client deliverables or internal assets.</p>
          <button class="btn btn-primary" id="btn-empty-create-proj">
            ${icons.folderPlus(18)} Create Your First Project
          </button>
        </div>
      `;
      grid.querySelector('#btn-empty-create-proj')?.addEventListener('click', () => {
        this.openCreateProjectModal(container);
      });
      return;
    }

    grid.innerHTML = this.projects
      .map(
        (project) => `
        <div class="project-card animate-scale-up" data-id="${project.id}">
          <div class="project-card-header">
            <div class="project-color-badge" style="background-color: ${project.color || '#2563eb'}20; color: ${project.color || '#2563eb'}">
              ${icons.folder(22)}
            </div>
            <div class="project-card-menu">
              <button type="button" class="btn-icon btn-edit-proj" data-id="${project.id}" title="Edit Project">
                ${icons.edit(16)}
              </button>
              <button type="button" class="btn-icon text-danger btn-delete-proj" data-id="${project.id}" title="Delete Project">
                ${icons.trash(16)}
              </button>
            </div>
          </div>

          <div class="project-card-body">
            <h3 class="project-title">${escapeHtml(project.name)}</h3>
            <p class="project-description">${escapeHtml(project.description) || 'No description provided.'}</p>
          </div>

          <div class="project-card-footer">
            <span class="project-meta-count">${project.fileCount || 0} files</span>
            <span class="project-meta-date">Created ${formatDate(project.created_at)}</span>
          </div>
        </div>
      `
      )
      .join('');

    this.bindCardEvents(grid, container);
  },

  bindCardEvents(grid, container) {
    // Edit
    grid.querySelectorAll('.btn-edit-proj').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const project = this.projects.find((p) => p.id === btn.dataset.id);
        if (project) this.openEditProjectModal(project, container);
      });
    });

    // Delete
    grid.querySelectorAll('.btn-delete-proj').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const project = this.projects.find((p) => p.id === btn.dataset.id);
        if (project) this.openDeleteProjectModal(project, container);
      });
    });
  },

  openCreateProjectModal(container) {
    let selectedColor = COLOR_PRESETS[0];

    modal.open(`
      <div class="project-modal-form">
        <div class="form-group">
          <label for="project-name-input">Project Name</label>
          <input type="text" id="project-name-input" class="form-input" placeholder="e.g. Website Redesign 2026" required />
        </div>

        <div class="form-group">
          <label for="project-desc-input">Description (Optional)</label>
          <textarea id="project-desc-input" class="form-textarea" rows="3" placeholder="Brief summary of this project..."></textarea>
        </div>

        <div class="form-group">
          <label>Accent Color</label>
          <div class="color-palette-picker" id="color-palette">
            ${COLOR_PRESETS.map(
              (c, i) => `
              <button type="button" class="color-swatch ${i === 0 ? 'selected' : ''}" data-color="${c}" style="background-color: ${c}"></button>
            `
            ).join('')}
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-proj">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-submit-proj">Create Project</button>
        </div>

        <div class="modal-credit-footer">
          FileLink &bull; Developed by ALTRIVELLE TECHNOLOGIES
        </div>
      </div>
    `, {
      title: 'New Project',
      maxWidth: 'max-w-md',
    });

    document.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColor = swatch.dataset.color;
      });
    });

    document.getElementById('btn-cancel-proj')?.addEventListener('click', () => modal.close());
    document.getElementById('btn-submit-proj')?.addEventListener('click', async () => {
      const name = document.getElementById('project-name-input').value.trim();
      const desc = document.getElementById('project-desc-input').value.trim();

      if (!name) {
        toast.warning('Please enter a project name.');
        return;
      }

      try {
        await projectsService.createProject(name, desc, selectedColor);
        toast.success(`Project "${name}" created.`);
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Error creating project: ${err.message}`);
      }
    });
  },

  openEditProjectModal(project, container) {
    let selectedColor = project.color || COLOR_PRESETS[0];

    modal.open(`
      <div class="project-modal-form">
        <div class="form-group">
          <label for="edit-proj-name">Project Name</label>
          <input type="text" id="edit-proj-name" class="form-input" value="${escapeHtml(project.name)}" required />
        </div>

        <div class="form-group">
          <label for="edit-proj-desc">Description</label>
          <textarea id="edit-proj-desc" class="form-textarea" rows="3">${escapeHtml(project.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label>Accent Color</label>
          <div class="color-palette-picker" id="edit-color-palette">
            ${COLOR_PRESETS.map(
              (c) => `
              <button type="button" class="color-swatch ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background-color: ${c}"></button>
            `
            ).join('')}
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-edit-proj">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-save-edit-proj">Save Changes</button>
        </div>
      </div>
    `, {
      title: 'Edit Project',
      maxWidth: 'max-w-md',
    });

    document.querySelectorAll('#edit-color-palette .color-swatch').forEach((swatch) => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('#edit-color-palette .color-swatch').forEach((s) => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColor = swatch.dataset.color;
      });
    });

    document.getElementById('btn-cancel-edit-proj')?.addEventListener('click', () => modal.close());
    document.getElementById('btn-save-edit-proj')?.addEventListener('click', async () => {
      const name = document.getElementById('edit-proj-name').value.trim();
      const desc = document.getElementById('edit-proj-desc').value.trim();

      if (!name) {
        toast.warning('Project name is required.');
        return;
      }

      try {
        await projectsService.updateProject(project.id, {
          name,
          description: desc,
          color: selectedColor,
        });
        toast.success('Project updated.');
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Update failed: ${err.message}`);
      }
    });
  },

  openDeleteProjectModal(project, container) {
    modal.open(`
      <div class="delete-confirm-content">
        <div class="delete-icon-box text-danger">
          ${icons.trash(32)}
        </div>
        <h3>Delete Project?</h3>
        <p>Are you sure you want to delete <strong>${escapeHtml(project.name)}</strong>? The project folder will be deleted, but all files in it will remain safe and become unassigned.</p>
        
        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-del-proj">Cancel</button>
          <button type="button" class="btn btn-danger" id="btn-confirm-del-proj">Delete Project</button>
        </div>
      </div>
    `, {
      title: 'Delete Project',
      maxWidth: 'max-w-md',
    });

    document.getElementById('btn-cancel-del-proj')?.addEventListener('click', () => modal.close());
    document.getElementById('btn-confirm-del-proj')?.addEventListener('click', async () => {
      try {
        await projectsService.deleteProject(project.id);
        toast.success(`Project "${project.name}" deleted.`);
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Could not delete project: ${err.message}`);
      }
    });
  },
};
