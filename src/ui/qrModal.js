// ==============================================================================
// Altrivelle Linker — Interactive QR Code Sharing Modal
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { qrService } from '../services/qr.service.js';
import { icons } from './icons.js';
import { toast } from './toast.js';
import { escapeHtml, copyToClipboard } from '../utils/dom.js';
import { formatBytes } from '../utils/formatters.js';

export const qrModal = {
  /**
   * Open high-resolution QR modal for any share link, file, or P2P transfer
   */
  async open({ url, fileName = 'Shared File', fileSize = null, expiryText = null, title = 'Scan & Share File' }) {
    // Remove any existing QR modal
    document.getElementById('altrivelle-qr-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'altrivelle-qr-modal';
    overlay.className = 'modal-backdrop animate-fade-in flex-center';

    overlay.innerHTML = `
      <div class="modal-card qr-modal-card glass-panel animate-scale-up" style="max-width: 480px; width: 92%;">
        <div class="modal-header flex-between mb-3">
          <div class="flex-center gap-2">
            <span class="text-primary">${icons.qr(22)}</span>
            <h3 class="font-bold text-lg text-main">${escapeHtml(title)}</h3>
          </div>
          <button type="button" class="btn-icon btn-close-qr-modal" title="Close">&times;</button>
        </div>

        <div class="qr-content-wrapper text-center">
          <p class="text-xs text-muted mb-3">
            Scan with any smartphone camera or QR reader to instantly open and download.
          </p>

          <!-- QR Canvas Viewport -->
          <div class="qr-canvas-box flex-center mb-3">
            <div class="qr-card-mount p-3 bg-white rounded-lg shadow-md inline-block">
              <canvas id="qr-code-canvas" width="220" height="220"></canvas>
            </div>
          </div>

          <!-- File Info Pill -->
          <div class="qr-file-summary-pill mb-3 p-2 bg-subtle rounded text-xs flex-between">
            <div class="text-left truncate mr-2">
              <span class="font-semibold text-main truncate block" title="${escapeHtml(fileName)}">
                ${escapeHtml(fileName)}
              </span>
              ${fileSize ? `<span class="text-muted">${formatBytes(fileSize)}</span>` : ''}
              ${expiryText ? ` &bull; <span class="text-muted">Expires: ${escapeHtml(expiryText)}</span>` : ''}
            </div>
            <span class="badge badge-primary font-mono text-xs">QR Verified</span>
          </div>

          <!-- Quick URL Row -->
          <div class="input-with-button mb-3">
            <input type="text" readonly class="form-input text-xs font-mono" id="qr-share-url-input" value="${escapeHtml(url)}" />
            <button type="button" class="btn btn-outline btn-sm" id="btn-copy-qr-url" title="Copy URL">
              ${icons.copy(14)} Copy
            </button>
          </div>

          <!-- Action Buttons Grid -->
          <div class="qr-actions-grid grid-2 gap-2 mt-3">
            <button type="button" class="btn btn-primary btn-sm flex-center gap-1" id="btn-download-qr-png">
              ${icons.download(15)} Download QR (PNG)
            </button>
            <button type="button" class="btn btn-outline btn-sm flex-center gap-1" id="btn-download-qr-card">
              ${icons.sparkles(15)} Branded Card (HQ)
            </button>
            <button type="button" class="btn btn-outline btn-sm flex-center gap-1" id="btn-copy-qr-img">
              ${icons.copy(15)} Copy QR Image
            </button>
            <button type="button" class="btn btn-outline btn-sm flex-center gap-1" id="btn-native-share">
              ${icons.smartphone(15)} Share via Mobile
            </button>
          </div>

          <!-- Developer attribution note -->
          <div class="developer-note mt-3 text-xs text-muted">
            Powered by <strong>Altrivelle Linker</strong> &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Render Canvas
    const canvas = overlay.querySelector('#qr-code-canvas');
    let qrDataUrl = '';
    try {
      await qrService.renderToCanvas(canvas, url, {
        width: 220,
        margin: 1,
        darkColor: '#0f172a',
        lightColor: '#ffffff',
      });
      qrDataUrl = canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to render QR Code:', err);
      toast.error('Could not render QR Code: ' + err.message);
    }

    // Bind Close events
    const closeModal = () => overlay.remove();
    overlay.querySelector('.btn-close-qr-modal')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);

    // Bind Copy URL
    overlay.querySelector('#btn-copy-qr-url')?.addEventListener('click', async () => {
      await copyToClipboard(url);
      toast.success('Share link copied to clipboard!');
    });

    // Bind Download PNG
    overlay.querySelector('#btn-download-qr-png')?.addEventListener('click', () => {
      if (qrDataUrl) {
        const cleanName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
        qrService.downloadImage(qrDataUrl, `altrivelle-qr-${cleanName}.png`);
        toast.success('QR Code image downloaded.');
      }
    });

    // Bind Download Branded Card
    overlay.querySelector('#btn-download-qr-card')?.addEventListener('click', async () => {
      const btn = overlay.querySelector('#btn-download-qr-card');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-small mr-1"></span> Generating...`;
      try {
        const cardUrl = await qrService.generateBrandedShareCard(url, {
          fileName,
          fileSize,
          expiryText,
        });
        const cleanName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
        qrService.downloadImage(cardUrl, `altrivelle-share-card-${cleanName}.png`);
        toast.success('High-resolution sharing card downloaded!');
      } catch (err) {
        toast.error('Failed to generate card: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `${icons.sparkles(15)} Branded Card (HQ)`;
      }
    });

    // Bind Copy QR Image
    overlay.querySelector('#btn-copy-qr-img')?.addEventListener('click', async () => {
      try {
        await qrService.copyImageToClipboard(qrDataUrl);
        toast.success('QR Code image copied to clipboard!');
      } catch (err) {
        // Fallback: Copy URL if image clipboard write fails in this browser
        await copyToClipboard(url);
        toast.info('Image copy not supported in this browser; link copied instead.');
      }
    });

    // Bind Native Share (Mobile sheet)
    overlay.querySelector('#btn-native-share')?.addEventListener('click', async () => {
      const shared = await qrService.shareNative({
        title: `Shared File: ${fileName}`,
        text: `Download "${fileName}" securely via Altrivelle Linker:`,
        url,
      });
      if (!shared) {
        await copyToClipboard(url);
        toast.success('Link copied! Open WhatsApp or email to paste.');
      }
    });
  },
};
