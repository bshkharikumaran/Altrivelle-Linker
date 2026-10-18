// ==============================================================================
// Altrivelle Linker — Admin Dashboard View
// Developed by ALTRIVELLE TECHNOLOGIES
// Designated Administrator: sriharibshk@gmail.com
// "One Link. Smarter Sharing."
// ==============================================================================

import { adminService, ADMIN_EMAIL } from '../services/admin.service.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { modal } from '../ui/modal.js';

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(isoStr) {
  if (!isoStr) return 'Never';
  const date = new Date(isoStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export const adminView = {
  currentTab: 'overview', // 'overview', 'users', 'shares', 'logs'
  metrics: null,
  users: [],
  shares: [],
  logs: [],

  async render(container) {
    const isAdmin = await adminService.isCurrentUserAdmin();
    if (!isAdmin) {
      container.innerHTML = `
        <div class="empty-state-card glass-panel text-center py-12">
          <div class="text-danger mb-4">${icons.shieldAlert(48)}</div>
          <h2>Administrative Access Restricted</h2>
          <p class="text-muted max-w-md mx-auto mt-2">
            This console is strictly designated for <strong>${ADMIN_EMAIL}</strong>. If you are the platform owner, please sign in with your primary administrative credentials.
          </p>
          <a href="#dashboard" class="btn btn-primary mt-6">Return to Dashboard</a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-dashboard-container animate-fade-in">
        <!-- Admin Header -->
        <div class="view-header-row mb-6">
          <div class="view-title-col">
            <div class="admin-badge-row">
              <span class="badge badge-admin-pill">
                ${icons.shield(14)} Platform Superadmin
              </span>
              <span class="admin-email-tag">${ADMIN_EMAIL}</span>
            </div>
            <h1 class="view-title mt-1">Administrator Governance Console</h1>
            <p class="view-subtitle">System metrics, user storage quotas, link moderation, and security auditing</p>
          </div>
          <div class="view-actions-col">
            <button type="button" class="btn btn-outline btn-sm" id="btn-refresh-admin">
              ${icons.refresh(16)} Refresh Metrics
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="admin-tabs-nav mb-6">
          <button type="button" class="admin-tab-btn ${this.currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
            ${icons.dashboard(16)} Overview
          </button>
          <button type="button" class="admin-tab-btn ${this.currentTab === 'users' ? 'active' : ''}" data-tab="users">
            ${icons.users(16)} User Management
          </button>
          <button type="button" class="admin-tab-btn ${this.currentTab === 'shares' ? 'active' : ''}" data-tab="shares">
            ${icons.share(16)} File & Link Moderation
          </button>
          <button type="button" class="admin-tab-btn ${this.currentTab === 'logs' ? 'active' : ''}" data-tab="logs">
            ${icons.shield(16)} Security & Audit Trail
          </button>
        </div>

        <!-- Tab Content Area -->
        <div id="admin-tab-content" class="admin-tab-body">
          <div class="loading-state py-8">
            <div class="spinner"></div>
            <p>Gathering platform telemetry...</p>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
    await this.loadTab(this.currentTab);
  },

  bindEvents(container) {
    // Refresh button
    container.querySelector('#btn-refresh-admin')?.addEventListener('click', async () => {
      toast.info('Refreshing administrator metrics...');
      await this.loadTab(this.currentTab, true);
    });

    // Tab buttons
    container.querySelectorAll('.admin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        container.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        await this.loadTab(this.currentTab);
      });
    });
  },

  async loadTab(tabName, forceRefresh = false) {
    const tabBody = document.getElementById('admin-tab-content');
    if (!tabBody) return;

    try {
      if (tabName === 'overview') {
        if (!this.metrics || forceRefresh) {
          this.metrics = await adminService.getOverviewMetrics();
        }
        this.renderOverviewTab(tabBody, this.metrics);
      } else if (tabName === 'users') {
        if (!this.users.length || forceRefresh) {
          this.users = await adminService.getUsersList();
        }
        this.renderUsersTab(tabBody, this.users);
      } else if (tabName === 'shares') {
        if (!this.shares.length || forceRefresh) {
          this.shares = await adminService.getAllShares();
        }
        this.renderSharesTab(tabBody, this.shares);
      } else if (tabName === 'logs') {
        if (!this.logs.length || forceRefresh) {
          this.logs = await adminService.getAuditLogs();
        }
        this.renderLogsTab(tabBody, this.logs);
      }
    } catch (err) {
      console.error('Error rendering admin tab:', err);
      tabBody.innerHTML = `
        <div class="error-banner glass-panel">
          <p class="text-danger font-semibold">Error loading ${tabName}: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  },

  renderOverviewTab(tabBody, m) {
    tabBody.innerHTML = `
      <!-- Metric Cards Grid -->
      <div class="admin-metrics-grid mb-8">
        <div class="metric-card glass-panel animate-scale-up">
          <div class="metric-icon-box bg-blue-subtle text-primary">
            ${icons.users(24)}
          </div>
          <div class="metric-data-col">
            <span class="metric-label">Registered Accounts</span>
            <span class="metric-value">${m.totalUsers}</span>
            <span class="metric-subtext">Supabase Auth Profiles</span>
          </div>
        </div>

        <div class="metric-card glass-panel animate-scale-up" style="animation-delay: 50ms;">
          <div class="metric-icon-box bg-purple-subtle text-purple">
            ${icons.hardDrive(24)}
          </div>
          <div class="metric-data-col">
            <span class="metric-label">Storage Allocated</span>
            <span class="metric-value">${formatBytes(m.totalStorageUsed)}</span>
            <span class="metric-subtext">of ${formatBytes(m.totalStorageAllocated)} allocated (${m.storagePercent}%)</span>
          </div>
        </div>

        <div class="metric-card glass-panel animate-scale-up" style="animation-delay: 100ms;">
          <div class="metric-icon-box bg-green-subtle text-success">
            ${icons.share(24)}
          </div>
          <div class="metric-data-col">
            <span class="metric-label">Active Share Links</span>
            <span class="metric-value">${m.activeShares}</span>
            <span class="metric-subtext">${m.expiredShares} expired &bull; ${m.revokedShares} revoked</span>
          </div>
        </div>

        <div class="metric-card glass-panel animate-scale-up" style="animation-delay: 150ms;">
          <div class="metric-icon-box bg-cyan-subtle text-cyan">
            ${icons.folder(24)}
          </div>
          <div class="metric-data-col">
            <span class="metric-label">Total Files Hosted</span>
            <span class="metric-value">${m.totalFiles}</span>
            <span class="metric-subtext">${m.totalRequests} DropBox file requests</span>
          </div>
        </div>
      </div>

      <!-- System Health & Status Banner -->
      <div class="admin-status-panel glass-panel mb-8">
        <div class="panel-header-row">
          <div class="header-with-indicator">
            <span class="status-pulse-dot"></span>
            <h3>Platform Infrastructure Health</h3>
          </div>
          <span class="badge badge-success">Operational</span>
        </div>
        <div class="health-breakdown-grid mt-4">
          <div class="health-item">
            <span class="health-label">Storage Bucket:</span>
            <span class="health-val font-mono">filelink-files (Private Encrypted)</span>
          </div>
          <div class="health-item">
            <span class="health-label">Database Engine:</span>
            <span class="health-val font-mono">PostgreSQL 15+ (RLS Enforced)</span>
          </div>
          <div class="health-item">
            <span class="health-label">Transfer Engine:</span>
            <span class="health-val">Adaptive Transfer (Cloud, Ephemeral, P2P)</span>
          </div>
          <div class="health-item">
            <span class="health-label">Developer Credit:</span>
            <span class="health-val font-bold">ALTRIVELLE TECHNOLOGIES</span>
          </div>
        </div>
      </div>
    `;
  },

  renderUsersTab(tabBody, users) {
    if (!users.length) {
      tabBody.innerHTML = `
        <div class="empty-state-card glass-panel text-center py-8">
          <p>No user profiles discovered in database.</p>
        </div>
      `;
      return;
    }

    tabBody.innerHTML = `
      <div class="glass-panel table-container">
        <div class="table-header-bar">
          <h3>Platform User Accounts (${users.length})</h3>
          <span class="text-muted text-sm">Manage user quotas, roles, and plan allocations</span>
        </div>

        <table class="admin-data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Plan Tier</th>
              <th>Storage Used / Quota</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map((u) => {
                const used = parseInt(u.storage_used || 0, 10);
                const quota = parseInt(u.storage_quota || 104857600, 10);
                const percent = Math.min(100, Math.round((used / quota) * 100));
                const isAdmin = u.email === ADMIN_EMAIL || u.role === 'admin';

                return `
                <tr data-user-id="${u.id}">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar-small">${(u.full_name || u.email || 'U').charAt(0).toUpperCase()}</div>
                      <div class="user-info">
                        <span class="user-name">${escapeHtml(u.full_name || 'User')}</span>
                        <span class="user-email">${escapeHtml(u.email || 'No email')}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${isAdmin ? 'badge-admin' : 'badge-user'}">
                      ${isAdmin ? 'Administrator' : 'User'}
                    </span>
                  </td>
                  <td>
                    <span class="badge badge-plan">${escapeHtml((u.plan_tier || 'community').toUpperCase())}</span>
                  </td>
                  <td>
                    <div class="quota-progress-cell">
                      <div class="progress-bar-track small">
                        <div class="progress-bar-fill bg-primary" style="width: ${percent}%;"></div>
                      </div>
                      <span class="quota-text">${formatBytes(used)} / ${formatBytes(quota)} (${percent}%)</span>
                    </div>
                  </td>
                  <td>
                    <span class="date-text">${formatDate(u.created_at)}</span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-outline btn-xs btn-edit-quota" data-user-id="${u.id}" data-current-quota="${quota}">
                      Adjust Quota
                    </button>
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind Quota Adjustments
    tabBody.querySelectorAll('.btn-edit-quota').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        const currentQuota = parseInt(btn.dataset.currentQuota, 10);

        const newQuotaMb = prompt(
          `Enter new storage quota for user in Megabytes (MB):\n(Current: ${Math.round(currentQuota / (1024 * 1024))} MB)`,
          Math.round(currentQuota / (1024 * 1024))
        );

        if (newQuotaMb && !isNaN(newQuotaMb) && Number(newQuotaMb) > 0) {
          const newBytes = parseInt(newQuotaMb, 10) * 1024 * 1024;
          try {
            await adminService.updateUserQuota(userId, newBytes);
            toast.success('User storage quota updated successfully');
            await this.loadTab('users', true);
          } catch (err) {
            toast.error(`Failed to update quota: ${err.message}`);
          }
        }
      });
    });
  },

  renderSharesTab(tabBody, shares) {
    if (!shares.length) {
      tabBody.innerHTML = `
        <div class="empty-state-card glass-panel text-center py-8">
          <p>No share links currently active on the platform.</p>
        </div>
      `;
      return;
    }

    tabBody.innerHTML = `
      <div class="glass-panel table-container">
        <div class="table-header-bar">
          <h3>File Share Links & Moderation (${shares.length})</h3>
          <span class="text-muted text-sm">Review public share links and revoke abusive content immediately</span>
        </div>

        <table class="admin-data-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Token</th>
              <th>Downloads</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${shares
              .map((s) => {
                const fileName = s.files?.name || 'Unknown File';
                const isRevoked = s.is_revoked;
                const isExpired = s.isExpired;

                return `
                <tr data-share-id="${s.id}">
                  <td>
                    <div class="file-cell font-semibold">
                      ${icons.file(16)}
                      <span title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
                    </div>
                  </td>
                  <td>
                    <a href="/share.html?token=${s.token}" target="_blank" class="token-link font-mono text-primary">
                      ${s.token} ${icons.externalLink(12)}
                    </a>
                  </td>
                  <td>
                    <span>${s.download_count || 0}${s.max_downloads ? ` / ${s.max_downloads}` : ''}</span>
                  </td>
                  <td>
                    <span class="badge ${isRevoked ? 'badge-danger' : isExpired ? 'badge-warning' : 'badge-success'}">
                      ${isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <span class="date-text">${formatDate(s.expires_at)}</span>
                  </td>
                  <td>
                    ${
                      !isRevoked
                        ? `<button type="button" class="btn btn-danger btn-xs btn-revoke-share" data-share-id="${s.id}">
                            Revoke Link
                          </button>`
                        : '<span class="text-muted text-xs">Revoked</span>'
                    }
                  </td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind Revoke actions
    tabBody.querySelectorAll('.btn-revoke-share').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const shareId = btn.dataset.shareId;
        if (confirm('Are you sure you want to revoke this public share link immediately?')) {
          try {
            await adminService.revokeShare(shareId);
            toast.success('Share link revoked.');
            await this.loadTab('shares', true);
          } catch (err) {
            toast.error(`Could not revoke link: ${err.message}`);
          }
        }
      });
    });
  },

  renderLogsTab(tabBody, logs) {
    tabBody.innerHTML = `
      <div class="glass-panel table-container">
        <div class="table-header-bar">
          <h3>Security & Infrastructure Audit Trail</h3>
          <span class="text-muted text-sm">Cryptographic verification logs and administrative governance events</span>
        </div>

        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                (log) => `
              <tr>
                <td><span class="font-mono text-xs text-muted">${formatDate(log.timestamp)}</span></td>
                <td><span class="badge badge-outline font-mono text-xs">${escapeHtml(log.action)}</span></td>
                <td><span class="text-sm font-semibold">${escapeHtml(log.actor)}</span></td>
                <td><span class="text-sm">${escapeHtml(log.target)}</span></td>
                <td><span class="badge badge-success text-xs">${escapeHtml(log.status)}</span></td>
                <td><span class="text-xs text-muted">${escapeHtml(log.details)}</span></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  },
};
