import './style.css';
import { authService } from './services/auth.service.js';
import { themeManager } from './ui/theme.js';
import { toast } from './ui/toast.js';
import { modal } from './ui/modal.js';
import { icons } from './ui/icons.js';
import { APP_CONFIG } from './config.js';
import { authView } from './views/auth.view.js';
import { dashboardView } from './views/dashboard.view.js';
import { filesView } from './views/files.view.js';
import { projectsView } from './views/projects.view.js';
import { transfersView } from './views/transfers.view.js';
import { requestsView } from './views/requests.view.js';
import { automationView } from './views/automation.view.js';
import { plansView } from './views/plans.view.js';
import { settingsView } from './views/settings.view.js';
import { landingView } from './views/landing.view.js';
import { adminView } from './views/admin.view.js';
import { adminService } from './services/admin.service.js';
import { filesService } from './services/files.service.js';

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

class AppRouter {
  constructor() {
    this.currentUser = null;
    this.currentRoute = 'showcase';
  }

  async init() {
    themeManager.init();

    try {
      // Check user session
      this.currentUser = await authService.getCurrentUser();
    } catch (authErr) {
      console.warn('Initial session check error:', authErr);
      this.currentUser = null;
    }

    try {
      // Listen to Supabase auth events
      authService.onAuthStateChange(async (event, session) => {
        this.currentUser = session?.user || null;
        if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.navigate('auth');
        } else if (event === 'SIGNED_IN') {
          this.updateUserSidebar();
          if (this.currentRoute === 'auth') {
            this.navigate('dashboard');
          }
        }
      });
    } catch (listenerErr) {
      console.warn('Auth listener registration error:', listenerErr);
    }

    window.addEventListener('hashchange', () => this.handleRouting());

