// ==============================================================================
// Altrivelle Linker — Text Annotations & Review Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

const STORAGE_PREFIX = 'altrivelle_annotations_';

const memoryStore = new Map();

const storageAdapter = {
  getItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_) {}
    return memoryStore.get(key) || null;
  },
  setItem(key, val) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
        return;
      }
    } catch (_) {}
    memoryStore.set(key, val);
  },
  removeItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch (_) {}
    memoryStore.delete(key);
  },
};

export const ANNOTATION_TAGS = {
  general: { label: 'General Note', color: '#0ea5e9' },
  review: { label: 'Needs Review', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#10b981' },
  urgent: { label: 'Urgent Action', color: '#ef4444' },
  todo: { label: 'To-Do', color: '#8b5cf6' },
};

export const annotationsService = {
  getStorageKey(fileId) {
    return `${STORAGE_PREFIX}${fileId}`;
  },

  getAnnotations(fileId) {
    if (!fileId) return [];
    try {
      const data = storageAdapter.getItem(this.getStorageKey(fileId));
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Failed to load annotations:', err);
      return [];
    }
  },

  addAnnotation(fileId, data) {
    if (!fileId) throw new Error('File ID is required to add an annotation');
    if (!data.text || data.text.trim() === '') {
      throw new Error('Annotation text cannot be empty');
    }

    const current = this.getAnnotations(fileId);
    const newAnnotation = {
      id: crypto.randomUUID ? crypto.randomUUID() : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileId,
      author: data.author || 'Collaborator',
      text: data.text.trim(),
      type: data.type || 'note', // 'note' (sticky/feed) or 'pin' (visual coordinate)
      xPercent: typeof data.xPercent === 'number' ? Math.max(0, Math.min(100, data.xPercent)) : null,
      yPercent: typeof data.yPercent === 'number' ? Math.max(0, Math.min(100, data.yPercent)) : null,
      tag: data.tag || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newAnnotation, ...current];
    try {
      storageAdapter.setItem(this.getStorageKey(fileId), JSON.stringify(updated));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('altrivelle:annotation_added', { detail: { fileId, annotation: newAnnotation } }));
      }
    } catch (err) {
      console.error('Failed to save annotation:', err);
    }

    return newAnnotation;
  },

  updateAnnotation(fileId, annotationId, updates) {
    const list = this.getAnnotations(fileId);
    const idx = list.findIndex((a) => a.id === annotationId);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageAdapter.setItem(this.getStorageKey(fileId), JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('altrivelle:annotation_updated', { detail: { fileId, annotation: list[idx] } }));
    }
    return list[idx];
  },

  deleteAnnotation(fileId, annotationId) {
    const list = this.getAnnotations(fileId);
    const filtered = list.filter((a) => a.id !== annotationId);
    storageAdapter.setItem(this.getStorageKey(fileId), JSON.stringify(filtered));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('altrivelle:annotation_deleted', { detail: { fileId, annotationId } }));
    }
    return true;
  },

  exportToMarkdown(fileId, fileName = 'Document') {
    const list = this.getAnnotations(fileId);
    if (!list.length) return `# Annotations for ${fileName}\n\nNo annotations recorded yet.`;

    let md = `# Annotations & Review Notes\n`;
    md += `**Asset**: ${fileName}\n`;
    md += `**Exported**: ${new Date().toLocaleString()}\n`;
    md += `**Total Notes**: ${list.length}\n`;
    md += `**Engine**: Altrivelle Linker (ALTRIVELLE TECHNOLOGIES)\n\n---\n\n`;

    list.forEach((note, index) => {
      const pinLoc = note.type === 'pin' && note.xPercent !== null ? ` (Visual Pin at X: ${Math.round(note.xPercent)}%, Y: ${Math.round(note.yPercent)}%)` : '';
      const tagLabel = ANNOTATION_TAGS[note.tag]?.label || note.tag;
      md += `### #${index + 1} [${tagLabel}]${pinLoc}\n`;
      md += `*Author:* ${note.author} &bull; *Date:* ${new Date(note.createdAt).toLocaleString()}\n\n`;
      md += `${note.text}\n\n`;
    });

    return md;
  },

  /**
   * Burns visual pins directly onto image canvas for export
   */
  async burnAnnotationsToCanvas(imgElement, annotations) {
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth || imgElement.width || 1200;
    canvas.height = imgElement.naturalHeight || imgElement.height || 800;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // Draw base image
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // Draw visual pin annotations
    const pinNotes = annotations.filter((a) => a.type === 'pin' && a.xPercent !== null);

    pinNotes.forEach((pin, i) => {
      const px = (pin.xPercent / 100) * canvas.width;
      const py = (pin.yPercent / 100) * canvas.height;
      const tagInfo = ANNOTATION_TAGS[pin.tag] || ANNOTATION_TAGS.general;

      // Glow circle
      ctx.save();
      ctx.shadowColor = tagInfo.color;
      ctx.shadowBlur = 12;

      // Pin circle
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fillStyle = tagInfo.color;
      ctx.fill();

      // White inner ring
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Number text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), px, py);

      // Label callout pill
      const calloutText = `${i + 1}. ${pin.text.slice(0, 32)}${pin.text.length > 32 ? '...' : ''}`;
      ctx.font = '12px system-ui, sans-serif';
      const textMetrics = ctx.measureText(calloutText);
      const pillW = textMetrics.width + 16;
      const pillH = 22;
      const pillX = Math.min(canvas.width - pillW - 10, Math.max(10, px - pillW / 2));
      const pillY = Math.max(10, py - 32);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = tagInfo.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(calloutText, pillX + 8, pillY + pillH / 2);

      ctx.restore();
    });

    // Branding banner at bottom
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Protected & Annotated via Altrivelle Linker • ALTRIVELLE TECHNOLOGIES', 16, canvas.height - 15);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  },
};
