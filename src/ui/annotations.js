// ==============================================================================
// Altrivelle Linker — Interactive Text Annotations Component
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

import { annotationsService, ANNOTATION_TAGS } from '../services/annotations.service.js';
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

export const annotationsComponent = {
  /**
   * Mounts the full annotations sidebar/panel and visual pin overlay
   */
  mount(panelContainer, { fileId, fileName, imageElement = null, isReadOnly = false, currentUserName = 'Team Reviewer' }) {
    let isPinModeActive = false;
    let selectedTag = 'general';

    const render = () => {
      const notes = annotationsService.getAnnotations(fileId);

      panelContainer.innerHTML = `
        <div class="annotations-widget animate-fade-in">
          <!-- Widget Header -->
          <div class="annotations-header">
            <div class="annotations-title-group">
              <span class="annotations-title">${icons.messageSquare(16)} Text Annotations</span>
              <span class="badge badge-subtle">${notes.length} note${notes.length === 1 ? '' : 's'}</span>
            </div>
            <div class="annotations-actions">
              ${
                imageElement && !isReadOnly
                  ? `
                <button type="button" class="btn btn-xs ${isPinModeActive ? 'btn-primary' : 'btn-outline'}" id="btn-toggle-pin-mode" title="Click on image to drop a visual pin note">
                  ${icons.pin(14)} ${isPinModeActive ? 'Click Image to Pin' : 'Drop Pin on Image'}
                </button>
              `
                  : ''
              }
              <button type="button" class="btn btn-outline btn-xs" id="btn-export-notes-md" title="Export as Markdown report">
                ${icons.externalLink(14)} Export
              </button>
              ${
                imageElement && notes.some((n) => n.type === 'pin')
                  ? `
                <button type="button" class="btn btn-outline btn-xs" id="btn-burn-annotations" title="Burn pins into image and download">
                  ${icons.download(14)} Burn to Image
                </button>
              `
                  : ''
              }
            </div>
          </div>

          <!-- Add Note Box -->
          ${
            !isReadOnly
              ? `
            <div class="annotation-create-card">
              <div class="annotation-tag-selector">
                ${Object.entries(ANNOTATION_TAGS)
                  .map(
                    ([key, val]) => `
                  <button type="button" class="annotation-tag-btn ${selectedTag === key ? 'active' : ''}" data-tag="${key}" style="--tag-color: ${val.color}">
                    <span class="tag-color-dot" style="background-color: ${val.color}"></span> ${val.label}
                  </button>
                `
                  )
                  .join('')}
              </div>

              <div class="annotation-input-box">
                <textarea id="annotation-input-text" class="annotation-textarea" rows="2" placeholder="Write a note, feedback, or review comment..."></textarea>
                <div class="annotation-input-actions">
                  <span class="text-xs text-muted" id="pin-mode-status-hint">
                    ${isPinModeActive ? '🎯 Visual Pin Mode active: click on preview image to place note' : 'Click "Post Note" or select Pin mode'}
                  </span>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-submit-annotation">
                    Post Note
                  </button>
                </div>
              </div>
            </div>
          `
              : ''
          }

          <!-- Notes Feed -->
          <div class="annotations-feed" id="annotations-feed-list">
            ${
              notes.length === 0
                ? `
              <div class="annotations-empty">
                <div class="empty-icon">${icons.messageSquare(28)}</div>
                <p>No annotations yet.</p>
                <span class="text-xs text-muted">Add feedback, code reviews, or drop visual pin markers directly on the file.</span>
              </div>
            `
                : notes
                    .map((note, index) => {
                      const tagInfo = ANNOTATION_TAGS[note.tag] || ANNOTATION_TAGS.general;
                      const isPin = note.type === 'pin' && note.xPercent !== null;
                      return `
                    <div class="annotation-item animate-scale-up" data-id="${note.id}">
                      <div class="annotation-item-header">
                        <div class="annotation-author-group">
                          <span class="annotation-index">#${index + 1}</span>
                          <span class="annotation-author">${escapeHtml(note.author)}</span>
                          ${
                            isPin
                              ? `<span class="badge badge-pin" title="Visual pin placed on image">${icons.pin(12)} Pin (${Math.round(note.xPercent)}%, ${Math.round(note.yPercent)}%)</span>`
                              : ''
                          }
                        </div>
                        <div class="annotation-header-right">
                          <span class="annotation-tag-badge" style="background-color: ${tagInfo.color}20; color: ${tagInfo.color}; border: 1px solid ${tagInfo.color}40">
                            ${tagInfo.label}
                          </span>
                          ${
                            !isReadOnly
                              ? `
                            <button type="button" class="btn-icon btn-delete-annotation" data-id="${note.id}" title="Delete note">
                              ${icons.trash(12)}
                            </button>
                          `
                              : ''
                          }
                        </div>
                      </div>
                      <div class="annotation-item-body">
                        ${escapeHtml(note.text)}
                      </div>
                      <div class="annotation-item-footer">
                        <span>${new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  `;
                    })
                    .join('')
            }
          </div>
        </div>
      `;

      bindEvents();
      renderVisualPinsOnImage();
    };

    const bindEvents = () => {
      // Tag selection
      panelContainer.querySelectorAll('.annotation-tag-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedTag = btn.dataset.tag;
          panelContainer.querySelectorAll('.annotation-tag-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Pin Mode Toggle
      const pinToggleBtn = panelContainer.querySelector('#btn-toggle-pin-mode');
      if (pinToggleBtn && imageElement) {
        pinToggleBtn.addEventListener('click', () => {
          isPinModeActive = !isPinModeActive;
          render();
          if (isPinModeActive) {
            toast.info('Visual Pin mode active! Click anywhere on the preview image to pin a note.');
          }
        });
      }

      // Submit Note
      const submitBtn = panelContainer.querySelector('#btn-submit-annotation');
      const textarea = panelContainer.querySelector('#annotation-input-text');
      if (submitBtn && textarea) {
        submitBtn.addEventListener('click', () => {
          const text = textarea.value.trim();
          if (!text) {
            toast.warning('Please enter note text');
            return;
          }

          annotationsService.addAnnotation(fileId, {
            text,
            tag: selectedTag,
            author: currentUserName,
            type: 'note',
          });

          toast.success('Annotation posted');
          render();
        });
      }

      // Delete note
      panelContainer.querySelectorAll('.btn-delete-annotation').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteId = btn.dataset.id;
          annotationsService.deleteAnnotation(fileId, noteId);
          toast.info('Annotation removed');
          render();
        });
      });

      // Export Markdown
      panelContainer.querySelector('#btn-export-notes-md')?.addEventListener('click', () => {
        const md = annotationsService.exportToMarkdown(fileId, fileName);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `annotations-${fileName}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${fileName} annotations to Markdown`);
      });

      // Burn annotations into image
      panelContainer.querySelector('#btn-burn-annotations')?.addEventListener('click', async () => {
        if (!imageElement) return;
        const notes = annotationsService.getAnnotations(fileId);
        try {
          const blob = await annotationsService.burnAnnotationsToCanvas(imageElement, notes);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `annotated-${fileName}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Burned annotations into image and downloaded!');
        } catch (err) {
          toast.error(`Could not burn annotations: ${err.message}`);
        }
      });
    };

    /**
     * Overlays glowing pins on image if preview image is provided
     */
    const renderVisualPinsOnImage = () => {
      if (!imageElement) return;

      const parentWrapper = imageElement.parentElement;
      if (!parentWrapper) return;

      parentWrapper.style.position = 'relative';

      // Clear existing pins
      parentWrapper.querySelectorAll('.visual-pin-marker').forEach((el) => el.remove());

      const notes = annotationsService.getAnnotations(fileId);
      const pinNotes = notes.filter((n) => n.type === 'pin' && n.xPercent !== null);

      pinNotes.forEach((pin, i) => {
        const tagInfo = ANNOTATION_TAGS[pin.tag] || ANNOTATION_TAGS.general;
        const marker = document.createElement('div');
        marker.className = 'visual-pin-marker animate-scale-up';
        marker.style.left = `${pin.xPercent}%`;
        marker.style.top = `${pin.yPercent}%`;
        marker.style.backgroundColor = tagInfo.color;
        marker.title = `#${i + 1}: ${pin.text}`;
        marker.innerHTML = `
          <span>${i + 1}</span>
          <div class="pin-tooltip">
            <strong>${escapeHtml(pin.author)}:</strong> ${escapeHtml(pin.text)}
          </div>
        `;

        // Highlight matching note on pin click
        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          const noteEl = panelContainer.querySelector(`.annotation-item[data-id="${pin.id}"]`);
          if (noteEl) {
            noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            noteEl.classList.add('highlighted-note');
            setTimeout(() => noteEl.classList.remove('highlighted-note'), 2000);
          }
        });

        parentWrapper.appendChild(marker);
      });

      // Bind click on image for Drop Pin mode
      if (!parentWrapper.__pinClickBound) {
        parentWrapper.__pinClickBound = true;
        parentWrapper.addEventListener('click', (e) => {
          if (!isPinModeActive) return;

          const rect = imageElement.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;

          if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) return;

          const xPercent = (clickX / rect.width) * 100;
          const yPercent = (clickY / rect.height) * 100;

          const noteText = prompt('Enter annotation text for this pin:');
          if (noteText && noteText.trim()) {
            annotationsService.addAnnotation(fileId, {
              text: noteText.trim(),
              tag: selectedTag,
              author: currentUserName,
              type: 'pin',
              xPercent,
              yPercent,
            });
            toast.success('Visual pin placed on image!');
            render();
          }
        });
      }
    };

    render();
  },
};