    this.bindGlobalEvents();
    await this.handleRouting();
    await this.updateUserSidebar();
  }

  async handleRouting() {
    let rawHash = window.location.hash.replace('#', '').trim();
    // Support URL query params like #transfers?role=receive&room=ALT-8492
    let hash = rawHash.split('?')[0] || '';
    if (!hash) hash = 'showcase';

    // Route protection: if auth view, handle specifically
    this.currentRoute = hash;
    this.updateActiveNav();

    const mainContainer = document.getElementById('main-content-area');
    const sidebar = document.getElementById('app-sidebar');
    const mobileHeader = document.querySelector('.mobile-header');
    const topBar = document.querySelector('.app-topbar');

    if (!mainContainer) return;

    try {
      // If auth view, adapt layout
      if (hash === 'auth') {
        if (sidebar) sidebar.classList.add('hidden');
        if (mobileHeader) mobileHeader.classList.add('hidden');
        if (topBar) topBar.classList.add('hidden');
        authView.render(mainContainer);
        return;
      }

      if (hash === 'landing' || hash === 'showcase') {
        if (sidebar) sidebar.classList.remove('hidden');
        if (mobileHeader) mobileHeader.classList.remove('hidden');
        if (topBar) topBar.classList.remove('hidden');
        landingView.render(mainContainer);
        return;
      }

      if (sidebar) sidebar.classList.remove('hidden');
      if (mobileHeader) mobileHeader.classList.remove('hidden');
      if (topBar) topBar.classList.remove('hidden');

      // Render corresponding view
      switch (hash) {
        case 'dashboard':
          await dashboardView.render(mainContainer);
          break;
        case 'files':
          await filesView.render(mainContainer);
          break;
        case 'projects':
          await projectsView.render(mainContainer);
          break;
        case 'transfers':
          transfersView.render(mainContainer);
          break;
        case 'requests':
          await requestsView.render(mainContainer);
          break;
        case 'automation':
          await automationView.render(mainContainer);
          break;
        case 'plans':
          plansView.render(mainContainer);
          break;
        case 'settings':
          await settingsView.render(mainContainer);
          break;
        case 'admin': {
          const isAdmin = await adminService.isCurrentUserAdmin();
          if (!isAdmin) {
            toast.error('Administrative access restricted to designated platform owner.');
            this.navigate('dashboard');
            return;
          }
          await adminView.render(mainContainer);
          break;
        }
        default:
          landingView.render(mainContainer);
      }
    } catch (routeErr) {
      console.error('Error rendering route:', hash, routeErr);
      landingView.render(mainContainer);
    }

    try {
      this.updateStorageMeter();
    } catch (_) {}
  }

  navigate(route) {
    window.location.hash = `#${route}`;
  }

  updateActiveNav() {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => {
      const route = link.dataset.route;
      const isShowcase = (route === 'showcase' || route === 'landing') && (this.currentRoute === 'showcase' || this.currentRoute === 'landing');
      if (route === this.currentRoute || isShowcase) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  async updateUserSidebar() {
    const nameEl = document.getElementById('sidebar-user-name');
    const emailEl = document.getElementById('sidebar-user-email');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const topbarAvatarEl = document.getElementById('topbar-user-avatar');
    const mobileAvatarEl = document.getElementById('mobile-user-avatar');
    const adminNavLink = document.getElementById('nav-link-admin');

    let isAdmin = false;
    try {
      isAdmin = await adminService.isCurrentUserAdmin();
    } catch (_) {
      isAdmin = false;
    }

    if (adminNavLink) {
      if (isAdmin) {
        adminNavLink.classList.remove('hidden');
      } else {
        adminNavLink.classList.add('hidden');
      }
    }

    if (this.currentUser) {
      const email = this.currentUser.email || 'user@altrivelle.app';
      const name = this.currentUser.user_metadata?.full_name || email.split('@')[0];
      const initial = name.charAt(0).toUpperCase();

      if (nameEl) {
        nameEl.innerHTML = `${escapeHtml(name)} ${isAdmin ? '<span class="badge badge-admin-inline">ADMIN</span>' : ''}`;
      }
      if (emailEl) emailEl.textContent = email;
      if (avatarEl) avatarEl.textContent = initial;
      if (topbarAvatarEl) topbarAvatarEl.textContent = initial;
      if (mobileAvatarEl) mobileAvatarEl.textContent = initial;
    } else {
      if (nameEl) nameEl.textContent = 'Active Session';
      if (emailEl) emailEl.textContent = 'ALTRIVELLE TECHNOLOGIES';
      if (avatarEl) avatarEl.textContent = 'A';
      if (topbarAvatarEl) topbarAvatarEl.textContent = 'A';
      if (mobileAvatarEl) mobileAvatarEl.textContent = 'A';
    }
  }

  async updateStorageMeter() {
    const percentEl = document.getElementById('sidebar-storage-percent');
    const barEl = document.getElementById('sidebar-storage-bar');
    const textEl = document.getElementById('sidebar-storage-text');

    try {
      const stats = await filesService.getStats();
      const used = stats?.totalBytes || 0;
      const quota = stats?.quotaBytes || APP_CONFIG.defaultQuotaBytes;
      const percent = Math.min(100, Math.round((used / quota) * 100));

      if (percentEl) percentEl.textContent = `${percent}%`;
      if (barEl) {
        barEl.style.width = `${percent}%`;
        barEl.className = `progress-bar-fill ${percent > 85 ? 'bg-danger' : percent > 65 ? 'bg-warning' : 'bg-primary'}`;
      }
      if (textEl) textEl.textContent = `${formatBytes(used)} / ${formatBytes(quota)}`;
    } catch {
      // ignore
    }
  }

  async toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown-menu');
    if (!dropdown) return;

    if (!dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
      return;
    }

    // Build rich profile & account controller
    const user = this.currentUser || await authService.getCurrentUser();
    const profile = await authService.getProfile();
    const isAdmin = await adminService.isCurrentUserAdmin();

    const email = user?.email || 'user@altrivelle.app';
    const name = profile?.full_name || user?.user_metadata?.full_name || email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    const planTier = (profile?.plan_tier || 'community').toUpperCase();

    let stats = null;
    try { stats = await filesService.getStats(); } catch (_) {}
    const used = stats?.totalBytes || profile?.storage_used || 0;
    const quota = stats?.quotaBytes || profile?.storage_quota || APP_CONFIG.defaultQuotaBytes;
    const percent = Math.min(100, Math.round((used / quota) * 100));

    dropdown.innerHTML = `
      <div class="profile-dropdown-header">
        <div class="profile-dropdown-avatar">${initial}</div>
        <div class="profile-dropdown-info">
          <div class="profile-dropdown-name">${escapeHtml(name)}</div>
          <div class="profile-dropdown-email">${escapeHtml(email)}</div>
          <div class="profile-dropdown-badges mt-1 flex-center gap-1">
            <span class="badge badge-success text-xs">${planTier} PLAN</span>
            ${isAdmin ? '<span class="badge badge-admin-inline">ADMIN</span>' : ''}
          </div>
        </div>
      </div>

      <div class="profile-dropdown-storage">
        <div class="flex-between text-xs text-muted mb-1">
          <span>Storage Allocation</span>
          <span>${formatBytes(used)} / ${formatBytes(quota)}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${percent > 85 ? 'bg-danger' : percent > 65 ? 'bg-warning' : 'bg-primary'}" style="width: ${percent}%;"></div>
        </div>
      </div>

      <div class="dropdown-divider"></div>

      <div class="profile-dropdown-links">
        <button type="button" class="profile-dropdown-item" id="menu-btn-profile">
          ${icons.user(16)} <span>Account & Security Settings</span>
        </button>
        <button type="button" class="profile-dropdown-item" id="menu-btn-edit-name">
          ${icons.edit(16)} <span>Edit Display Name</span>
        </button>
        <button type="button" class="profile-dropdown-item" id="menu-btn-plans">
          ${icons.shield(16)} <span>Subscription Plans (₹ INR)</span>
        </button>
        ${isAdmin ? `
          <button type="button" class="profile-dropdown-item text-primary" id="menu-btn-admin">
            ${icons.shieldAlert(16)} <span>Admin Console</span>
          </button>
        ` : ''}
        <button type="button" class="profile-dropdown-item" id="menu-btn-switch">
          ${icons.users(16)} <span>Switch / Sign In Account</span>
        </button>
      </div>

      <div class="dropdown-divider"></div>

      <div class="profile-dropdown-footer">
        <button type="button" class="btn btn-outline btn-block btn-sm text-danger" id="menu-btn-logout">
          ${icons.logOut(14)} Sign Out
        </button>
      </div>
    `;

    dropdown.classList.remove('hidden');

    // Event handlers for menu actions
    const closeDropdown = () => dropdown.classList.add('hidden');

    dropdown.querySelector('#menu-btn-profile')?.addEventListener('click', () => {
      closeDropdown();
      window.location.hash = '#settings';
    });

    dropdown.querySelector('#menu-btn-edit-name')?.addEventListener('click', () => {
      closeDropdown();
      this.showEditNameModal(name);
    });

    dropdown.querySelector('#menu-btn-plans')?.addEventListener('click', () => {
      closeDropdown();
      window.location.hash = '#plans';
    });

    dropdown.querySelector('#menu-btn-admin')?.addEventListener('click', () => {
      closeDropdown();
      window.location.hash = '#admin';
    });

    dropdown.querySelector('#menu-btn-switch')?.addEventListener('click', () => {
      closeDropdown();
      window.location.hash = '#auth';
    });

    dropdown.querySelector('#menu-btn-logout')?.addEventListener('click', async () => {
      closeDropdown();
      try {
        await authService.signOut();
        toast.info('Signed out successfully.');
        this.currentUser = null;
        this.navigate('auth');
      } catch (err) {
        toast.error(`Error signing out: ${err.message}`);
      }
    });
  }

  showEditNameModal(currentName = '') {
    modal.open(`
      <form id="quick-edit-name-form" class="mt-2">
        <p class="text-sm text-muted mb-3">Update your display name visible across shares, team workspaces, and comments.</p>
        <div class="form-group text-left">
          <label for="input-edit-display-name">Full Display Name</label>
          <input type="text" id="input-edit-display-name" class="form-input" value="${escapeHtml(currentName)}" required autofocus />
        </div>
        <div class="modal-footer-actions mt-4 flex-between">
          <button type="button" class="btn btn-outline" id="btn-cancel-edit-name">Cancel</button>
          <button type="submit" class="btn btn-primary" id="btn-save-edit-name">Save Changes</button>
        </div>
      </form>
    `, { title: 'Account Profile: Edit Display Name' });

    document.getElementById('btn-cancel-edit-name')?.addEventListener('click', () => modal.close());

    document.getElementById('quick-edit-name-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = (document.getElementById('input-edit-display-name')?.value || '').trim();
      if (!newName) return;

      const saveBtn = document.getElementById('btn-save-edit-name');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        await authService.updateProfile({ full_name: newName });
        toast.success(`Display name updated to "${newName}"`);
        modal.close();
        await this.updateUserSidebar();
        if (this.currentRoute === 'settings') {
          await settingsView.render(document.getElementById('main-content-area'));
        }
      } catch (err) {
        toast.error(`Update failed: ${err.message}`);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Changes';
        }
      }
    });
  }

  bindGlobalEvents() {
    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('btn-toggle-mobile-sidebar');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    const toggleSidebar = () => {
      sidebar.classList.toggle('mobile-open');
      backdrop.classList.toggle('hidden');
    };

    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (backdrop) backdrop.addEventListener('click', toggleSidebar);

    // Auto-close sidebar on mobile after clicking any link
    sidebar?.querySelectorAll('.sidebar-nav-item, .brand-logo-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (sidebar?.classList.contains('mobile-open')) {
          sidebar.classList.remove('mobile-open');
          backdrop?.classList.add('hidden');
        }
      });
    });

    // Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await authService.signOut();
          toast.info('Signed out successfully.');
          this.currentUser = null;
          this.navigate('auth');
        } catch (err) {
          toast.error(`Error signing out: ${err.message}`);
        }
      });
    }

    // Topbar theme toggles
    const themeBtnMobile = document.getElementById('btn-theme-toggle-mobile');
    const themeBtnTopbar = document.getElementById('btn-theme-toggle-topbar');

    [themeBtnMobile, themeBtnTopbar].forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', () => {
          const newTheme = themeManager.toggle();
          toast.info(`Theme changed to ${newTheme} mode`);
        });
      }
    });

    // Profile Account Controller button triggers (topbar and mobile)
    const profileBtnTopbar = document.getElementById('btn-topbar-profile');
    const profileBtnMobile = document.getElementById('btn-mobile-profile');

    [profileBtnTopbar, profileBtnMobile].forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleProfileMenu();
        });
      }
    });

    // Outside click to close profile dropdown
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('profile-dropdown-menu');
      const topbarTrigger = document.getElementById('btn-topbar-profile');
      const mobileTrigger = document.getElementById('btn-mobile-profile');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && !topbarTrigger?.contains(e.target) && !mobileTrigger?.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      }
    });

    // Escape to close dropdown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('profile-dropdown-menu')?.classList.add('hidden');
      }
    });

    // About ALTRIVELLE TECHNOLOGIES modal triggers
    const aboutTriggers = [
      document.getElementById('btn-about-altrivelle'),
      document.getElementById('btn-about-company-header'),
      document.getElementById('btn-footer-about'),
    ];

    aboutTriggers.forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', () => this.showAboutModal());
      }
    });

    // Quick search keyboard shortcut: '/'
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        window.location.hash = '#files';
        setTimeout(() => {
          document.getElementById('file-search-input')?.focus();
        }, 150);
      }
    });

    // Topbar quick search button
    const searchTrigger = document.getElementById('topbar-search-trigger');
    if (searchTrigger) {
      searchTrigger.addEventListener('click', () => {
        window.location.hash = '#files';
        setTimeout(() => {
          document.getElementById('file-search-input')?.focus();
        }, 150);
      });
    }
  }

  showAboutModal() {
    modal.open(`
      <div class="about-altrivelle-modal">
        <div class="about-hero-header">
          <img src="/assets/altrivelle-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="about-company-logo" onerror="this.style.display='none'" />
          <h2 class="about-brand-title">ALTRIVELLE TECHNOLOGIES</h2>
          <p class="about-brand-slogan">Think Beyond. Build Forward.</p>
        </div>

        <div class="about-content-body">
          <p>
            <strong>Altrivelle Linker</strong> is conceived, designed, and developed by <strong>ALTRIVELLE TECHNOLOGIES</strong> as an innovative, production-oriented file-sharing and file-transfer platform.
          </p>

          <div class="feature-highlights-box">
            <h4>Pillars of Altrivelle Linker</h4>
            <ul class="highlights-list">
              <li><strong>Adaptive Transfer:</strong> Persistent Cloud, Ephemeral Self-Destruct, and Direct WebRTC Device-to-Device transfer.</li>
              <li><strong>Trust Passport &trade;:</strong> Transparent security, SHA-256 cryptographic integrity verification, and access history for every shared asset.</li>
              <li><strong>FileLink DropBox:</strong> Secure, anonymous client file-request links that isolate submissions in private storage.</li>
              <li><strong>Developer Flow:</strong> Built-in REST APIs, official CLI binary tool, and HMAC-SHA256 signed webhooks.</li>
            </ul>
          </div>

          <div class="about-meta-grid">
            <div>
              <span class="meta-label">Creator & Developer</span>
              <span class="meta-val font-semibold">ALTRIVELLE TECHNOLOGIES</span>
            </div>
            <div>
              <span class="meta-label">Release Version</span>
              <span class="meta-val">1.2.0 Open Core</span>
            </div>
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn btn-primary" id="btn-close-about">Close</button>
        </div>

        <div class="modal-credit-footer">
          &copy; 2026 Altrivelle Linker. All rights reserved. Developed by ALTRIVELLE TECHNOLOGIES.
        </div>
      </div>
    `, {
      title: 'About Altrivelle Linker',
      maxWidth: 'max-w-lg',
    });

    document.getElementById('btn-close-about')?.addEventListener('click', () => modal.close());
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const router = new AppRouter();
  router.init();
});
