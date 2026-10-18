import { getSupabase } from '../lib/supabase.js';
import { APP_CONFIG } from '../config.js';
import { authService } from './auth.service.js';

export const filesService = {
  async getFiles(options = {}) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { projectId, search, type, sortBy = 'created_at', sortOrder = 'desc' } = options;

    let query = supabase
      .from('files')
      .select('*, projects(id, name, color), share_links(id, token, expires_at, is_revoked, download_count)')
      .eq('user_id', user.id);

    if (projectId && projectId !== 'all') {
      if (projectId === 'unassigned') {
        query = query.is('project_id', null);
      } else {
        query = query.eq('project_id', projectId);
      }
    }

    if (search && search.trim() !== '') {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (error) {
      console.error('Error fetching files:', error);
      throw error;
    }

    let files = data || [];

    // Filter by category type if specified
    if (type && type !== 'all') {
      files = files.filter((f) => {
        const mime = (f.mime_type || '').toLowerCase();
        const ext = f.name.split('.').pop()?.toLowerCase() || '';

        if (type === 'images') {
          return mime.startsWith('image/');
        }
        if (type === 'documents') {
          return (
            mime.includes('pdf') ||
            mime.includes('word') ||
            mime.includes('document') ||
            mime.includes('text') ||
            ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'csv', 'xlsx'].includes(ext)
          );
        }
        if (type === 'media') {
          return mime.startsWith('video/') || mime.startsWith('audio/');
        }
        if (type === 'archives') {
          return (
            mime.includes('zip') ||
            mime.includes('tar') ||
            mime.includes('rar') ||
            mime.includes('compressed') ||
            ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)
          );
        }
        return true;
      });
    }

    return files;
  },

  async uploadFile(file, projectId = null, onProgress = null) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('You must be logged in to upload files');

    // 1. Validate file size (25MB limit)
    if (file.size > APP_CONFIG.maxUploadSizeBytes) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${APP_CONFIG.maxUploadSizeMB}MB`);
    }

    // 2. Validate quota against profile
    const profile = await authService.getProfile();
    if (profile) {
      const projectedTotal = (profile.storage_used || 0) + file.size;
      const quota = profile.storage_quota || APP_CONFIG.defaultQuotaBytes;
      if (projectedTotal > quota) {
        throw new Error(
          `Storage quota exceeded. Using ${(projectedTotal / (1024 * 1024)).toFixed(1)}MB of ${(quota / (1024 * 1024)).toFixed(1)}MB quota.`
        );
      }
    }

    // 3. Prepare secure owner-isolated storage path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12);
    const targetFolder = projectId || 'root';
    const storagePath = `${user.id}/${targetFolder}/${uniqueSuffix}-${sanitizedName}`;

    if (onProgress) onProgress(15);

    // 4. Upload to Supabase Storage private bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(APP_CONFIG.storageBucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (onProgress) onProgress(75);

    // 5. Insert file metadata record in PostgreSQL
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        is_public: false,
      })
      .select('*, projects(id, name, color)')
      .single();

    if (dbError) {
      // Clean up orphaned storage object
      await supabase.storage.from(APP_CONFIG.storageBucket).remove([storagePath]);
      throw new Error(`Database error saving file record: ${dbError.message}`);
    }

    if (onProgress) onProgress(100);

    return fileRecord;
  },

  async deleteFile(fileId, storagePath) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Delete from database first
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    // 2. Remove file from storage
    if (storagePath) {
      await supabase.storage.from(APP_CONFIG.storageBucket).remove([storagePath]);
    }

    return true;
  },

  async renameFile(fileId, newName) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    if (!newName || newName.trim() === '') {
      throw new Error('File name cannot be empty');
    }

    const { data, error } = await supabase
      .from('files')
      .update({ name: newName.trim() })
      .eq('id', fileId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFileProject(fileId, projectId) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('files')
      .update({ project_id: projectId || null })
      .eq('id', fileId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSignedDownloadUrl(storagePath, fileName) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(APP_CONFIG.storageBucket)
      .createSignedUrl(storagePath, 60, {
        download: fileName || true,
      });

    if (error) throw error;
    return data.signedUrl;
  },

  async getSignedPreviewUrl(storagePath) {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(APP_CONFIG.storageBucket)
      .createSignedUrl(storagePath, 300); // 5 min for preview

    if (error) throw error;
    return data.signedUrl;
  },

  async getStats() {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) {
      return {
        totalFiles: 0,
        totalBytes: 0,
        quotaBytes: APP_CONFIG.defaultQuotaBytes,
        projectCount: 0,
        publicCount: 0,
        privateCount: 0,
      };
    }

    try {
      const [filesResult, projectsResult, profileResult] = await Promise.allSettled([
        supabase.from('files').select('id, size_bytes, is_public').eq('user_id', user.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('storage_used, storage_quota').eq('id', user.id).maybeSingle(),
      ]);

      const files = (filesResult.status === 'fulfilled' && filesResult.value.data) || [];
      const totalFiles = files.length;
      const totalBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
      const publicCount = files.filter((f) => f.is_public).length;
      const privateCount = totalFiles - publicCount;
      const projectCount = (projectsResult.status === 'fulfilled' && projectsResult.value.count) || 0;
      const profile = (profileResult.status === 'fulfilled' && profileResult.value.data) || null;
      const quotaBytes = profile?.storage_quota || APP_CONFIG.defaultQuotaBytes;

      return {
        totalFiles,
        totalBytes,
        quotaBytes,
        projectCount,
        publicCount,
        privateCount,
      };
    } catch (err) {
      console.warn('getStats fallback:', err);
      return {
        totalFiles: 0,
        totalBytes: 0,
        quotaBytes: APP_CONFIG.defaultQuotaBytes,
        projectCount: 0,
        publicCount: 0,
        privateCount: 0,
      };
    }
  },
};
