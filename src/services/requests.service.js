// ==============================================================================
// Altrivelle Linker — FileLink DropBox (File Requests)
// Developed by ALTRIVELLE TECHNOLOGIES
// Receive files securely from external collaborators without requiring accounts
// ==============================================================================

import { getSupabase } from '../lib/supabase.js';
import { authService } from './auth.service.js';
import { generateSecureToken } from './share.service.js';
import { APP_CONFIG } from '../config.js';

export const fileRequestsService = {
  // Create a new File Request URL
  async createRequest({
    title,
    description = '',
    projectId = null,
    duration = '7d',
    maxSizeBytes = 25 * 1024 * 1024,
    maxSubmissions = 20,
    allowedTypes = 'all',
  }) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Authentication required to create a file request');

    const token = generateSecureToken(16);

    // Calculate expiration
    const now = new Date();
    if (duration === '1d') now.setDate(now.getDate() + 1);
    else if (duration === '7d') now.setDate(now.getDate() + 7);
    else if (duration === '30d') now.setDate(now.getDate() + 30);
    else now.setDate(now.getDate() + 7);

    const { data, error } = await supabase
      .from('file_requests')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        title: title.trim(),
        description: description.trim(),
        token,
        max_size_bytes: maxSizeBytes,
        max_submissions: maxSubmissions,
        submissions_count: 0,
        allowed_types: allowedTypes,
        expires_at: now.toISOString(),
        is_active: true,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating file request:', error);
      throw error;
    }

    return {
      ...data,
      requestUrl: `${window.location.origin}/request.html?token=${token}`,
    };
  },

  // Get all file requests for current user
  async getMyRequests() {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('file_requests')
      .select('*, projects(id, name, color), file_submissions(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching file requests:', error);
      throw error;
    }

    return (data || []).map((req) => ({
      ...req,
      requestUrl: `${window.location.origin}/request.html?token=${req.token}`,
      isExpired: req.expires_at ? new Date(req.expires_at) <= new Date() : false,
      submissions: req.file_submissions || [],
    }));
  },

  // Resolve request token for public submission landing page
  async resolveRequestToken(token) {
    const supabase = getSupabase();

    const { data: request, error } = await supabase
      .from('file_requests')
      .select('id, user_id, title, description, max_size_bytes, allowed_types, expires_at, is_active, submissions_count, max_submissions')
      .eq('token', token.trim())
      .single();

    if (error || !request) {
      return {
        valid: false,
        error: 'File request not found or invalid link',
      };
    }

    if (!request.is_active) {
      return {
        valid: false,
        error: 'This file request has been closed by the owner',
      };
    }

    if (request.expires_at && new Date(request.expires_at) <= new Date()) {
      return {
        valid: false,
        error: 'This file request has expired',
      };
    }

    if (request.max_submissions && request.submissions_count >= request.max_submissions) {
      return {
        valid: false,
        error: 'This file request has reached its maximum submission limit',
      };
    }

    return {
      valid: true,
      request,
      developer: 'ALTRIVELLE TECHNOLOGIES',
    };
  },

  // Submit file to an active request (unauthenticated contributor)
  async submitFileToRequest(token, file, contributorName, contributorEmail, onProgress) {
    const res = await this.resolveRequestToken(token);
    if (!res.valid) throw new Error(res.error);

    const request = res.request;

    // Check size limit
    if (file.size > request.max_size_bytes) {
      throw new Error(`File exceeds allowed submission limit of ${(request.max_size_bytes / (1024 * 1024)).toFixed(0)} MB`);
    }

    const supabase = getSupabase();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12);
    const storagePath = `${request.user_id}/requests/${request.id}/${uniqueSuffix}-${sanitizedName}`;

    if (onProgress) onProgress(20);

    // 1. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.storageBucket)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (onProgress) onProgress(80);

    // 2. Insert into file_submissions table
    const { data: submission, error: subError } = await supabase
      .from('file_submissions')
      .insert({
        request_id: request.id,
        user_id: request.user_id,
        contributor_name: contributorName?.trim() || 'Anonymous Contributor',
        contributor_email: contributorEmail?.trim() || null,
        file_name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
      })
      .select('*')
      .single();

    if (subError) {
      console.warn('Submission record warning:', subError);
    }

    // 3. Increment request submissions count
    await supabase.rpc('increment_request_submission', { p_request_id: request.id });

    if (onProgress) onProgress(100);

    return {
      success: true,
      fileName: file.name,
      contributorName,
      developer: 'ALTRIVELLE TECHNOLOGIES',
    };
  },

  // Close or delete a request
  async closeRequest(requestId) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('file_requests')
      .update({ is_active: false })
      .eq('id', requestId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  },

  async deleteRequest(requestId) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('file_requests')
      .delete()
      .eq('id', requestId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  },
};
