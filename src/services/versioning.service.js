// ==============================================================================
// Altrivelle Linker — File Versioning & Provenance Engine
// Developed by ALTRIVELLE TECHNOLOGIES
// ==============================================================================

import { getSupabase } from '../lib/supabase.js';
import { authService } from './auth.service.js';
import { adaptiveTransferService } from './transfer.service.js';
import { APP_CONFIG } from '../config.js';

export const versioningService = {
  // Save a new version of an existing file
  async createNewVersion(fileId, newFile, onProgress) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Fetch current file
    const { data: currentFile, error: fetchErr } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !currentFile) throw new Error('File not found');

    // 2. Compute SHA-256 hash for provenance
    const sha256 = await adaptiveTransferService.calculateSHA256(newFile);

    // 3. Count existing versions to determine next version number
    const { count } = await supabase
      .from('file_versions')
      .select('*', { count: 'exact', head: true })
      .eq('file_id', fileId);

    const nextVersion = (count || 0) + 1;

    // 4. Archive current file state into file_versions if this is the first versioned update
    if (count === 0) {
      await supabase.from('file_versions').insert({
        file_id: fileId,
        user_id: user.id,
        version_number: 1,
        storage_path: currentFile.storage_path,
        size_bytes: currentFile.size_bytes,
        mime_type: currentFile.mime_type,
        created_at: currentFile.created_at,
      });
    }

    // 5. Upload new version file to storage
    const sanitized = newFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
    const newStoragePath = `${user.id}/${currentFile.project_id || 'root'}/v${nextVersion + 1}-${uniqueSuffix}-${sanitized}`;

    if (onProgress) onProgress(30);

    const { error: uploadErr } = await supabase.storage
      .from(APP_CONFIG.storageBucket)
      .upload(newStoragePath, newFile);

    if (uploadErr) throw uploadErr;
    if (onProgress) onProgress(80);

    // 6. Record new version snapshot
    await supabase.from('file_versions').insert({
      file_id: fileId,
      user_id: user.id,
      version_number: nextVersion + 1,
      storage_path: newStoragePath,
      size_bytes: newFile.size,
      mime_type: newFile.type || currentFile.mime_type,
      sha256_hash: sha256,
      created_at: new Date().toISOString(),
    });

    // 7. Update active file record
    const { data: updatedFile, error: updateErr } = await supabase
      .from('files')
      .update({
        storage_path: newStoragePath,
        size_bytes: newFile.size,
        mime_type: newFile.type || currentFile.mime_type,
        name: newFile.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (updateErr) throw updateErr;
    if (onProgress) onProgress(100);

    return {
      file: updatedFile,
      version: nextVersion + 1,
      sha256,
    };
  },

  // Get full version history of a file
  async getVersions(fileId) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('file_versions')
      .select('*')
      .eq('file_id', fileId)
      .eq('user_id', user.id)
      .order('version_number', { ascending: false });

    if (error) {
      console.warn('Could not fetch versions:', error);
      return [];
    }

    return data || [];
  },

  // Restore/rollback to an earlier version
  async restoreVersion(fileId, versionRecord) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('files')
      .update({
        storage_path: versionRecord.storage_path,
        size_bytes: versionRecord.size_bytes,
        mime_type: versionRecord.mime_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
