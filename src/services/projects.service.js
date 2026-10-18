import { getSupabase } from '../lib/supabase.js';
import { authService } from './auth.service.js';

export const projectsService = {
  async getProjects() {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*, files(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }

    return (data || []).map((proj) => ({
      ...proj,
      fileCount: proj.files?.[0]?.count || 0,
    }));
  },

  async createProject(name, description = '', color = '#2563eb') {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('You must be logged in to create a project');

    if (!name || name.trim() === '') {
      throw new Error('Project name cannot be empty');
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim(),
        color,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProject(id, { name, description, color }) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (color !== undefined) updates.color = color;

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProject(id) {
    const supabase = getSupabase();
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  },
};
