// ==============================================================================
// Altrivelle Linker Configuration
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// "Send files. Receive files. Control access. Automate everything."
// ==============================================================================

import { SUBSCRIPTION_PLANS } from './config/plans.js';

export const APP_CONFIG = {
  appName: 'Altrivelle Linker',
  shortName: 'Linker',
  developer: 'ALTRIVELLE TECHNOLOGIES',
  tagline: 'One Link. Smarter Sharing.',
  coreMessage: 'Send files. Receive files. Control access. Automate everything.',
  companyWebsite: 'https://altrivelletechnologies.com',
  version: '1.2.0',
  year: '2026',

  // Supabase credentials
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL || '').trim(),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),

  // Storage Settings
  storageBucket: 'filelink-files',
  defaultStorageProvider: 'supabase', // 'supabase', 's3', 'r2', 'minio'

  // Limits
  maxUploadSizeBytes: (Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB) || 25) * 1024 * 1024,
  maxUploadSizeMB: Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB) || 25,
  defaultQuotaBytes: (Number(import.meta.env.VITE_DEFAULT_STORAGE_QUOTA_MB) || 100) * 1024 * 1024,
  defaultQuotaMB: Number(import.meta.env.VITE_DEFAULT_STORAGE_QUOTA_MB) || 100,

  // Plans reference
  plans: SUBSCRIPTION_PLANS,

  // Check if Supabase keys are configured
  isConfigured() {
    return (
      Boolean(this.supabaseUrl) &&
      Boolean(this.supabaseAnonKey) &&
      !this.supabaseUrl.includes('your-project-id') &&
      !this.supabaseAnonKey.includes('your-supabase')
    );
  },
};
