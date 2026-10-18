import { authService } from '../services/auth.service.js';
import { themeManager } from '../ui/theme.js';
import { toast } from '../ui/toast.js';
import { icons } from '../ui/icons.js';
import { APP_CONFIG } from '../config.js';

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

export const settingsView = {
  profile: null,
  user: null,

  async render(container) {
    this.user = await authService.getCurrentUser();
    this.profile = await authService.getProfile();

    const used = this.profile?.storage_used || 0;
    const quota = this.profile?.storage_quota || APP_CONFIG.defaultQuotaBytes;
    const percent = Math.min(100, Math.round((used / quota) * 100));

    const fullName = this.profile?.full_name || this.user?.user_metadata?.full_name || this.user?.user_metadata?.name || this.user?.email?.split('@')[0] || 'User';
    const avatarUrl = this.profile?.avatar_url || this.user?.user_metadata?.avatar_url || this.user?.user_metadata?.picture || null;
    const initial = fullName.charAt(0).toUpperCase();
    const isGoogle = authService.isGoogleUser(this.user);

    container.innerHTML = `
      <div class="settings-page animate-fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Settings & System</h1>
            <p class="view-subtitle">Manage preferences, storage allocation, and platform details</p>
          </div>
        </div>

        <div class="settings-grid">
          <!-- Left Column -->
          <div class="settings-main-col">
            <!-- Profile Card -->
            <div class="section-card settings-card">
              <div class="section-card-header">
                <div>
                  <h3 class="section-title">User Profile</h3>
                  <p class="section-subtitle">Your personal account information & authentication</p>
                </div>
              </div>

              <!-- Profile Identity Row -->
              <div class="settings-profile-badge-row flex-center gap-3 mb-4">
                <div class="settings-profile-avatar">
                  ${avatarUrl
                    ? `<img src="${avatarUrl}" alt="${escapeHtml(fullName)}" class="user-avatar-img" referrerpolicy="no-referrer" onerror="this.onerror=null; this.parentElement.textContent='${initial}'" />`
                    : initial}
                </div>
                <div class="settings-profile-info">
                  <div class="font-bold text-base">${escapeHtml(fullName)}</div>
                  <div class="text-xs text-muted mb-1">${escapeHtml(this.user?.email || 'Guest Visitor')}</div>
                  <div>
                    ${
                      isGoogle
                        ? `<span class="badge badge-google text-xs inline-flex items-center gap-1">${icons.google(13)} Google Authentication Connected</span>`
                        : `<span class="badge badge-secondary text-xs inline-flex items-center gap-1">${icons.mail(13)} Email & Password Account</span>`
                    }
                  </div>
                </div>
              </div>

              <form id="profile-form" class="settings-form">
                <div class="form-group">
                  <label for="profile-email">Email Address</label>
                  <input type="email" id="profile-email" class="form-input" value="${escapeHtml(this.user?.email || '')}" disabled />
                  <p class="form-hint">${isGoogle ? 'Email is managed and verified securely via Google OAuth 2.0.' : 'Email is managed through Supabase Authentication.'}</p>
                </div>
                <div class="form-group">
                  <label for="profile-fullname">Full Name</label>
                  <input type="text" id="profile-fullname" class="form-input" value="${escapeHtml(this.profile?.full_name || '')}" placeholder="Your Name" />
                </div>
                <button type="submit" class="btn btn-primary btn-sm" id="btn-save-profile">
                  Save Profile Changes
                </button>
              </form>
            </div>

            <!-- Storage Quota Card -->
            <div class="section-card settings-card">
              <div class="section-card-header">
                <div>
                  <h3 class="section-title">Storage Allocation</h3>
                  <p class="section-subtitle">Real-time usage and capacity allocation</p>
                </div>
              </div>
              <div class="storage-breakdown">
                <div class="storage-metric-row">
                  <div>
                    <span class="storage-used-number">${formatBytes(used)}</span>
                    <span class="storage-total-number"> of ${formatBytes(quota)} used</span>
                  </div>
                  <span class="storage-percent-tag ${percent > 85 ? 'text-danger' : percent > 65 ? 'text-warning' : 'text-primary'}">${percent}%</span>
                </div>
                <div class="progress-bar-track progress-bar-lg">
                  <div class="progress-bar-fill ${percent > 85 ? 'bg-danger' : percent > 65 ? 'bg-warning' : 'bg-primary'}" style="width: ${percent}%;"></div>
                </div>
                <p class="storage-info-note">
                  ${icons.shield(14)} All uploaded files are encrypted and stored in a private, owner-isolated Supabase Storage bucket (<code>${APP_CONFIG.storageBucket}</code>).
                </p>
              </div>
            </div>

            <!-- Appearance Settings -->
            <div class="section-card settings-card">
              <div class="section-card-header">
                <div>
                  <h3 class="section-title">Appearance & Theme</h3>
                  <p class="section-subtitle">Customize your visual interface experience</p>
                </div>
              </div>
              <div class="theme-selection-row">
                <div>
                  <strong>Theme Mode</strong>
                  <p class="form-hint">Switch between light and dark visual aesthetics</p>
                </div>
                <button type="button" class="btn btn-outline" id="btn-toggle-theme-settings">
                  ${themeManager.isDark() ? icons.sun(16) : icons.moon(16)}
                  <span id="theme-btn-label">${themeManager.isDark() ? 'Switch to Light' : 'Switch to Dark'}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column: Developer Branding & System Info -->
          <div class="settings-side-col">
            <!-- Company Branding Card -->
            <div class="section-card brand-showcase-card">
              <div class="brand-showcase-header">
                <img src="/assets/altrivelle-logo.png" alt="ALTRIVELLE TECHNOLOGIES" class="brand-hero-logo" onerror="this.style.display='none'" />
                <h3 class="brand-company-name">ALTRIVELLE TECHNOLOGIES</h3>
                <span class="brand-tagline">Think Beyond. Build Forward.</span>
              </div>

              <div class="brand-showcase-body">
                <p class="brand-description">
                  Altrivelle Linker is architected and built by <strong>ALTRIVELLE TECHNOLOGIES</strong> as an enterprise-grade file hosting and secure sharing platform.
                </p>

                <div class="specs-list">
                  <div class="spec-item">
                    <span class="spec-label">Developer</span>
                    <span class="spec-value font-semibold">ALTRIVELLE TECHNOLOGIES</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Version</span>
                    <span class="spec-value">1.2.0 (Production)</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Security</span>
                    <span class="spec-value">RLS & Signed URLs</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Short Links</span>
                    <span class="spec-value">Serverless Vercel Routing</span>
                  </div>
                </div>

                <div class="brand-footer-credit">
                  &copy; 2026 Altrivelle Linker. All rights reserved. Developed by ALTRIVELLE TECHNOLOGIES.
                </div>
              </div>
            </div>

            <!-- Platform Architecture Card -->
            <div class="section-card tech-stack-card">
              <div class="section-card-header">
                <h4 class="section-title">Deployment & Infrastructure</h4>
              </div>
              <ul class="tech-stack-list">
                <li>
                  <span class="tech-bullet"></span>
                  <div>
                    <strong>Supabase Auth & PostgreSQL:</strong>
                    <span>Secure JWT sessions and database triggers.</span>
                  </div>
                </li>
                <li>
                  <span class="tech-bullet"></span>
                  <div>
                    <strong>Private Storage Bucket:</strong>
                    <span>Owner-scoped folder hierarchy with Row-Level Security.</span>
                  </div>
                </li>
                <li>
                  <span class="tech-bullet"></span>
                  <div>
                    <strong>Vercel Edge & Serverless:</strong>
                    <span>Cryptographic token evaluation and short link expiration.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents(container) {
    // Save profile
    const profileForm = container.querySelector('#profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = container.querySelector('#profile-fullname')?.value.trim();
        const submitBtn = container.querySelector('#btn-save-profile');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
          await authService.updateProfile({ full_name: fullName });
          toast.success('Profile updated successfully.');
        } catch (err) {
          toast.error(`Update failed: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Profile Changes';
        }
      });
    }

    // Toggle theme
    const themeBtn = container.querySelector('#btn-toggle-theme-settings');
    const themeLabel = container.querySelector('#theme-btn-label');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const newTheme = themeManager.toggle();
        themeLabel.textContent = newTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark';
        themeBtn.innerHTML = `
          ${newTheme === 'dark' ? icons.sun(16) : icons.moon(16)}
          <span>${newTheme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
        `;
        toast.info(`Theme changed to ${newTheme} mode`);
      });
    }
  },
};
