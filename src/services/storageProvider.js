// ==============================================================================
// Altrivelle Linker — Unified Storage Provider Abstraction (BYOS)
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { getSupabase } from '../lib/supabase.js';
import { APP_CONFIG } from '../config.js';

export class BaseStorageProvider {
  constructor(name) {
    this.name = name;
  }

  async upload(file, storagePath, onProgress) {
    throw new Error('upload() must be implemented by storage provider');
  }

  async getSignedDownloadUrl(storagePath, fileName, expiresInSeconds = 60) {
    throw new Error('getSignedDownloadUrl() must be implemented by storage provider');
  }

  async getSignedPreviewUrl(storagePath, expiresInSeconds = 300) {
    throw new Error('getSignedPreviewUrl() must be implemented by storage provider');
  }

  async delete(storagePath) {
    throw new Error('delete() must be implemented by storage provider');
  }

  async getMetadata(storagePath) {
    throw new Error('getMetadata() must be implemented by storage provider');
  }
}

// 1. Supabase Storage Provider (Default)
export class SupabaseStorageProvider extends BaseStorageProvider {
  constructor(bucket = APP_CONFIG.storageBucket) {
    super('supabase');
    this.bucket = bucket;
  }

  async upload(file, storagePath, onProgress) {
    const supabase = getSupabase();
    if (onProgress) onProgress(20);

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    if (onProgress) onProgress(90);

    return {
      path: storagePath,
      bucket: this.bucket,
      provider: 'supabase',
      size: file.size,
      mimeType: file.type,
    };
  }

  async getSignedDownloadUrl(storagePath, fileName, expiresInSeconds = 60) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds, {
        download: fileName || true,
      });

    if (error) throw error;
    return data.signedUrl;
  }

  async getSignedPreviewUrl(storagePath, expiresInSeconds = 300) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  }

  async delete(storagePath) {
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([storagePath]);

    if (error) throw error;
    return true;
  }

  async getMetadata(storagePath) {
    return {
      bucket: this.bucket,
      provider: 'supabase',
      storagePath,
    };
  }
}

// Factory to resolve storage provider based on configuration
export function getStorageProvider(providerType = 'supabase') {
  switch (providerType.toLowerCase()) {
    case 'supabase':
    default:
      return new SupabaseStorageProvider();
  }
}

export const defaultStorage = getStorageProvider(APP_CONFIG.defaultStorageProvider);
