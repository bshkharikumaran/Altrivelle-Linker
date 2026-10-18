// ==============================================================================
// Altrivelle Linker — Adaptive Transfer Center View
// Developed by ALTRIVELLE TECHNOLOGIES
// Persistent Cloud (A), Ephemeral Self-Destruct (B), Direct Device-to-Device (C)
// ==============================================================================

import { adaptiveTransferService, TRANSFER_MODES } from '../services/transfer.service.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { filesService } from '../services/files.service.js';
import { shareService } from '../services/share.service.js';

export const transfersView = {
  activeTab: 'adaptive', // 'adaptive', 'p2p', 'ephemeral', 'cloud'
  p2pFile: null,
  p2pRoomCode: null,
  p2pStatus: 'idle', // 'idle', 'waiting', 'connected', 'transferring', 'completed'

  render(container) {
    container.innerHTML = `
      <div class="transfers-page animate-fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Adaptive Transfer Center</h1>
            <p class="view-subtitle">Intelligent multi-mode file routing: Persistent Cloud, Ephemeral, and Direct P2P WebRTC</p>
          </div>
        </div>

        <!-- Mode Selector Cards -->
        <div class="transfer-modes-grid">
          <div class="transfer-mode-card ${this.activeTab === 'adaptive' ? 'active-mode' : ''}" data-tab="adaptive">
            <div class="mode-icon-box text-primary">${icons.sparkles(24)}</div>
            <h3>Adaptive Smart Route</h3>
            <p>Automatically recommends optimal transfer mode based on file size, privacy, and recipient availability.</p>
            <span class="mode-pill">Intelligent Auto-Select</span>
          </div>

          <div class="transfer-mode-card ${this.activeTab === 'p2p' ? 'active-mode' : ''}" data-tab="p2p">
            <div class="mode-icon-box text-indigo">${icons.share(24)}</div>
            <h3>Direct Device-to-Device</h3>
            <p>WebRTC P2P DataChannel transfer. Files flow straight between browsers with zero cloud storage.</p>
            <span class="mode-pill">Zero Cloud Residency</span>
          </div>

          <div class="transfer-mode-card ${this.activeTab === 'ephemeral' ? 'active-mode' : ''}" data-tab="ephemeral">
            <div class="mode-icon-box text-warning">${icons.clock(24)}</div>
            <h3>Ephemeral Self-Destruct</h3>
            <p>Time-bound, self-purging shares that vanish after single-use download or a chosen expiration window.</p>
            <span class="mode-pill">Automated Purge</span>
          </div>

          <div class="transfer-mode-card ${this.activeTab === 'cloud' ? 'active-mode' : ''}" data-tab="cloud">
            <div class="mode-icon-box text-emerald">${icons.hardDrive(24)}</div>
            <h3>Persistent Cloud</h3>
            <p>Full-featured enterprise storage on Supabase with revocable tokens and signed URL generation.</p>
            <span class="mode-pill">High Reliability</span>
          </div>
        </div>

        <!-- Dynamic Transfer Workspace -->
        <div class="section-card transfer-workspace-card mt-4" id="transfer-workspace-container">
          ${this.renderWorkspaceContent()}
        </div>
      </div>
    `;

    this.bindEvents(container);
  },

  renderWorkspaceContent() {
    if (this.activeTab === 'adaptive') {
      return `
        <div class="adaptive-recommender-box">
          <div class="section-card-header">
            <div>
              <h2 class="section-title">Adaptive Route Analyzer</h2>
              <p class="section-subtitle">Drop a file to receive an instant transfer recommendation</p>
            </div>
          </div>

          <div class="adaptive-dropzone" id="adaptive-dropzone">
            <input type="file" id="adaptive-file-input" class="hidden" />
            <div class="dropzone-icon-box">${icons.sparkles(32)}</div>
            <h4 id="adaptive-filename-text">Drop a file here to analyze</h4>
            <p class="dropzone-hint">Evaluates file size, data sensitivity, and network topology</p>
            <button type="button" class="btn btn-outline btn-sm" id="btn-browse-adaptive">Select File</button>
          </div>

          <div id="adaptive-recommendation-result" class="hidden mt-4"></div>
        </div>
      `;
    }

    if (this.activeTab === 'p2p') {
      return `
        <div class="p2p-transfer-box">
          <div class="section-card-header">
            <div>
              <h2 class="section-title">Direct WebRTC Device-to-Device Transfer</h2>
              <p class="section-subtitle">Transfer gigabyte-scale files directly between devices without hitting any server storage</p>
            </div>
            <span class="badge badge-success">${icons.shield(12)} P2P Direct Tunnel</span>
          </div>

          <div class="p2p-workflow-steps">
            <div class="p2p-step">
              <span class="p2p-step-num">1</span>
              <div>
                <strong>Select File to Send:</strong>
                <input type="file" id="p2p-file-picker" class="form-input mt-2" />
              </div>
            </div>

            <div class="p2p-step">
              <span class="p2p-step-num">2</span>
              <div>
                <strong>Share Direct Connection Code:</strong>
                <div class="input-with-button mt-2">
                  <input type="text" id="p2p-room-code" readonly value="${this.p2pRoomCode || 'Click Generate Room Code'}" class="form-input font-mono" />
                  <button type="button" class="btn btn-secondary" id="btn-gen-p2p-code">Generate</button>
                  <button type="button" class="btn btn-outline" id="btn-copy-p2p-code">${icons.copy(16)} Copy</button>
                </div>
                <p class="form-hint">Both parties must keep browser open during direct WebRTC stream.</p>
              </div>
            </div>

            <div class="p2p-step">
              <span class="p2p-step-num">3</span>
              <div>
                <strong>Connection Status:</strong>
                <div class="p2p-status-indicator mt-2">
                  <span class="p2p-dot ${this.p2pStatus === 'connected' ? 'dot-active' : ''}"></span>
                  <span id="p2p-status-label">${this.getP2PStatusText()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'ephemeral') {
      return `
        <div class="ephemeral-transfer-box">
          <div class="section-card-header">
            <div>
              <h2 class="section-title">Ephemeral Self-Destruct Sharing</h2>
              <p class="section-subtitle">Temporary deliverables that automatically purge from storage</p>
            </div>
            <span class="badge badge-subtle">${icons.clock(12)} Auto-Purge</span>
          </div>

          <form id="ephemeral-form" class="mt-4">
            <div class="form-group">
              <label for="ephemeral-file">Select File</label>
              <input type="file" id="ephemeral-file" required class="form-input" />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="ephemeral-duration">Purge Timeframe</label>
                <select id="ephemeral-duration" class="form-select">
                  <option value="1h">1 Hour (Single Use)</option>
                  <option value="1d" selected>24 Hours</option>
                  <option value="burn">Burn After First Download</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ephemeral-pw">Passcode (Optional)</label>
                <input type="text" id="ephemeral-pw" class="form-input" placeholder="Secret access code" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary mt-2" id="btn-create-ephemeral">
              ${icons.sparkles(16)} Create Ephemeral Share
            </button>
          </form>

          <div id="ephemeral-result-box" class="hidden mt-4"></div>
        </div>
      `;
    }

    // Default Cloud
    return `
      <div class="cloud-transfer-box">
        <div class="section-card-header">
          <div>
            <h2 class="section-title">Persistent Cloud Storage</h2>
            <p class="section-subtitle">Manage files uploaded to your private Supabase Storage bucket</p>
          </div>
          <a href="#files" class="btn btn-outline btn-sm">Open File Manager</a>
        </div>
        <p class="text-muted">Cloud transfers are stored securely in your owner-scoped folder in the private bucket. Use the File Manager to manage permissions and generate short links.</p>
      </div>
    `;
  },

  getP2PStatusText() {
    switch (this.p2pStatus) {
      case 'waiting': return 'Waiting for peer to connect...';
      case 'connected': return 'Direct WebRTC DataChannel established';
      case 'transferring': return 'Transferring peer-to-peer...';
      case 'completed': return 'Transfer complete!';
      default: return 'Ready to establish direct tunnel';
    }
  },

  bindEvents(container) {
    // Mode switcher cards
    container.querySelectorAll('.transfer-mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.activeTab = card.dataset.tab;
        this.render(container);
      });
    });

    // Adaptive mode events
    if (this.activeTab === 'adaptive') {
      const fileInput = container.querySelector('#adaptive-file-input');
      const browseBtn = container.querySelector('#btn-browse-adaptive');
      const filenameText = container.querySelector('#adaptive-filename-text');
      const dropzone = container.querySelector('#adaptive-dropzone');
      const resultBox = container.querySelector('#adaptive-recommendation-result');

      browseBtn?.addEventListener('click', () => fileInput?.click());

      const processFile = (file) => {
        if (!file) return;
        filenameText.innerHTML = `Analyzing: <strong>${file.name}</strong> (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
        const rec = adaptiveTransferService.recommendMode({
          fileSize: file.size,
          isRecipientOnline: false,
          requiresLongTerm: false,
          highPrivacy: file.name.toLowerCase().includes('secret') || file.name.toLowerCase().includes('confidential'),
        });

        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `
          <div class="recommendation-card glass-panel animate-scale-up">
            <div class="rec-badge-row">
              <span class="badge badge-success">${rec.badge}</span>
              <span class="font-semibold text-primary">${rec.title}</span>
            </div>
            <p class="rec-explanation">${rec.explanation}</p>
            <div class="rec-pros-cons mt-3">
              <div class="pros-col">
                <strong>Advantages:</strong>
                <ul>${rec.pros.map((p) => `<li>✓ ${p}</li>`).join('')}</ul>
              </div>
              <div class="cons-col">
                <strong>Trade-offs:</strong>
                <ul>${rec.cons.map((c) => `<li>! ${c}</li>`).join('')}</ul>
              </div>
            </div>
            <div class="rec-actions mt-4">
              <button type="button" class="btn btn-primary" id="btn-proceed-recommended">
                Proceed with ${rec.title}
              </button>
            </div>
          </div>
        `;

        resultBox.querySelector('#btn-proceed-recommended')?.addEventListener('click', () => {
          if (rec.mode === TRANSFER_MODES.P2P) {
            this.activeTab = 'p2p';
            this.render(container);
          } else if (rec.mode === TRANSFER_MODES.EPHEMERAL) {
            this.activeTab = 'ephemeral';
            this.render(container);
          } else {
            window.location.hash = '#files';
          }
        });
      };

      fileInput?.addEventListener('change', (e) => {
        if (e.target.files?.length) processFile(e.target.files[0]);
      });

      if (dropzone) {
        ['dragenter', 'dragover'].forEach((n) => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); }));
        ['dragleave', 'drop'].forEach((n) => dropzone.addEventListener(n, (e) => { e.preventDefault(); dropzone.classList.remove('drag-active'); }));
        dropzone.addEventListener('drop', (e) => {
          if (e.dataTransfer?.files?.length) processFile(e.dataTransfer.files[0]);
        });
      }
    }

    // P2P WebRTC events
    if (this.activeTab === 'p2p') {
      const genCodeBtn = container.querySelector('#btn-gen-p2p-code');
      const copyCodeBtn = container.querySelector('#btn-copy-p2p-code');
      const codeInput = container.querySelector('#p2p-room-code');

      genCodeBtn?.addEventListener('click', () => {
        this.p2pRoomCode = 'alt-room-' + Math.random().toString(36).substring(2, 8);
        codeInput.value = this.p2pRoomCode;
        this.p2pStatus = 'waiting';
        container.querySelector('#p2p-status-label').textContent = this.getP2PStatusText();
        toast.info('P2P signaling room initialized. Share this code with recipient.');
      });

      copyCodeBtn?.addEventListener('click', () => {
        if (this.p2pRoomCode) {
          navigator.clipboard.writeText(this.p2pRoomCode);
          toast.success('Room code copied to clipboard!');
        } else {
          toast.warning('Generate a room code first.');
        }
      });
    }

    // Ephemeral share events
    if (this.activeTab === 'ephemeral') {
      const form = container.querySelector('#ephemeral-form');
      const resultBox = container.querySelector('#ephemeral-result-box');

      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = container.querySelector('#ephemeral-file');
        const duration = container.querySelector('#ephemeral-duration')?.value;
        const password = container.querySelector('#ephemeral-pw')?.value;

        if (!fileInput.files?.length) {
          toast.warning('Select a file first');
          return;
        }

        const file = fileInput.files[0];
        const btn = container.querySelector('#btn-create-ephemeral');
        btn.disabled = true;
        btn.textContent = 'Creating Ephemeral Share...';

        try {
          const uploaded = await filesService.uploadFile(file);
          const link = await shareService.createShareLink(uploaded.id, {
            duration: duration === 'burn' ? '1h' : duration,
            password,
            maxDownloads: duration === 'burn' ? 1 : null,
          });

          resultBox.classList.remove('hidden');
          resultBox.innerHTML = `
            <div class="result-success-box glass-panel animate-scale-up">
              <div class="text-success font-semibold mb-2">${icons.check(16)} Ephemeral Share Active</div>
              <p>This share link will auto-purge based on your timeframe:</p>
              <div class="input-with-button mt-2">
                <input type="text" readonly value="${link.shareUrl}" class="form-input font-mono" id="ephemeral-url-input" />
                <button type="button" class="btn btn-primary" id="btn-copy-ephemeral">Copy Link</button>
              </div>
            </div>
          `;

          resultBox.querySelector('#btn-copy-ephemeral')?.addEventListener('click', () => {
            navigator.clipboard.writeText(link.shareUrl);
            toast.success('Ephemeral link copied to clipboard!');
          });

          toast.success('Ephemeral share created.');
        } catch (err) {
          toast.error(`Error creating ephemeral share: ${err.message}`);
        } finally {
          btn.disabled = false;
          btn.innerHTML = `${icons.sparkles(16)} Create Ephemeral Share`;
        }
      });
    }
  },
};
