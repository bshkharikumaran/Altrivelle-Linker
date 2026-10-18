// ==============================================================================
// Altrivelle Linker — In-Browser Live File Editor & Image Studio
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

import { icons } from './icons.js';
import { toast } from './toast.js';

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const fileEditor = {
  /**
   * Builds an interactive Text & Code editor component
   */
  renderTextEditor(container, { file, initialText, onSaveCloud, onDownload }) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isMarkdown = ext === 'md';
    const isJson = ext === 'json';
    const isCsv = ext === 'csv';

    let currentText = initialText || '';
    let viewSubMode = 'editor'; // 'editor' | 'preview' | 'table'

    const updateStats = (text) => {
      const lines = text.split('\n').length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      const statsEl = container.querySelector('#editor-stats-bar');
      if (statsEl) {
        statsEl.innerHTML = `<span><strong>${lines}</strong> lines</span><span><strong>${words}</strong> words</span><span><strong>${chars}</strong> chars</span>`;
      }
    };

    const updateLineNumbers = (text) => {
      const lineGutter = container.querySelector('#editor-line-gutter');
      if (!lineGutter) return;
      const lineCount = text.split('\n').length;
      let gutterHtml = '';
      for (let i = 1; i <= lineCount; i++) {
        gutterHtml += `<div>${i}</div>`;
      }
      lineGutter.innerHTML = gutterHtml;
    };

    container.innerHTML = `
      <div class="file-editor-container animate-fade-in">
        <!-- Editor Sub-Toolbar -->
        <div class="editor-sub-toolbar">
          <div class="editor-toolbar-left">
            <span class="editor-file-badge">${icons.file(14)} ${escapeHtml(file.name)}</span>
            <div id="editor-stats-bar" class="editor-stats"></div>
          </div>
          <div class="editor-toolbar-right">
            ${
              isMarkdown
                ? `
              <div class="segmented-control">
                <button type="button" class="btn-segmented active" id="btn-md-edit-mode">${icons.edit(14)} Code</button>
                <button type="button" class="btn-segmented" id="btn-md-preview-mode">${icons.eye(14)} Preview</button>
              </div>
            `
                : ''
            }
            ${
              isJson
                ? `<button type="button" class="btn btn-outline btn-xs" id="btn-format-json">Format JSON</button>`
                : ''
            }
            ${
              isCsv
                ? `
              <div class="segmented-control">
                <button type="button" class="btn-segmented active" id="btn-csv-raw-mode">Raw CSV</button>
                <button type="button" class="btn-segmented" id="btn-csv-table-mode">Spreadsheet</button>
              </div>
            `
                : ''
            }
            <button type="button" class="btn btn-outline btn-xs" id="btn-copy-editor-text" title="Copy to clipboard">
              ${icons.copy(14)} Copy
            </button>
            <button type="button" class="btn btn-outline btn-xs" id="btn-download-edited" title="Download edited copy">
              ${icons.download(14)} Download
            </button>
            <button type="button" class="btn btn-primary btn-xs" id="btn-save-cloud" title="Save changes directly">
              ${icons.save(14)} Save Changes
            </button>
          </div>
        </div>

        <!-- Editor Work Area -->
        <div class="editor-workarea">
          <div class="editor-textarea-wrapper" id="editor-code-view">
            <div class="editor-line-gutter" id="editor-line-gutter">1</div>
            <textarea id="editor-main-textarea" class="editor-textarea" spellcheck="false" placeholder="Start typing file contents...">${escapeHtml(currentText)}</textarea>
          </div>
          <div id="editor-preview-view" class="editor-preview-view hidden"></div>
        </div>
      </div>
    `;

    const textarea = container.querySelector('#editor-main-textarea');
    const gutter = container.querySelector('#editor-line-gutter');
    const codeView = container.querySelector('#editor-code-view');
    const previewView = container.querySelector('#editor-preview-view');

    updateStats(currentText);
    updateLineNumbers(currentText);

    // Sync line gutter scrolling with textarea
    if (textarea && gutter) {
      textarea.addEventListener('scroll', () => {
        gutter.scrollTop = textarea.scrollTop;
      });

      // Handle Tab key in textarea
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 2;
          currentText = textarea.value;
          updateStats(currentText);
          updateLineNumbers(currentText);
        }
      });

      textarea.addEventListener('input', () => {
        currentText = textarea.value;
        updateStats(currentText);
        updateLineNumbers(currentText);
      });
    }

    // Markdown preview handler
    if (isMarkdown) {
      const editBtn = container.querySelector('#btn-md-edit-mode');
      const prevBtn = container.querySelector('#btn-md-preview-mode');

      const renderMd = (text) => {
        // Simple safe markdown renderer
        const raw = escapeHtml(text)
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/gim, '<em>$1</em>')
          .replace(/`([^`]+)`/gim, '<code>$1</code>')
          .replace(/\n\n/gim, '</p><p>')
          .replace(/\n/gim, '<br />');
        return `<div class="markdown-preview-body"><p>${raw}</p></div>`;
      };

      editBtn?.addEventListener('click', () => {
        editBtn.classList.add('active');
        prevBtn?.classList.remove('active');
        codeView.classList.remove('hidden');
        previewView.classList.add('hidden');
      });

      prevBtn?.addEventListener('click', () => {
        prevBtn.classList.add('active');
        editBtn?.classList.remove('active');
        previewView.innerHTML = renderMd(textarea.value);
        codeView.classList.add('hidden');
        previewView.classList.remove('hidden');
      });
    }

    // CSV Spreadsheet Table Mode
    if (isCsv) {
      const rawBtn = container.querySelector('#btn-csv-raw-mode');
      const tableBtn = container.querySelector('#btn-csv-table-mode');

      const parseCsvToTable = (csvText) => {
        const rows = csvText.split('\n').filter((r) => r.trim());
        if (!rows.length) return '<p class="text-muted p-4">Empty CSV file.</p>';

        const parsedRows = rows.map((r) => r.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')));
        const headers = parsedRows[0];
        const bodyRows = parsedRows.slice(1);

        return `
          <div class="csv-table-scroll">
            <table class="csv-live-table">
              <thead>
                <tr>
                  ${headers.map((h, i) => `<th><input type="text" value="${escapeHtml(h)}" class="csv-cell-input header-cell" data-row="0" data-col="${i}" /></th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${bodyRows
                  .map(
                    (row, rIdx) => `
                  <tr>
                    ${row.map((cell, cIdx) => `<td><input type="text" value="${escapeHtml(cell)}" class="csv-cell-input" data-row="${rIdx + 1}" data-col="${cIdx}" /></td>`).join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      };

      rawBtn?.addEventListener('click', () => {
        rawBtn.classList.add('active');
        tableBtn?.classList.remove('active');
        codeView.classList.remove('hidden');
        previewView.classList.add('hidden');
      });

      tableBtn?.addEventListener('click', () => {
        tableBtn.classList.add('active');
        rawBtn?.classList.remove('active');
        previewView.innerHTML = parseCsvToTable(textarea.value);
        codeView.classList.add('hidden');
        previewView.classList.remove('hidden');

        // Bind interactive spreadsheet cells back to CSV textarea
        previewView.querySelectorAll('.csv-cell-input').forEach((input) => {
          input.addEventListener('change', () => {
            const allRows = [];
            const trs = previewView.querySelectorAll('tr');
            trs.forEach((tr) => {
              const rowCells = [];
              tr.querySelectorAll('input').forEach((inp) => rowCells.push(`"${inp.value.replace(/"/g, '""')}"`));
              if (rowCells.length) allRows.push(rowCells.join(','));
            });
            textarea.value = allRows.join('\n');
            currentText = textarea.value;
            updateStats(currentText);
            updateLineNumbers(currentText);
          });
        });
      });
    }

    // Format JSON
    const formatJsonBtn = container.querySelector('#btn-format-json');
    if (formatJsonBtn) {
      formatJsonBtn.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(textarea.value);
          textarea.value = JSON.stringify(parsed, null, 2);
          currentText = textarea.value;
          updateStats(currentText);
          updateLineNumbers(currentText);
          toast.success('JSON formatted beautifully');
        } catch (err) {
          toast.error(`Invalid JSON: ${err.message}`);
        }
      });
    }

    // Copy Text
    container.querySelector('#btn-copy-editor-text')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        toast.success('Copied text to clipboard');
      } catch {
        toast.error('Could not copy text');
      }
    });

    // Download Edited
    container.querySelector('#btn-download-edited')?.addEventListener('click', () => {
      if (onDownload) {
        onDownload(textarea.value, file.name);
      } else {
        const blob = new Blob([textarea.value], { type: file.mime_type || 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded updated ${file.name}`);
      }
    });

    // Save to Cloud
    container.querySelector('#btn-save-cloud')?.addEventListener('click', async () => {
      const saveBtn = container.querySelector('#btn-save-cloud');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `${icons.refreshCw(14, 'spinner-small')} Saving...`;
      }

      try {
        if (onSaveCloud) {
          await onSaveCloud(textarea.value);
          toast.success('File changes saved to cloud storage successfully');
        }
      } catch (err) {
        toast.error(`Save failed: ${err.message}`);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `${icons.save(14)} Save Changes`;
        }
      }
    });
  },

  /**
   * Builds an interactive Image Studio with rotate, flip, filters, and watermark
   */
  renderImageStudio(container, { file, imageUrl, onSaveCloud, onDownload }) {
    let rotation = 0; // 0, 90, 180, 270
    let flipH = false;
    let flipV = false;
    let brightness = 100;
    let contrast = 100;
    let saturation = 100;
    let grayscale = 0;
    let invert = 0;
    let watermarkText = '';
    let watermarkColor = '#FFFFFF';
    let watermarkSize = 24;
    let watermarkPos = 'bottom'; // 'bottom', 'top', 'center'

    container.innerHTML = `
      <div class="image-studio-container animate-fade-in">
        <!-- Canvas Viewport -->
        <div class="image-studio-viewport">
          <div class="canvas-center-box">
            <canvas id="studio-canvas" class="studio-canvas"></canvas>
          </div>
        </div>

        <!-- Studio Control Sidebar -->
        <div class="image-studio-controls">
          <div class="studio-section-title">
            <span>${icons.sliders(16)} Transform & Orientation</span>
          </div>

          <div class="studio-btn-row">
            <button type="button" class="btn btn-outline btn-sm" id="btn-rotate-ccw" title="Rotate Counter-Clockwise 90°">
              ${icons.rotateCcw(16)} -90°
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-rotate-cw" title="Rotate Clockwise 90°">
              ${icons.rotateCw(16)} +90°
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-flip-h" title="Flip Horizontal">
              ${icons.flipHorizontal(16)} Flip H
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-flip-v" title="Flip Vertical">
              ${icons.sliders(16)} Flip V
            </button>
          </div>

          <div class="studio-section-title mt-3">
            <span>${icons.sliders(16)} Adjustments & Filters</span>
          </div>

          <div class="studio-slider-group">
            <div class="slider-row">
              <label>Brightness</label>
              <span id="label-val-brightness">100%</span>
            </div>
            <input type="range" id="slider-brightness" min="40" max="180" value="100" class="form-range" />

            <div class="slider-row mt-2">
              <label>Contrast</label>
              <span id="label-val-contrast">100%</span>
            </div>
            <input type="range" id="slider-contrast" min="40" max="180" value="100" class="form-range" />

            <div class="slider-row mt-2">
              <label>Saturation</label>
              <span id="label-val-saturation">100%</span>
            </div>
            <input type="range" id="slider-saturation" min="0" max="200" value="100" class="form-range" />

            <div class="filter-toggles-row mt-2">
              <label class="checkbox-inline">
                <input type="checkbox" id="check-grayscale" /> Grayscale
              </label>
              <label class="checkbox-inline">
                <input type="checkbox" id="check-invert" /> Invert
              </label>
            </div>
          </div>

          <div class="studio-section-title mt-3">
            <span>${icons.type(16)} Text Watermark / Caption</span>
          </div>

          <div class="studio-watermark-group">
            <input type="text" id="input-watermark-text" placeholder="e.g. APPROVED or CONFIDENTIAL" class="form-input form-input-sm" />
            
            <div class="watermark-options-row mt-2">
              <select id="select-watermark-pos" class="form-select-sm">
                <option value="bottom">Bottom Banner</option>
                <option value="top">Top Banner</option>
                <option value="center">Center Stamp</option>
              </select>

              <select id="select-watermark-color" class="form-select-sm">
                <option value="#FFFFFF">White</option>
                <option value="#38bdf8">Cyan Accent</option>
                <option value="#10b981">Green</option>
                <option value="#f59e0b">Amber Gold</option>
                <option value="#ef4444">Red Warning</option>
              </select>

              <select id="select-watermark-size" class="form-select-sm">
                <option value="20">Small (20px)</option>
                <option value="28" selected>Medium (28px)</option>
                <option value="42">Large (42px)</option>
              </select>
            </div>
          </div>

          <!-- Actions -->
          <div class="studio-actions-row mt-4">
            <button type="button" class="btn btn-outline btn-sm" id="btn-studio-reset">
              ${icons.refreshCw(14)} Reset All
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btn-studio-download">
              ${icons.download(14)} Download
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-studio-save">
              ${icons.save(14)} Save Image
            </button>
          </div>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#studio-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const redrawCanvas = () => {
      if (!img.complete || !img.naturalWidth) return;

      const isRotated90or270 = rotation === 90 || rotation === 270;
      const targetW = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      const targetH = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.save();
      // Apply filters
      let filterStr = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      if (grayscale) filterStr += ' grayscale(100%)';
      if (invert) filterStr += ' invert(100%)';
      ctx.filter = filterStr;

      // Translate & Rotate
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      // Render Watermark if provided
      if (watermarkText.trim()) {
        ctx.save();
        ctx.font = `bold ${watermarkSize}px system-ui, sans-serif`;
        const textMetrics = ctx.measureText(watermarkText);
        const textW = textMetrics.width;

        let posX = targetW / 2;
        let posY = targetH - 30;

        if (watermarkPos === 'top') {
          posY = 45;
        } else if (watermarkPos === 'center') {
          posY = targetH / 2;
        }

        // Background pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(posX - textW / 2 - 16, posY - watermarkSize + 2, textW + 32, watermarkSize + 16, 8);
        ctx.fill();

        ctx.fillStyle = watermarkColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(watermarkText, posX, posY);
        ctx.restore();
      }
    };

    img.onload = () => redrawCanvas();
    img.src = imageUrl;

    // Orientation buttons
    container.querySelector('#btn-rotate-cw')?.addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      redrawCanvas();
    });

    container.querySelector('#btn-rotate-ccw')?.addEventListener('click', () => {
      rotation = (rotation - 90 + 360) % 360;
      redrawCanvas();
    });

    container.querySelector('#btn-flip-h')?.addEventListener('click', () => {
      flipH = !flipH;
      redrawCanvas();
    });

    container.querySelector('#btn-flip-v')?.addEventListener('click', () => {
      flipV = !flipV;
      redrawCanvas();
    });

    // Sliders
    const bSlider = container.querySelector('#slider-brightness');
    const cSlider = container.querySelector('#slider-contrast');
    const sSlider = container.querySelector('#slider-saturation');

    bSlider?.addEventListener('input', (e) => {
      brightness = e.target.value;
      container.querySelector('#label-val-brightness').textContent = `${brightness}%`;
      redrawCanvas();
    });

    cSlider?.addEventListener('input', (e) => {
      contrast = e.target.value;
      container.querySelector('#label-val-contrast').textContent = `${contrast}%`;
      redrawCanvas();
    });

    sSlider?.addEventListener('input', (e) => {
      saturation = e.target.value;
      container.querySelector('#label-val-saturation').textContent = `${saturation}%`;
      redrawCanvas();
    });

    container.querySelector('#check-grayscale')?.addEventListener('change', (e) => {
      grayscale = e.target.checked ? 1 : 0;
      redrawCanvas();
    });

    container.querySelector('#check-invert')?.addEventListener('change', (e) => {
      invert = e.target.checked ? 1 : 0;
      redrawCanvas();
    });

    // Watermark inputs
    container.querySelector('#input-watermark-text')?.addEventListener('input', (e) => {
      watermarkText = e.target.value;
      redrawCanvas();
    });

    container.querySelector('#select-watermark-pos')?.addEventListener('change', (e) => {
      watermarkPos = e.target.value;
      redrawCanvas();
    });

    container.querySelector('#select-watermark-color')?.addEventListener('change', (e) => {
      watermarkColor = e.target.value;
      redrawCanvas();
    });

    container.querySelector('#select-watermark-size')?.addEventListener('change', (e) => {
      watermarkSize = parseInt(e.target.value, 10);
      redrawCanvas();
    });

    // Reset button
    container.querySelector('#btn-studio-reset')?.addEventListener('click', () => {
      rotation = 0;
      flipH = false;
      flipV = false;
      brightness = 100;
      contrast = 100;
      saturation = 100;
      grayscale = 0;
      invert = 0;
      watermarkText = '';
      if (bSlider) bSlider.value = 100;
      if (cSlider) cSlider.value = 100;
      if (sSlider) sSlider.value = 100;
      container.querySelector('#label-val-brightness').textContent = '100%';
      container.querySelector('#label-val-contrast').textContent = '100%';
      container.querySelector('#label-val-saturation').textContent = '100%';
      const gCheck = container.querySelector('#check-grayscale');
      if (gCheck) gCheck.checked = false;
      const iCheck = container.querySelector('#check-invert');
      if (iCheck) iCheck.checked = false;
      const wInput = container.querySelector('#input-watermark-text');
      if (wInput) wInput.value = '';
      redrawCanvas();
      toast.info('Adjustments reset to original');
    });

    // Download Button
    container.querySelector('#btn-studio-download')?.addEventListener('click', () => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited-${file.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded edited image: edited-${file.name}`);
      }, file.mime_type || 'image/png');
    });

    // Save to Cloud Button
    container.querySelector('#btn-studio-save')?.addEventListener('click', async () => {
      const saveBtn = container.querySelector('#btn-studio-save');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `${icons.refreshCw(14, 'spinner-small')} Saving...`;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Could not generate image blob');
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${icons.save(14)} Save Image`;
          }
          return;
        }

        try {
          if (onSaveCloud) {
            await onSaveCloud(blob);
            toast.success('Updated image saved to cloud storage successfully');
          }
        } catch (err) {
          toast.error(`Save failed: ${err.message}`);
        } finally {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${icons.save(14)} Save Image`;
          }
        }
      }, file.mime_type || 'image/png');
    });
  },
};
