import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Project, Interview, Story, Force, ForceGroup, ForceType, MatrixEntry } from '../lib/database.types';

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  interviews: Interview[];
  stories: Story[];
  forces: Force[];
  forceGroups: ForceGroup[];
  matrixEntries: MatrixEntry[];
  loading: boolean;
  
  // Project operations
  fetchProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  setCurrentProject: (project: Project) => void;
  
  // Interview operations
  fetchInterviews: (projectId: string) => Promise<void>;
  createInterview: (data: Partial<Interview>) => Promise<Interview>;
  
  // Story operations
  fetchStories: (projectId: string) => Promise<void>;
  createStory: (data: Partial<Story>) => Promise<Story>;
  updateStory: (id: string, data: Partial<Story>) => Promise<void>;
  
  // Force operations
  fetchForces: (projectId: string) => Promise<void>;
  createForce: (storyId: string, type: ForceType, description: string) => Promise<Force>;
  updateForce: (id: string, data: Partial<Force>) => Promise<void>;
  deleteForce: (id: string) => Promise<void>;
  
  // Force group operations
  fetchForceGroups: (projectId: string) => Promise<void>;
  createForceGroup: (projectId: string, name: string, type: 'push' | 'pull') => Promise<ForceGroup>;
  updateForceGroup: (id: string, data: Partial<ForceGroup>) => Promise<void>;
  assignForceToGroup: (forceId: string, groupId: string | null) => Promise<void>;
  
  // Matrix operations
  fetchMatrixEntries: (projectId: string) => Promise<void>;
  createMatrixEntry: (data: Partial<MatrixEntry>) => Promise<MatrixEntry>;
  updateMatrixEntry: (id: string, data: Partial<MatrixEntry>) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projects: [],
  interviews: [],
  stories: [],
  forces: [],
  forceGroups: [],
  matrixEntries: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      // First get all projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Then get all unique owner IDs
      const ownerIds = [...new Set(projects?.map(p => p.owner_id) || [])];
      
      // Fetch profiles for all owners
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds);

      if (profilesError) throw profilesError;

      // Create a map of owner_id to full_name
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Combine projects with profile data
      const projectsWithProfiles = projects?.map(project => ({
        ...project,
        profiles: {
          full_name: profileMap.get(project.owner_id) || 'Usuario Desconocido'
        }
      })) || [];

      set({ projects: projectsWithProfiles });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({ projects: [] });
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (name: string, description?: string) => {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ 
        name, 
        description,
        owner_id: user.id
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Get the creator's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('Could not fetch creator profile:', profileError);
    }

    // Combine project with profile data
    const projectWithProfile = {
      ...project,
      profiles: {
        full_name: profile?.full_name || 'Usuario'
      }
    };
    
    const { projects } = get();
    set({ projects: [projectWithProfile, ...projects] });
    
    return projectWithProfile;
  },

  setCurrentProject: (project: Project) => {
    set({ currentProject: project });
  },

  fetchInterviews: async (projectId: string) => {
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ interviews: data || [] });
  },

  createInterview: async (data: Partial<Interview>) => {
    const { data: interview, error } = await supabase
      .from('interviews')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    const { interviews } = get();
    set({ interviews: [interview, ...interviews] });
    
    return interview;
  },

  fetchStories: async (projectId: string) => {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        interviews!inner(project_id)
      `)
      .eq('interviews.project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ stories: data || [] });
  },

  createStory: async (data: Partial<Story>) => {
    const { data: story, error } = await supabase
      .from('stories')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    const { stories } = get();
    set({ stories: [story, ...stories] });
    
    return story;
  },

  updateStory: async (id: string, data: Partial<Story>) => {
    const { error } = await supabase
      .from('stories')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    
    const { stories } = get();
    set({ 
      stories: stories.map(s => s.id === id ? { ...s, ...data } : s)
    });
  },

  fetchForces: async (projectId: string) => {
    const { data, error } = await supabase
      .from('forces')
      .select(`
        *,
        stories!inner(
          interviews!inner(project_id)
        )
      `)
      .eq('stories.interviews.project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ forces: data || [] });
  },

  createForce: async (storyId: string, type: ForceType, description: string) => {
    const { data: force, error } = await supabase
      .from('forces')
      .insert({ story_id: storyId, type, description })
      .select()
      .single();

    if (error) throw error;
    
    const { forces } = get();
    set({ forces: [force, ...forces] });
    
    return force;
  },

  updateForce: async (id: string, data: Partial<Force>) => {
    const { error } = await supabase
      .from('forces')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    
    const { forces } = get();
    set({ 
      forces: forces.map(f => f.id === id ? { ...f, ...data } : f)
    });
  },

  deleteForce: async (id: string) => {
    const { error } = await supabase
      .from('forces')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    const { forces } = get();
    set({ forces: forces.filter(f => f.id !== id) });
  },

  fetchForceGroups: async (projectId: string) => {
    const { data, error } = await supabase
      .from('force_groups')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) throw error;
    set({ forceGroups: data || [] });
  },

  createForceGroup: async (projectId: string, name: string, type: 'push' | 'pull') => {
    // Set is_leftover to true if name contains "leftover"
    const isLeftover = name.toLowerCase().includes('leftover');
    
    const { data: group, error } = await supabase
      .from('force_groups')
      .insert({ 
        project_id: projectId, 
        name, 
        type,
        is_leftover: isLeftover
      })
      .select()
      .single();

    if (error) throw error;
    
    const { forceGroups } = get();
    set({ forceGroups: [...forceGroups, group] });
    
    return group;
  },

  updateForceGroup: async (id: string, data: Partial<ForceGroup>) => {
    const { error } = await supabase
      .from('force_groups')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    
    const { forceGroups } = get();
    set({ 
      forceGroups: forceGroups.map(g => g.id === id ? { ...g, ...data } : g)
    });
  },

  assignForceToGroup: async (forceId: string, groupId: string | null) => {
    const { error } = await supabase
      .from('forces')
      .update({ group_id: groupId, updated_at: new Date().toISOString() })
      .eq('id', forceId);

    if (error) throw error;
    
    const { forces } = get();
    set({ 
      forces: forces.map(f => f.id === forceId ? { ...f, group_id: groupId } : f)
    });
  },

  fetchMatrixEntries: async (projectId: string) => {
    const { data, error } = await supabase
      .from('story_group_matrix')
      .select(`
        *,
        stories!inner(
          interviews!inner(project_id)
        )
      `)
      .eq('stories.interviews.project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ matrixEntries: data || [] });
  },

  createMatrixEntry: async (data: Partial<MatrixEntry>) => {
    const { data: entry, error } = await supabase
      .from('story_group_matrix')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    
    const { matrixEntries } = get();
    set({ matrixEntries: [entry, ...matrixEntries] });
    
    return entry;
  },

  updateMatrixEntry: async (id: string, data: Partial<MatrixEntry>) => {
    const { error } = await supabase
      .from('story_group_matrix')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    
    const { matrixEntries } = get();
    set({ 
      matrixEntries: matrixEntries.map(e => e.id === id ? { ...e, ...data } : e)
    });
  },
}));