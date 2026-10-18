// ==============================================================================
// Altrivelle Linker — Adaptive Transfer Center View
// Developed by ALTRIVELLE TECHNOLOGIES
// Persistent Cloud (A), Ephemeral Self-Destruct (B), Direct Device-to-Device (C)
// ==============================================================================

import { adaptiveTransferService, p2pTransferService, TRANSFER_MODES } from '../services/transfer.service.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { filesService } from '../services/files.service.js';
import { shareService } from '../services/share.service.js';
import { qrModal } from '../ui/qrModal.js';

function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const transfersView = {
  activeTab: 'adaptive', // 'adaptive', 'p2p', 'ephemeral', 'cloud'
  p2pRole: 'send',       // 'send' (Host) or 'receive' (Client)
  p2pFile: null,
  p2pRoomCode: null,
  p2pStatus: 'idle',     // 'idle', 'waiting', 'connecting', 'connected', 'transferring', 'completed'
  p2pStatusMessage: 'Ready to establish direct tunnel',
  p2pProgress: null,
  receivedFileResult: null,

  render(container) {
    // Check URL parameters (e.g. #transfers?role=receive&room=ALT-8492)
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const queryStr = hash.split('?')[1];
      const params = new URLSearchParams(queryStr);
      const urlRole = params.get('role');
      const urlRoom = params.get('room');
      if (urlRoom) {
        this.activeTab = 'p2p';
        this.p2pRole = 'receive';
        this.p2pRoomCode = urlRoom.toUpperCase();
      } else if (urlRole) {
        this.activeTab = 'p2p';
        this.p2pRole = urlRole;
      }
    }

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
              <p class="section-subtitle">Transfer gigabyte-scale files directly between two devices without hitting any server storage</p>
            </div>
            <span class="badge badge-success">${icons.shield(12)} Zero Cloud Residency</span>
          </div>

          <!-- P2P Role Switcher Tabs -->
          <div class="p2p-role-switcher mt-3">
            <button type="button" class="p2p-tab-btn ${this.p2pRole === 'send' ? 'active' : ''}" id="btn-p2p-role-send">
              ${icons.uploadCloud(16)} Send Files (Host Room)
            </button>
            <button type="button" class="p2p-tab-btn ${this.p2pRole === 'receive' ? 'active' : ''}" id="btn-p2p-role-receive">
              ${icons.download(16)} Receive Files (Enter Code)
            </button>
          </div>

          ${this.p2pRole === 'send' ? this.renderP2PSenderUI() : this.renderP2PReceiverUI()}
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
            <span class="badge badge-warning">${icons.clock(12)} Auto-Purge Armed</span>
          </div>

          <form id="ephemeral-form" class="mt-4">
            <div class="form-group">
              <label for="ephemeral-file">Select File to Share Ephemerally</label>
              <input type="file" id="ephemeral-file" required class="form-input" />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label for="ephemeral-duration">Purge Timeframe</label>
                <select id="ephemeral-duration" class="form-select">
                  <option value="burn" selected>🔥 Burn After Single Download (Self-Destruct)</option>
                  <option value="1h">1 Hour (Single Session)</option>
                  <option value="1d">24 Hours</option>
                  <option value="7d">7 Days</option>
                </select>
                <small class="form-hint">Files set to "Burn After Single Download" are permanently deleted the moment the recipient downloads them.</small>
              </div>
              <div class="form-group">
                <label for="ephemeral-pw">Passcode / Secret Key (Recommended)</label>
                <input type="text" id="ephemeral-pw" class="form-input" placeholder="e.g. SecretKey#99" />
                <small class="form-hint">Recipient will be blocked until the exact passcode is entered.</small>
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

  renderP2PSenderUI() {
    return `
      <div class="p2p-subview-panel mt-4 animate-fade-in">
        <div class="p2p-workflow-steps">
          <div class="p2p-step">
            <span class="p2p-step-num">1</span>
            <div>
              <strong>Select File to Send:</strong>
              <input type="file" id="p2p-file-picker" class="form-input mt-2" />
              <div id="p2p-selected-file-info" class="text-xs text-muted mt-1">
                ${this.p2pFile ? `Selected: <strong>${this.p2pFile.name}</strong> (${formatBytes(this.p2pFile.size)})` : 'No file chosen yet'}
              </div>
            </div>
          </div>

          <div class="p2p-step">
            <span class="p2p-step-num">2</span>
            <div>
              <strong>Your Direct Connection Room Code:</strong>
              <div class="p2p-code-display-box mt-2">
                <div class="p2p-code-chip font-mono text-xl" id="p2p-room-code-label">
                  ${this.p2pRoomCode || 'Click Generate Room Code'}
                </div>
                <div class="p2p-actions-row flex-center gap-2 flex-wrap">
                  <button type="button" class="btn btn-primary btn-sm" id="btn-gen-p2p-code">
                    ${icons.refresh(14)} Generate Code
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" id="btn-copy-p2p-code">
                    ${icons.copy(14)} Copy Code
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" id="btn-copy-p2p-link">
                    ${icons.link(14)} Copy Join Link
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" id="btn-show-p2p-qr">
                    ${icons.qr(14)} QR Code
                  </button>
                </div>
              </div>
              <p class="form-hint mt-2">
                Share this 6-character room code with your recipient. Both devices must keep their browser open during the direct transfer.
              </p>
            </div>
          </div>

          <div class="p2p-step">
            <span class="p2p-step-num">3</span>
            <div>
              <strong>Direct Connection & Transfer Status:</strong>
              <div class="p2p-status-indicator mt-2">
                <span class="status-pulse-dot ${this.p2pStatus === 'connected' || this.p2pStatus === 'transferring' ? 'dot-active' : ''}"></span>
                <span id="p2p-status-label" class="font-semibold">${this.p2pStatusMessage}</span>
              </div>

              <!-- Live Progress Bar -->
              <div id="p2p-progress-container" class="${this.p2pStatus === 'transferring' ? '' : 'hidden'} mt-3">
                <div class="progress-meta-row flex-between text-xs text-muted mb-1">
                  <span id="p2p-progress-percent">0%</span>
                  <span id="p2p-progress-speed">0 MB/s</span>
                </div>
                <div class="progress-bar-track progress-bar-lg">
                  <div class="progress-bar-fill bg-primary" id="p2p-progress-bar" style="width: 0%;"></div>
                </div>
                <div class="text-xs text-muted mt-1" id="p2p-progress-bytes">0 MB / 0 MB</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderP2PReceiverUI() {
    return `
      <div class="p2p-subview-panel mt-4 animate-fade-in">
        <div class="p2p-receiver-box glass-panel p-4 text-center mx-auto" style="max-width: 580px;">
          <div class="receiver-icon-badge mx-auto mb-3">
            ${icons.download(32)}
          </div>
          <h3 class="text-xl font-bold">Receive Files Directly</h3>
          <p class="text-muted text-sm mt-1">
            Enter the 6-character room code provided by the sender to establish a direct WebRTC tunnel and download the file.
          </p>

          <form id="p2p-join-form" class="mt-4">
            <div class="form-group text-left">
              <label for="p2p-input-room-code" class="text-xs uppercase font-bold tracking-wider text-muted">
                Direct Room Code (e.g. ALT-8492)
              </label>
              <div class="input-with-button mt-1">
                <input
                  type="text"
                  id="p2p-input-room-code"
                  class="form-input font-mono text-center text-lg font-bold uppercase tracking-widest"
                  placeholder="ALT-XXXX"
                  maxlength="8"
                  value="${this.p2pRoomCode || ''}"
                  required
                />
                <button type="submit" class="btn btn-primary btn-lg" id="btn-p2p-connect">
                  ${icons.sparkles(18)} Connect & Receive
                </button>
              </div>
            </div>
          </form>

          <!-- Receiver Status & Live Transfer Progress -->
          <div id="p2p-receiver-status-box" class="mt-4 ${this.p2pStatus === 'idle' ? 'hidden' : ''}">
            <div class="p2p-status-indicator justify-center">
              <span class="status-pulse-dot ${this.p2pStatus === 'connected' || this.p2pStatus === 'transferring' ? 'dot-active' : ''}"></span>
              <span id="p2p-receiver-status-label" class="font-semibold">${this.p2pStatusMessage}</span>
            </div>

            <div id="p2p-receiver-progress-container" class="${this.p2pStatus === 'transferring' ? '' : 'hidden'} mt-3 text-left">
              <div class="progress-meta-row flex-between text-xs text-muted mb-1">
                <span id="p2p-rx-filename" class="font-semibold text-main">Receiving file...</span>
                <span id="p2p-rx-percent">0%</span>
              </div>
              <div class="progress-bar-track progress-bar-lg">
                <div class="progress-bar-fill bg-success" id="p2p-rx-bar" style="width: 0%;"></div>
              </div>
              <div class="flex-between text-xs text-muted mt-1">
                <span id="p2p-rx-bytes">0 MB</span>
                <span id="p2p-rx-speed">0 MB/s</span>
              </div>
            </div>
          </div>

          <!-- Received File Card -->
          <div id="p2p-received-result-box" class="${this.receivedFileResult ? '' : 'hidden'} mt-4">
            ${this.receivedFileResult ? `
              <div class="alert alert-success text-left animate-scale-up">
                <div class="flex-between">
                  <div>
                    <h4 class="font-bold text-success flex-center gap-2">
                      ${icons.check(18)} File Received Successfully!
                    </h4>
                    <p class="text-sm mt-1">
                      <strong>${this.receivedFileResult.fileName}</strong> (${formatBytes(this.receivedFileResult.fileSize)})
                    </p>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-save-rx-file">
                    ${icons.download(16)} Save File
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(container) {
    // Mode switcher cards
    container.querySelectorAll('.transfer-mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.activeTab = card.dataset.tab;
        this.render(container);
      });
    });

    // P2P Role switcher buttons
    container.querySelector('#btn-p2p-role-send')?.addEventListener('click', () => {
      this.p2pRole = 'send';
      this.render(container);
    });

    container.querySelector('#btn-p2p-role-receive')?.addEventListener('click', () => {
      this.p2pRole = 'receive';
      this.render(container);
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
        filenameText.innerHTML = `Analyzing: <strong>${file.name}</strong> (${formatBytes(file.size)})`;
        const rec = adaptiveTransferService.recommendMode({
          fileSize: file.size,
          isRecipientOnline: false,
          requiresLongTerm: false,
          highPrivacy: file.name.toLowerCase().includes('secret') || file.name.toLowerCase().includes('confidential'),
        });

        resultBox.classList.remove('hidden');
        resultBox.innerHTML = `
          <div class="recommendation-card glass-panel animate-scale-up">
            <div class="rec-badge-row flex-between">
              <span class="badge badge-success">${rec.badge}</span>
              <span class="font-semibold text-primary">${rec.title}</span>
            </div>
            <p class="rec-explanation mt-2">${rec.explanation}</p>
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
            this.p2pFile = file;
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

    // P2P SENDER events
    if (this.activeTab === 'p2p' && this.p2pRole === 'send') {
      const filePicker = container.querySelector('#p2p-file-picker');
      const genCodeBtn = container.querySelector('#btn-gen-p2p-code');
      const copyCodeBtn = container.querySelector('#btn-copy-p2p-code');
      const copyLinkBtn = container.querySelector('#btn-copy-p2p-link');
      const codeLabel = container.querySelector('#p2p-room-code-label');

      filePicker?.addEventListener('change', (e) => {
        if (e.target.files?.length) {
          this.p2pFile = e.target.files[0];
          container.querySelector('#p2p-selected-file-info').innerHTML = `
            Selected: <strong>${this.p2pFile.name}</strong> (${formatBytes(this.p2pFile.size)})
          `;
          if (!this.p2pRoomCode) {
            genCodeBtn.click();
          } else {
            this.startHostSession(container);
          }
        }
      });

      genCodeBtn?.addEventListener('click', () => {
        this.p2pRoomCode = p2pTransferService.generateRoomCode();
        if (codeLabel) codeLabel.textContent = this.p2pRoomCode;
        toast.info(`Room code ${this.p2pRoomCode} generated.`);
        if (this.p2pFile) {
          this.startHostSession(container);
        } else {
          toast.warning('Select a file to send above.');
        }
      });

      copyCodeBtn?.addEventListener('click', () => {
        if (this.p2pRoomCode) {
          navigator.clipboard.writeText(this.p2pRoomCode);
          toast.success('Room code copied to clipboard!');
        } else {
          toast.warning('Generate a room code first.');
        }
      });

      copyLinkBtn?.addEventListener('click', () => {
        if (this.p2pRoomCode) {
          const origin = window.location.origin;
          const joinUrl = `${origin}/#transfers?role=receive&room=${encodeURIComponent(this.p2pRoomCode)}`;
          navigator.clipboard.writeText(joinUrl);
          toast.success('Direct receiver link copied! Send it to the recipient.');
        } else {
          toast.warning('Generate a room code first.');
        }
      });

      const copyP2PQrBtn = container.querySelector('#btn-show-p2p-qr');
      copyP2PQrBtn?.addEventListener('click', () => {
        if (this.p2pRoomCode) {
          const origin = window.location.origin;
          const joinUrl = `${origin}/#transfers?role=receive&room=${encodeURIComponent(this.p2pRoomCode)}`;
          qrModal.open({
            url: joinUrl,
            fileName: this.p2pFile?.name || 'Direct P2P Room',
            fileSize: this.p2pFile?.size || null,
            title: `Scan to Join Room (${this.p2pRoomCode})`,
          });
        } else {
          toast.warning('Generate a room code first.');
        }
      });
    }

    // P2P RECEIVER events
    if (this.activeTab === 'p2p' && this.p2pRole === 'receive') {
      const form = container.querySelector('#p2p-join-form');
      const roomInput = container.querySelector('#p2p-input-room-code');

      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = (roomInput.value || '').trim().toUpperCase();
        if (!code) {
          toast.warning('Please enter a room code');
          return;
        }

        this.p2pRoomCode = code;
        this.startClientSession(container, code);
      });

      container.querySelector('#btn-save-rx-file')?.addEventListener('click', () => {
        if (this.receivedFileResult?.blob) {
          this.triggerBlobDownload(this.receivedFileResult.blob, this.receivedFileResult.fileName);
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
        btn.textContent = 'Arming Ephemeral Share...';

        try {
          const uploaded = await filesService.uploadFile(file);
          const isBurn = duration === 'burn';
          const link = await shareService.createShareLink(uploaded.id, {
            duration: isBurn ? '1h' : duration,
            password,
            maxDownloads: isBurn ? 1 : null,
          });

          resultBox.classList.remove('hidden');
          resultBox.innerHTML = `
            <div class="result-success-box glass-panel animate-scale-up p-4">
              <div class="text-success font-semibold text-base mb-2 flex-center gap-2">
                ${icons.check(20)} Ephemeral Share Armed & Active
              </div>
              <p class="text-sm">
                ${isBurn ? '🔥 <strong>Self-Destruct Active:</strong> This file will permanently burn and purge immediately after 1 download.' : `This share will auto-purge in ${duration}.`}
              </p>
              <div class="input-with-button mt-3">
                <input type="text" readonly value="${link.shareUrl}" class="form-input font-mono" id="ephemeral-url-input" />
                <button type="button" class="btn btn-primary" id="btn-copy-ephemeral">Copy Link</button>
                <button type="button" class="btn btn-outline" id="btn-show-ephemeral-qr" title="Show QR Code">${icons.qr(15)} QR</button>
              </div>
              ${link.directFileUrl ? `
                <div class="mt-2 text-xs text-muted">
                  Direct raw link: <code class="font-mono">${link.directFileUrl}</code>
                </div>
              ` : ''}
            </div>
          `;

          resultBox.querySelector('#btn-copy-ephemeral')?.addEventListener('click', () => {
            navigator.clipboard.writeText(link.shareUrl);
            toast.success('Ephemeral link copied to clipboard!');
          });

          resultBox.querySelector('#btn-show-ephemeral-qr')?.addEventListener('click', () => {
            qrModal.open({
              url: link.shareUrl,
              fileName: file.name,
              fileSize: file.size,
              title: `Ephemeral QR Code: ${file.name}`,
            });
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

  startHostSession(container) {
    if (!this.p2pFile || !this.p2pRoomCode) return;

    const statusLabel = container.querySelector('#p2p-status-label');
    const progressContainer = container.querySelector('#p2p-progress-container');
    const progressBar = container.querySelector('#p2p-progress-bar');
    const progressPercent = container.querySelector('#p2p-progress-percent');
    const progressSpeed = container.querySelector('#p2p-progress-speed');
    const progressBytes = container.querySelector('#p2p-progress-bytes');

    p2pTransferService.startSenderSession({
      roomCode: this.p2pRoomCode,
      file: this.p2pFile,
      onStatus: (status, msg) => {
        this.p2pStatus = status;
        this.p2pStatusMessage = msg;
        if (statusLabel) statusLabel.textContent = msg;
        if (status === 'transferring' && progressContainer) {
          progressContainer.classList.remove('hidden');
        }
      },
      onProgress: ({ sentBytes, totalBytes, percent, speedMBps }) => {
        this.p2pStatus = 'transferring';
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
        if (progressSpeed) progressSpeed.textContent = `${speedMBps} MB/s`;
        if (progressBytes) progressBytes.textContent = `${formatBytes(sentBytes)} / ${formatBytes(totalBytes)}`;
      },
      onComplete: () => {
        toast.success(`"${this.p2pFile.name}" transferred successfully via direct WebRTC tunnel!`);
      },
      onError: (err) => {
        const msg = err.message || 'Connection interrupted';
        if (this._lastHostErr === msg && Date.now() - (this._lastHostErrTime || 0) < 3000) return;
        this._lastHostErr = msg;
        this._lastHostErrTime = Date.now();
        toast.error(`P2P transfer error: ${msg}`);
      },
    });
  },

  startClientSession(container, roomCode) {
    const statusBox = container.querySelector('#p2p-receiver-status-box');
    const statusLabel = container.querySelector('#p2p-receiver-status-label');
    const progressContainer = container.querySelector('#p2p-receiver-progress-container');
    const rxBar = container.querySelector('#p2p-rx-bar');
    const rxPercent = container.querySelector('#p2p-rx-percent');
    const rxSpeed = container.querySelector('#p2p-rx-speed');
    const rxBytes = container.querySelector('#p2p-rx-bytes');
    const rxFilename = container.querySelector('#p2p-rx-filename');
    const connectBtn = container.querySelector('#btn-p2p-connect');

    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.innerHTML = `${icons.refresh(16)} Connecting...`;
    }

    if (statusBox) statusBox.classList.remove('hidden');

    p2pTransferService.startReceiverSession({
      roomCode,
      onStatus: (status, msg) => {
        this.p2pStatus = status;
        this.p2pStatusMessage = msg;
        if (statusLabel) statusLabel.textContent = msg;
        if (status === 'transferring' && progressContainer) {
          progressContainer.classList.remove('hidden');
        }
      },
      onProgress: ({ receivedBytes, totalBytes, percent, speedMBps, fileName }) => {
        this.p2pStatus = 'transferring';
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (rxBar) rxBar.style.width = `${percent}%`;
        if (rxPercent) rxPercent.textContent = `${percent}%`;
        if (rxSpeed) rxSpeed.textContent = `${speedMBps} MB/s`;
        if (rxBytes) rxBytes.textContent = `${formatBytes(receivedBytes)} of ${formatBytes(totalBytes)}`;
        if (rxFilename && fileName) rxFilename.textContent = `Receiving: ${fileName}`;
      },
      onFileReceived: ({ blob, fileName, fileSize }) => {
        this.receivedFileResult = { blob, fileName, fileSize };
        this.triggerBlobDownload(blob, fileName);
        toast.success(`File "${fileName}" received and downloaded!`);
        if (connectBtn) {
          connectBtn.disabled = false;
          connectBtn.innerHTML = `${icons.check(18)} Received!`;
        }
        this.render(container);
      },
      onError: (err) => {
        const msg = err.message || 'Connection interrupted';
        if (this._lastRxErr === msg && Date.now() - (this._lastRxErrTime || 0) < 3000) return;
        this._lastRxErr = msg;
        this._lastRxErrTime = Date.now();
        toast.error(`Receiver error: ${msg}`);
        if (connectBtn) {
          connectBtn.disabled = false;
          connectBtn.innerHTML = `${icons.sparkles(18)} Connect & Receive`;
        }
      },
    });
  },

  triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  },
};
