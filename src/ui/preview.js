// ==============================================================================
// Altrivelle Linker — Unified File Preview, Editor, Annotations & Compression
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

import { modal } from './modal.js';
import { icons } from './icons.js';
import { filesService } from '../services/files.service.js';
import { toast } from './toast.js';
import { openShareModal } from './shareModal.js';
import { fileEditor } from './fileEditor.js';
import { annotationsComponent } from './annotations.js';
import { compressionService, COMPRESSION_PRESETS } from '../services/compression.service.js';

function formatBytes(bytes, decimals = 2) {
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

export const previewManager = {
  async openPreview(file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = (file.mime_type || '').toLowerCase();

    const isImage = mime.startsWith('image/') && ext !== 'svg';
    const isTextOrCode =
      mime.startsWith('text/') ||
      ['txt', 'md', 'json', 'js', 'ts', 'css', 'py', 'sql', 'yaml', 'yml', 'csv', 'html', 'htm'].includes(ext);
    const isEditable = isImage || isTextOrCode;
    const isCompressible = compressionService.isCompressibleImage(mime, file.name) || isTextOrCode;

    // Show loading modal first
    modal.open(`
      <div class="preview-loading">
        <div class="spinner"></div>
        <p>Loading secure workspace for <strong>${escapeHtml(file.name)}</strong>...</p>
      </div>
    `, {
      title: 'Loading File...',
      maxWidth: 'max-w-5xl',
    });

    try {
      let previewUrl = null;
      let downloadUrl = null;
      let rawTextContent = '';

      if (file.storage_path) {
        [previewUrl, downloadUrl] = await Promise.all([
          filesService.getSignedPreviewUrl(file.storage_path),
          filesService.getSignedDownloadUrl(file.storage_path, file.name),
        ]);
      }

      // Fetch text if text/code
      if (isTextOrCode && previewUrl) {
        try {
          const res = await fetch(previewUrl);
          rawTextContent = await res.text();
        } catch (fetchErr) {
          console.warn('Could not fetch text content:', fetchErr);
        }
      }

      // 1. Generate base preview HTML
      let basePreviewHtml = '';
      if (isImage) {
        basePreviewHtml = `
          <div class="preview-container image-preview-wrapper" id="preview-image-parent">
            <img src="${previewUrl}" alt="${escapeHtml(file.name)}" id="preview-main-img" class="preview-img" loading="lazy" />
          </div>
        `;
      } else if (mime.includes('svg') || ext === 'svg' || mime.includes('html') || ext === 'html' || ext === 'htm') {
        basePreviewHtml = `
          <div class="preview-security-notice">
            <div class="security-banner">
              ${icons.shield(28)}
              <div>
                <h4>Security Sandbox Notice</h4>
                <p>For your security, executable web content is isolated. You can safely inspect and edit the source code in the <strong>Edit & Tools</strong> tab.</p>
              </div>
            </div>
            <div class="file-card-details">
              <div class="file-detail-icon">${icons.fileType(file.mime_type, file.name, 48)}</div>
              <h3>${escapeHtml(file.name)}</h3>
              <p class="file-meta">${formatBytes(file.size_bytes)} &bull; ${file.mime_type}</p>
            </div>
          </div>
        `;
      } else if (mime.includes('pdf') || ext === 'pdf') {
        basePreviewHtml = `
          <div class="preview-container pdf-preview-wrapper">
            <iframe src="${previewUrl}#toolbar=0" class="preview-iframe" title="${escapeHtml(file.name)}" sandbox="allow-scripts allow-same-origin"></iframe>
          </div>
        `;
      } else if (mime.startsWith('video/')) {
        basePreviewHtml = `
          <div class="preview-container media-preview-wrapper">
            <video controls autoplay class="preview-video">
              <source src="${previewUrl}" type="${file.mime_type}">
              Your browser does not support HTML5 video.
            </video>
          </div>
        `;
      } else if (mime.startsWith('audio/')) {
        basePreviewHtml = `
          <div class="preview-container audio-preview-wrapper">
            <div class="audio-cover">${icons.fileType(file.mime_type, file.name, 64)}</div>
            <h3>${escapeHtml(file.name)}</h3>
            <audio controls class="preview-audio">
              <source src="${previewUrl}" type="${file.mime_type}">
              Your browser does not support HTML5 audio.
            </audio>
          </div>
        `;
      } else if (isTextOrCode) {
        const safeText = escapeHtml(rawTextContent.slice(0, 50000));
        basePreviewHtml = `
          <div class="preview-container text-preview-wrapper">
            <pre class="preview-code"><code>${safeText}</code></pre>
          </div>
        `;
      } else {
        basePreviewHtml = `
          <div class="preview-generic-box">
            <div class="file-detail-icon">${icons.fileType(file.mime_type, file.name, 56)}</div>
            <h3>${escapeHtml(file.name)}</h3>
            <p class="file-meta">${formatBytes(file.size_bytes)} &bull; ${file.mime_type || 'Unknown MIME'}</p>
            <p class="preview-generic-desc">A live preview is not available for this binary format. You can securely download or annotate it below.</p>
          </div>
        `;
      }

      // Render Modal Structure with Tabs
      const modalBody = modal.open(`
        <div class="preview-workspace-wrapper animate-fade-in">
          <!-- Workspace Header Navigation Tabs -->
          <div class="workspace-tabs-bar">
            <div class="workspace-tabs-group">
              <button type="button" class="workspace-tab-btn active" data-tab="tab-preview">
                ${icons.eye(16)} Preview
              </button>
              ${
                isEditable
                  ? `
                <button type="button" class="workspace-tab-btn" data-tab="tab-edit">
                  ${icons.edit(16)} ${isImage ? 'Image Studio & Filters' : 'Live Editor'}
                </button>
              `
                  : ''
              }
              <button type="button" class="workspace-tab-btn" data-tab="tab-annotations">
                ${icons.messageSquare(16)} Text Annotations
              </button>
              ${
                isCompressible
                  ? `
                <button type="button" class="workspace-tab-btn" data-tab="tab-compression">
                  ${icons.compress(16)} Compress & Optimize
                </button>
              `
                  : ''
              }
            </div>
            <div class="workspace-header-actions">
              <button type="button" class="btn btn-outline btn-xs" id="btn-share-from-top-preview" title="Share file">
                ${icons.share(14)} Share
              </button>
              ${
                downloadUrl
                  ? `
                <a href="${downloadUrl}" download="${escapeHtml(file.name)}" class="btn btn-primary btn-xs" id="btn-top-download">
                  ${icons.download(14)} Download
                </a>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Tab Content Views -->
          <div class="workspace-tab-panels">
            <!-- 1. Preview Tab -->
            <div class="workspace-tab-panel active" id="tab-preview">
              ${basePreviewHtml}
            </div>

            <!-- 2. Edit & Tools Tab -->
            ${
              isEditable
                ? `
              <div class="workspace-tab-panel" id="tab-edit">
                <div id="file-editor-mount-point" class="editor-mount-container"></div>
              </div>
            `
                : ''
            }

            <!-- 3. Annotations Tab -->
            <div class="workspace-tab-panel" id="tab-annotations">
              <div id="file-annotations-mount-point" class="annotations-mount-container"></div>
            </div>

            <!-- 4. Compression Tab -->
            ${
              isCompressible
                ? `
              <div class="workspace-tab-panel" id="tab-compression">
                <div id="file-compression-mount-point" class="compression-mount-container"></div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Bottom Footer Bar -->
          <div class="preview-footer-bar">
            <div class="preview-file-info">
              <span class="preview-name">${escapeHtml(file.name)}</span>
              <span class="preview-size">${formatBytes(file.size_bytes)}</span>
              <span class="badge badge-subtle text-xs">${file.mime_type || 'Asset'}</span>
            </div>
            <div class="preview-actions">
              <button type="button" class="btn btn-primary btn-sm" id="btn-share-from-preview">
                ${icons.share(16)} Share File
              </button>
              ${
                downloadUrl
                  ? `<a href="${downloadUrl}" download="${escapeHtml(file.name)}" class="btn btn-secondary btn-sm" id="btn-bottom-download">
                      ${icons.download(16)} Download File
                    </a>`
                  : ''
              }
              <button type="button" class="btn btn-outline btn-sm" id="btn-close-preview">Close</button>
            </div>
          </div>
          <div class="preview-attribution">
            Protected by Altrivelle Linker &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong>
          </div>
        </div>
      `, {
        title: escapeHtml(file.name),
        maxWidth: 'max-w-5xl',
      });

      // Bind Tab Navigation
      modalBody.querySelectorAll('.workspace-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modalBody.querySelectorAll('.workspace-tab-btn').forEach((b) => b.classList.remove('active'));
          modalBody.querySelectorAll('.workspace-tab-panel').forEach((p) => p.classList.remove('active'));

          btn.classList.add('active');
          const targetPanel = modalBody.querySelector(`#${btn.dataset.tab}`);
          if (targetPanel) targetPanel.classList.add('active');

          // Lazy initialize tab content
          if (btn.dataset.tab === 'tab-edit') {
            initEditTab();
          } else if (btn.dataset.tab === 'tab-annotations') {
            initAnnotationsTab();
          } else if (btn.dataset.tab === 'tab-compression') {
            initCompressionTab();
          }
        });
      });

      // Tab Initializers
      let isEditorInitialized = false;
      const initEditTab = () => {
        if (isEditorInitialized) return;
        isEditorInitialized = true;
        const mount = modalBody.querySelector('#file-editor-mount-point');
        if (!mount) return;

        if (isImage) {
          fileEditor.renderImageStudio(mount, {
            file,
            imageUrl: previewUrl,
            onSaveCloud: async (blob) => {
              await filesService.updateFileContent(file.id, blob);
              toast.success('Image changes saved to cloud storage!');
              file.size_bytes = blob.size;
              modalBody.querySelector('.preview-size').textContent = formatBytes(blob.size);
            },
          });
        } else if (isTextOrCode) {
          fileEditor.renderTextEditor(mount, {
            file,
            initialText: rawTextContent,
            onSaveCloud: async (newText) => {
              await filesService.updateFileContent(file.id, newText);
              rawTextContent = newText;
              toast.success('File saved to cloud storage!');
              const blobSize = new Blob([newText]).size;
              file.size_bytes = blobSize;
              modalBody.querySelector('.preview-size').textContent = formatBytes(blobSize);
            },
          });
        }
      };

      let isAnnotationsInitialized = false;
      const initAnnotationsTab = () => {
        if (isAnnotationsInitialized) return;
        isAnnotationsInitialized = true;
        const mount = modalBody.querySelector('#file-annotations-mount-point');
        if (!mount) return;

        const mainImg = modalBody.querySelector('#preview-main-img');
        annotationsComponent.mount(mount, {
          fileId: file.id,
          fileName: file.name,
          imageElement: mainImg,
          isReadOnly: false,
        });
      };

      let isCompressionInitialized = false;
      const initCompressionTab = () => {
        if (isCompressionInitialized) return;
        isCompressionInitialized = true;
        const mount = modalBody.querySelector('#file-compression-mount-point');
        if (!mount) return;

        renderCompressionComparison(mount);
      };

      const renderCompressionComparison = async (mount) => {
        mount.innerHTML = `
          <div class="compression-workspace animate-fade-in">
            <div class="compression-header-card">
              <div>
                <h3>Intelligent Storage Optimization</h3>
                <p class="text-sm text-muted">Optimize image dimensions & eliminate uncompressed overhead without noticeable loss</p>
              </div>
              <div class="compression-preset-picker">
                <label>Optimization Preset:</label>
                <select id="select-compression-preset" class="form-select-sm">
                  ${Object.values(COMPRESSION_PRESETS)
                    .map(
                      (p) => `
                    <option value="${p.id}" ${p.id === 'balanced' ? 'selected' : ''}>${p.name} (Quality: ${Math.round(p.quality * 100)}%)</option>
                  `
                    )
                    .join('')}
                </select>
              </div>
            </div>

            <div id="compression-results-view" class="compression-results-view">
              <div class="loading-state">
                <div class="spinner"></div>
                <p>Analyzing file and calculating savings...</p>
              </div>
            </div>
          </div>
        `;

        const resultsView = mount.querySelector('#compression-results-view');
        const presetSelect = mount.querySelector('#select-compression-preset');

        const runOptimization = async (presetId) => {
          resultsView.innerHTML = `
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Compressing using <strong>${COMPRESSION_PRESETS[presetId]?.name || 'Preset'}</strong>...</p>
            </div>
          `;

          try {
            if (isImage) {
              // Fetch image blob
              const res = await fetch(previewUrl);
              const blob = await res.blob();
              const testFile = new File([blob], file.name, { type: file.mime_type || 'image/jpeg' });

              const result = await compressionService.compressImage(testFile, { preset: presetId });

              resultsView.innerHTML = `
                <div class="comparison-cards-grid animate-fade-in">
                  <!-- Original Card -->
                  <div class="comparison-card">
                    <div class="comparison-card-badge original">Original Asset</div>
                    <div class="comparison-preview-box">
                      <img src="${previewUrl}" alt="Original" class="comparison-img" />
                    </div>
                    <div class="comparison-meta">
                      <div class="meta-row"><span>Size:</span> <strong>${formatBytes(result.originalBytes)}</strong></div>
                      <div class="meta-row"><span>Type:</span> <span>${file.mime_type}</span></div>
                    </div>
                  </div>

                  <!-- Optimized Card -->
                  <div class="comparison-card highlight-card">
                    <div class="comparison-card-badge optimized">Optimized Asset</div>
                    <div class="comparison-preview-box">
                      <img src="${result.previewUrl}" alt="Optimized" class="comparison-img" />
                    </div>
                    <div class="comparison-meta">
                      <div class="meta-row"><span>Compressed:</span> <strong class="text-success">${formatBytes(result.compressedBytes)}</strong></div>
                      <div class="meta-row"><span>Storage Saved:</span> <span class="badge badge-success">${result.savedPercent} smaller</span></div>
                    </div>
                  </div>
                </div>

                <!-- Savings Callout Banner -->
                <div class="savings-banner mt-3">
                  <div class="savings-icon">${icons.sparkles(24)}</div>
                  <div class="savings-text">
                    <strong>Saved ${formatBytes(result.savedBytes)} (${result.savedPercent} reduction)</strong>
                    <p class="text-xs">Your quota usage will drop by ${formatBytes(result.savedBytes)} if you replace this asset.</p>
                  </div>
                  <div class="savings-actions">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-download-compressed">
                      ${icons.download(14)} Download Optimized
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" id="btn-replace-in-cloud">
                      ${icons.save(14)} Replace Cloud File
                    </button>
                  </div>
                </div>
              `;

              // Download optimized
              resultsView.querySelector('#btn-download-compressed')?.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = result.previewUrl;
                a.download = result.file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success(`Downloaded compressed ${result.file.name}`);
              });

              // Replace in cloud
              resultsView.querySelector('#btn-replace-in-cloud')?.addEventListener('click', async () => {
                const repBtn = resultsView.querySelector('#btn-replace-in-cloud');
                if (repBtn) {
                  repBtn.disabled = true;
                  repBtn.innerHTML = `${icons.refreshCw(14, 'spinner-small')} Updating...`;
                }
                try {
                  await filesService.updateFileContent(file.id, result.file);
                  file.size_bytes = result.compressedBytes;
                  modalBody.querySelector('.preview-size').textContent = formatBytes(result.compressedBytes);
                  toast.success(`Replaced in cloud! Saved ${formatBytes(result.savedBytes)}.`);
                } catch (repErr) {
                  toast.error(`Could not replace file: ${repErr.message}`);
                } finally {
                  if (repBtn) {
                    repBtn.disabled = false;
                    repBtn.innerHTML = `${icons.save(14)} Replace Cloud File`;
                  }
                }
              });
            } else if (isTextOrCode) {
              const textResult = compressionService.compressText(rawTextContent, file.name);

              resultsView.innerHTML = `
                <div class="text-compression-summary animate-fade-in">
                  <div class="savings-banner">
                    <div class="savings-icon">${icons.sparkles(24)}</div>
                    <div class="savings-text">
                      <strong>Whitespace & Redundancy Optimization</strong>
                      <p>Original: ${formatBytes(textResult.originalBytes)} &rarr; Optimized: <span class="text-success">${formatBytes(textResult.compressedBytes)}</span> (${textResult.savedPercent} saved)</p>
                    </div>
                    <div class="savings-actions">
                      <button type="button" class="btn btn-primary btn-sm" id="btn-apply-text-minification">
                        Apply & Save Minified
                      </button>
                    </div>
                  </div>
                </div>
              `;

              resultsView.querySelector('#btn-apply-text-minification')?.addEventListener('click', async () => {
                try {
                  await filesService.updateFileContent(file.id, textResult.content);
                  rawTextContent = textResult.content;
                  file.size_bytes = textResult.compressedBytes;
                  modalBody.querySelector('.preview-size').textContent = formatBytes(textResult.compressedBytes);
                  toast.success(`Minified and saved! Saved ${formatBytes(textResult.savedBytes)}.`);
                } catch (err) {
                  toast.error(`Minification save failed: ${err.message}`);
                }
              });
            }
          } catch (err) {
            console.error('Optimization error:', err);
            resultsView.innerHTML = `<div class="alert alert-danger">Optimization calculation failed: ${escapeHtml(err.message)}</div>`;
          }
        };

        presetSelect?.addEventListener('change', (e) => {
          runOptimization(e.target.value);
        });

        runOptimization('balanced');
      };

      // Header Actions
      modalBody.querySelector('#btn-close-preview')?.addEventListener('click', () => modal.close());

      const openShareAction = () => {
        modal.close();
        setTimeout(() => {
          openShareModal(file);
        }, 50);
      };

      modalBody.querySelector('#btn-share-from-preview')?.addEventListener('click', openShareAction);
      modalBody.querySelector('#btn-share-from-top-preview')?.addEventListener('click', openShareAction);
    } catch (err) {
      console.error('Preview error:', err);
      toast.error(`Could not preview file: ${err.message}`);
      modal.close();
    }
  },
};
