// ==============================================================================
// Altrivelle Linker — High Performance QR Code & Visual Sharing Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import QRCode from 'qrcode';
import { formatBytes } from '../utils/formatters.js';

export const qrService = {
  /**
   * Generate raw QR Code Data URL (PNG)
   */
  async generateDataURL(text, options = {}) {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: options.width || 300,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#ffffff',
      },
    };

    return await QRCode.toDataURL(text, { ...defaultOptions, ...options });
  },

  /**
   * Render QR Code directly to an HTML5 <canvas>
   */
  async renderToCanvas(canvas, text, options = {}) {
    if (!canvas) throw new Error('Canvas element required');
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: options.width || 300,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#ffffff',
      },
    };

    return await QRCode.toCanvas(canvas, text, { ...defaultOptions, ...options });
  },

  /**
   * Generate High-Resolution Branded Sharing Card (Canvas export)
   * Perfect for saving, printing, or social sharing (WhatsApp/Telegram/Slack)
   */
  async generateBrandedShareCard(url, { fileName = 'Shared Asset', fileSize = null, expiryText = null }) {
    const cardWidth = 720;
    const cardHeight = 840;
    const canvas = document.createElement('canvas');
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const ctx = canvas.getContext('2d');

    // 1. Sleek Gradient Card Background
    const bgGrad = ctx.createLinearGradient(0, 0, cardWidth, cardHeight);
    bgGrad.addColorStop(0, '#0c101d');
    bgGrad.addColorStop(0.5, '#12192c');
    bgGrad.addColorStop(1, '#090d18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Subtle ambient glow
    const radialGlow = ctx.createRadialGradient(cardWidth / 2, 220, 20, cardWidth / 2, 220, 360);
    radialGlow.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    // Decorative Card Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, cardWidth - 32, cardHeight - 32);

    // 2. Header: Brand Logo & Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ALTRIVELLE LINKER', cardWidth / 2, 65);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('One Link. Smarter Sharing. • Secure File Transit', cardWidth / 2, 92);

    // 3. Render High-Density QR Code
    const qrDataUrl = await this.generateDataURL(url, {
      width: 380,
      margin: 1,
      errorCorrectionLevel: 'H',
      darkColor: '#0f172a',
      lightColor: '#ffffff',
    });

    const qrImage = new Image();
    await new Promise((resolve, reject) => {
      qrImage.onload = resolve;
      qrImage.onerror = reject;
      qrImage.src = qrDataUrl;
    });

    // White rounded card for QR
    const qrBoxSize = 420;
    const qrBoxX = (cardWidth - qrBoxSize) / 2;
    const qrBoxY = 125;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw QR image centered
    const qrInnerSize = 380;
    const qrInnerX = (cardWidth - qrInnerSize) / 2;
    const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
    ctx.drawImage(qrImage, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);

    // 4. File Info Box
    const infoY = 575;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(40, infoY, cardWidth - 80, 140, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // File name (truncated)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const displayFileName = fileName.length > 38 ? fileName.slice(0, 35) + '...' : fileName;
    ctx.fillText(displayFileName, cardWidth / 2, infoY + 40);

    // Metadata pill
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    let metaText = 'Scan with camera or QR reader to download';
    if (fileSize) {
      metaText = `Size: ${formatBytes(fileSize)} • ` + (expiryText ? `Expires: ${expiryText}` : 'Ready for Instant Download');
    }
    ctx.fillText(metaText, cardWidth / 2, infoY + 75);

    // Helper callout
    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('📱 Point mobile camera to scan & transfer instantly', cardWidth / 2, infoY + 110);

    // 5. Footer Attribution
    ctx.fillStyle = '#64748b';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Encrypted Transit • Developed by ALTRIVELLE TECHNOLOGIES', cardWidth / 2, cardHeight - 35);

    return canvas.toDataURL('image/png');
  },

  /**
   * Trigger browser file download of QR Image
   */
  downloadImage(dataUrl, fileName = 'filelink-qr.png') {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  /**
   * Copy image directly to system clipboard
   */
  async copyImageToClipboard(dataUrl) {
    if (!navigator.clipboard?.write) {
      throw new Error('Image clipboard copying not supported on this browser');
    }

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  },

  /**
   * Native device share sheet (Mobile / supported browsers)
   */
  async shareNative({ title = 'Shared File — Altrivelle Linker', text = 'Download file via Altrivelle Linker:', url }) {
    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    }
    return false;
  },
};
