// ==============================================================================
// Altrivelle Linker — Smart Compression Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

const STORAGE_KEY_MODE = 'altrivelle_compression_mode';
const STORAGE_KEY_PRESET = 'altrivelle_compression_preset';

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
};

export const COMPRESSION_MODES = {
  ORIGINAL: 'original',
  SMART: 'smart_compress',
};

export const COMPRESSION_PRESETS = {
  balanced: {
    id: 'balanced',
    name: 'Smart Balanced',
    description: 'Optimal balance of crystal clarity & storage savings (60-80% smaller)',
    quality: 0.75,
    maxDimension: 1920,
  },
  high: {
    id: 'high',
    name: 'High Fidelity',
    description: 'Near-lossless preservation with subtle optimization (30-50% smaller)',
    quality: 0.88,
    maxDimension: 2560,
  },
  saver: {
    id: 'saver',
    name: 'Maximum Saver',
    description: 'Aggressive optimization for mobile networks & low quota (up to 90% smaller)',
    quality: 0.52,
    maxDimension: 1280,
  },
};

export const compressionService = {
  getMode() {
    try {
      const mode = storageAdapter.getItem(STORAGE_KEY_MODE);
      return mode === COMPRESSION_MODES.SMART ? COMPRESSION_MODES.SMART : COMPRESSION_MODES.ORIGINAL;
    } catch {
      return COMPRESSION_MODES.ORIGINAL;
    }
  },

  setMode(mode) {
    try {
      const validMode = mode === COMPRESSION_MODES.SMART ? COMPRESSION_MODES.SMART : COMPRESSION_MODES.ORIGINAL;
      storageAdapter.setItem(STORAGE_KEY_MODE, validMode);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('altrivelle:compression_mode_change', { detail: { mode: validMode } }));
      }
      return validMode;
    } catch {
      return mode;
    }
  },

  getPreset() {
    try {
      const presetKey = storageAdapter.getItem(STORAGE_KEY_PRESET);
      return COMPRESSION_PRESETS[presetKey] || COMPRESSION_PRESETS.balanced;
    } catch {
      return COMPRESSION_PRESETS.balanced;
    }
  },

  setPreset(presetKey) {
    try {
      if (COMPRESSION_PRESETS[presetKey]) {
        storageAdapter.setItem(STORAGE_KEY_PRESET, presetKey);
      }
    } catch (_) {}
  },

  isCompressibleImage(fileOrMime, fileName = '') {
    const mime = (typeof fileOrMime === 'string' ? fileOrMime : fileOrMime?.type || '').toLowerCase();
    const name = (typeof fileOrMime === 'object' ? fileOrMime?.name || fileName : fileName).toLowerCase();
    const ext = name.split('.').pop() || '';

    if (ext === 'svg' || mime.includes('svg')) return false;

    return (
      mime.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'ico'].includes(ext)
    );
  },

  isCompressibleText(fileOrMime, fileName = '') {
    const mime = (typeof fileOrMime === 'string' ? fileOrMime : fileOrMime?.type || '').toLowerCase();
    const name = (typeof fileOrMime === 'object' ? fileOrMime?.name || fileName : fileName).toLowerCase();
    const ext = name.split('.').pop() || '';

    return (
      mime.startsWith('text/') ||
      mime.includes('json') ||
      ['json', 'txt', 'csv', 'md', 'js', 'css', 'html', 'xml', 'yaml', 'yml'].includes(ext)
    );
  },

  /**
   * Compresses an image file or blob client-side using Canvas.
   * Never degrades file if output is somehow larger than original.
   */
  async compressImage(file, options = {}) {
    const preset = options.preset ? COMPRESSION_PRESETS[options.preset] || COMPRESSION_PRESETS.balanced : this.getPreset();
    const quality = options.quality ?? preset.quality;
    const maxDimension = options.maxDimension ?? preset.maxDimension;
    const targetFormat = options.targetFormat || (file.type === 'image/png' ? 'image/webp' : file.type || 'image/jpeg');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Scale dimensions if larger than max
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas 2D context not available'));
          }

          // Fill white background for transparent PNG converted to JPEG
          if (targetFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Image compression conversion failed'));
              }

              const originalBytes = file.size || 0;
              const compressedBytes = blob.size;

              // If compressed size is larger, keep original
              if (compressedBytes >= originalBytes && originalBytes > 0) {
                const previewUrl = URL.createObjectURL(file);
                return resolve({
                  file: file,
                  originalBytes,
                  compressedBytes: originalBytes,
                  savedBytes: 0,
                  savedPercent: '0%',
                  ratio: 1,
                  isOptimized: false,
                  previewUrl,
                  width: img.width,
                  height: img.height,
                  developer: 'ALTRIVELLE TECHNOLOGIES',
                });
              }

              // Determine output name
              const originalName = file.name || 'image';
              const nameParts = originalName.split('.');
              let ext = targetFormat === 'image/webp' ? 'webp' : targetFormat === 'image/png' ? 'png' : 'jpg';
              if (nameParts.length > 1) {
                nameParts.pop();
              }
              const newFileName = `${nameParts.join('.')}.${ext}`;

              const compressedFile = new File([blob], newFileName, {
                type: targetFormat,
                lastModified: Date.now(),
              });

              const savedBytes = Math.max(0, originalBytes - compressedBytes);
              const percentNum = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;
              const previewUrl = URL.createObjectURL(blob);

              resolve({
                file: compressedFile,
                originalBytes,
                compressedBytes,
                savedBytes,
                savedPercent: `${percentNum}%`,
                ratio: originalBytes > 0 ? (compressedBytes / originalBytes).toFixed(2) : 1,
                isOptimized: true,
                previewUrl,
                width,
                height,
                developer: 'ALTRIVELLE TECHNOLOGIES',
              });
            },
            targetFormat,
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = event.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Minifies text or JSON client-side
   */
  compressText(content, fileName = '') {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const originalBytes = new Blob([content]).size;

    let minified = content;

    try {
      if (ext === 'json') {
        minified = JSON.stringify(JSON.parse(content));
      } else {
        // Strip trailing whitespace & collapse empty duplicate lines
        minified = content
          .split('\n')
          .map((line) => line.trimEnd())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n');
      }
    } catch (_) {
      minified = content;
    }

    const compressedBytes = new Blob([minified]).size;
    const savedBytes = Math.max(0, originalBytes - compressedBytes);
    const percentNum = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

    return {
      content: minified,
      originalBytes,
      compressedBytes,
      savedBytes,
      savedPercent: `${percentNum}%`,
    };
  },
};
