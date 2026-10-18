// ==============================================================================
// Altrivelle Linker — Developer Automation & Webhooks View
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { webhooksService, SUPPORTED_EVENTS } from '../services/webhooks.service.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { modal } from '../ui/modal.js';

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const automationView = {
  webhooks: [],

  async render(container) {
    container.innerHTML = `
      <div class="automation-page animate-fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Developer Automation & Webhooks</h1>
            <p class="view-subtitle">Programmatic sharing APIs, command-line interface, and real-time signed webhooks</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" id="btn-add-webhook">
              ${icons.sparkles(16)} Add Webhook
            </button>
          </div>
        </div>

        <div class="automation-grid">
          <!-- Left Column: Webhooks & Endpoints -->
          <div class="automation-main-col">
            <!-- Webhooks Card -->
            <div class="section-card">
              <div class="section-card-header">
                <div>
                  <h3 class="section-title">Active Webhooks</h3>
                  <p class="section-subtitle">HMAC-SHA256 signed event notifications delivered to your servers</p>
                </div>
              </div>

              <div id="webhooks-list-container">
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Loading webhooks...</p>
                </div>
              </div>
            </div>

            <!-- CLI Section -->
            <div class="section-card mt-4">
              <div class="section-card-header">
                <div>
                  <h3 class="section-title">Altrivelle Linker CLI</h3>
                  <p class="section-subtitle">Automate uploads, sharing, and link revocation from your terminal or CI/CD</p>
                </div>
                <span class="badge badge-success">CLI v1.2.0</span>
              </div>

              <div class="cli-code-block">
                <pre><code># 1. Install Altrivelle Linker CLI
npm install -g altrivelle-linker

# 2. Upload file with 7-day expiration and password
altrivelle upload ./release.zip --expire 7d --password secret123

# 3. List active files
altrivelle list

# 4. Revoke a short link
altrivelle revoke 3a8f12b4</code></pre>
              </div>
            </div>
          </div>

          <!-- Right Column: API Reference & Snippets -->
          <div class="automation-side-col">
            <div class="section-card">
              <div class="section-card-header">
                <h3 class="section-title">REST API Endpoints</h3>
              </div>
              <div class="api-endpoints-list">
                <div class="api-endpoint-item">
                  <span class="badge badge-success font-mono">POST</span>
                  <code class="endpoint-path">/api/v1/shares</code>
                  <p class="endpoint-desc">Create programmatic share link with custom expiration and password</p>
                </div>
                <div class="api-endpoint-item">
                  <span class="badge badge-project font-mono">GET</span>
                  <code class="endpoint-path">/api/v1/shares?token={token}</code>
                  <p class="endpoint-desc">Verify share link validity and fetch metadata</p>
                </div>
                <div class="api-endpoint-item">
                  <span class="badge badge-subtle font-mono">DELETE</span>
                  <code class="endpoint-path">/api/v1/shares?id={id}</code>
                  <p class="endpoint-desc">Instantly revoke link</p>
                </div>
                <div class="api-endpoint-item">
                  <span class="badge badge-project font-mono">GET</span>
                  <code class="endpoint-path">/api/health</code>
                  <p class="endpoint-desc">System health & ALTRIVELLE TECHNOLOGIES metadata</p>
                </div>
              </div>
            </div>

            <!-- Sample Curl -->
            <div class="section-card mt-4">
              <div class="section-card-header">
                <h4 class="section-title">cURL Example</h4>
              </div>
              <div class="cli-code-block">
                <pre><code>curl -X POST https://filelink.vercel.app/api/v1/shares \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_id": "file_uuid",
    "expires_in": "7d",
    "max_downloads": 5
  }'</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-add-webhook')?.addEventListener('click', () => {
      this.openAddWebhookModal(container);
    });

    await this.loadData(container);
  },

  async loadData(container) {
    try {
      this.webhooks = await webhooksService.getWebhooks();
      this.renderWebhooks(container);
    } catch (err) {
      console.error('Error loading webhooks:', err);
      toast.error('Could not load webhooks.');
    }
  },

  renderWebhooks(container) {
    const list = container.querySelector('#webhooks-list-container');
    if (!list) return;

    if (!this.webhooks.length) {
      list.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">${icons.sparkles(36)}</div>
          <h4>No Webhooks Configured</h4>
          <p>Register a webhook to receive real-time notifications for file uploads, downloads, or share expirations.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = this.webhooks
      .map(
        (wh) => `
        <div class="webhook-item-card">
          <div class="webhook-meta">
            <span class="webhook-url font-mono">${escapeHtml(wh.url)}</span>
            <div class="webhook-events-row mt-1">
              ${(wh.events || []).map((e) => `<span class="badge badge-subtle">${e}</span>`).join(' ')}
            </div>
            <span class="webhook-secret-hint font-mono text-muted text-xs">Secret: ${escapeHtml(wh.secret.slice(0, 10))}••••••••</span>
          </div>
          <div class="webhook-actions">
            <button type="button" class="btn btn-outline btn-sm btn-test-webhook" data-id="${wh.id}">
              ${icons.sparkles(12)} Test Ping
            </button>
            <button type="button" class="action-icon-btn text-danger btn-delete-webhook" data-id="${wh.id}">
              ${icons.trash(16)}
            </button>
          </div>
        </div>
      `
      )
      .join('');

    this.bindWebhookEvents(list, container);
  },

  bindWebhookEvents(list, container) {
    list.querySelectorAll('.btn-test-webhook').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const wh = this.webhooks.find((w) => w.id === btn.dataset.id);
        if (wh) {
          btn.disabled = true;
          btn.textContent = 'Pinging...';
          try {
            await webhooksService.testPingWebhook(wh);
            toast.success(`Test ping sent successfully to ${wh.url}`);
          } catch (err) {
            toast.error(`Ping failed: ${err.message}`);
          } finally {
            btn.disabled = false;
            btn.innerHTML = `${icons.sparkles(12)} Test Ping`;
          }
        }
      });
    });

    list.querySelectorAll('.btn-delete-webhook').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await webhooksService.deleteWebhook(btn.dataset.id);
          toast.success('Webhook deleted.');
          await this.loadData(container);
        } catch (err) {
          toast.error(`Could not delete webhook: ${err.message}`);
        }
      });
    });
  },

  openAddWebhookModal(container) {
    modal.open(`
      <div class="add-webhook-form">
        <div class="form-group">
          <label for="webhook-url-input">Endpoint URL (HTTPS)</label>
          <input type="url" id="webhook-url-input" class="form-input font-mono" placeholder="https://api.yourdomain.com/webhooks/altrivelle" required />
        </div>

        <div class="form-group">
          <label>Subscribed Events</label>
          <div class="checkbox-events-grid mt-2">
            ${SUPPORTED_EVENTS.map(
              (evt, i) => `
              <label class="checkbox-label">
                <input type="checkbox" value="${evt}" ${i < 3 ? 'checked' : ''} class="wh-event-checkbox" />
                <span>${evt}</span>
              </label>
            `
            ).join('')}
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn btn-secondary" id="btn-cancel-wh">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-submit-wh">Register Webhook</button>
        </div>
      </div>
    `, {
      title: 'Register Webhook Endpoint',
      maxWidth: 'max-w-md',
    });

    document.getElementById('btn-cancel-wh')?.addEventListener('click', () => modal.close());
    document.getElementById('btn-submit-wh')?.addEventListener('click', async () => {
      const url = document.getElementById('webhook-url-input')?.value.trim();
      const checkboxes = Array.from(document.querySelectorAll('.wh-event-checkbox:checked'));
      const events = checkboxes.map((c) => c.value);

      if (!url || !url.startsWith('https://')) {
        toast.warning('Please enter a valid HTTPS URL');
        return;
      }

      try {
        await webhooksService.registerWebhook(url, events);
        toast.success('Webhook registered successfully!');
        modal.close();
        await this.loadData(container);
      } catch (err) {
        toast.error(`Registration failed: ${err.message}`);
      }
    });
  },
};
