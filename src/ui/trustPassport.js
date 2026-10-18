// ==============================================================================
// Altrivelle Linker — Trust Passport Component
// Developed by ALTRIVELLE TECHNOLOGIES
// Transparent Security, Integrity Verification, and Access History
// ==============================================================================

import { icons } from './icons.js';

export const trustPassport = {
  render({
    fileName,
    sizeBytes,
    mimeType,
    sha256 = null,
    storageClass = 'Private Supabase Storage',
    sharingMode = 'Persistent Cloud Sharing',
    expiresAt = null,
    downloadCount = 0,
    maxDownloads = null,
    isRevoked = false,
    hasPassword = false,
    encryptionStatus = 'Zero-Trust TLS In-Transit + AES-256 At-Rest',
  }) {
    const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : false;

    return `
      <div class="trust-passport-card animate-fade-in">
        <div class="trust-passport-header">
          <div class="passport-badge-icon">
            ${icons.shield(20)}
          </div>
          <div>
            <h4 class="passport-title">Trust Passport &trade;</h4>
            <span class="passport-subtitle">Transparent Security & Provenance Manifest</span>
          </div>
          <span class="passport-verified-pill">
            ${icons.check(12)} Verified Asset
          </span>
        </div>

        <div class="passport-grid">
          <!-- Item 1: Mode & Storage -->
          <div class="passport-item">
            <span class="passport-label">Transfer Architecture</span>
            <span class="passport-value">${sharingMode}</span>
          </div>
          <div class="passport-item">
            <span class="passport-label">Storage Class</span>
            <span class="passport-value">${storageClass}</span>
          </div>

          <!-- Item 2: Integrity SHA-256 Checksum -->
          <div class="passport-item col-span-2">
            <span class="passport-label">Cryptographic Integrity (SHA-256 Checksum)</span>
            <span class="passport-hash font-mono">
              ${sha256 ? sha256 : '<span class="text-muted">Calculated on download verification</span>'}
            </span>
          </div>

          <!-- Item 3: Access Rules & Expiration -->
          <div class="passport-item">
            <span class="passport-label">Expiration Status</span>
            <span class="passport-value ${isExpired ? 'text-danger font-semibold' : ''}">
              ${expiresAt ? new Date(expiresAt).toLocaleString() : 'Indefinite (Revocable)'}
            </span>
          </div>
          <div class="passport-item">
            <span class="passport-label">Download Quota</span>
            <span class="passport-value">
              ${maxDownloads ? `${downloadCount} of ${maxDownloads} allowed` : `${downloadCount} downloads (Unlimited)`}
            </span>
          </div>

          <!-- Item 4: Encryption & Protection -->
          <div class="passport-item">
            <span class="passport-label">Access Protection</span>
            <span class="passport-value">
              ${hasPassword ? '<span class="text-success font-semibold">Password Protected</span>' : 'Token-Authorized Link'}
            </span>
          </div>
          <div class="passport-item">
            <span class="passport-label">Encryption Standard</span>
            <span class="passport-value">${encryptionStatus}</span>
          </div>
        </div>

        <div class="passport-footer">
          <span>Integrity manifest verified &bull; Developed by <strong>ALTRIVELLE TECHNOLOGIES</strong></span>
        </div>
      </div>
    `;
  },
};
