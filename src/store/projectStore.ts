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

  // OPTIMIZED fetchProjects - removed expensive operations and excessive logging
  fetchProjects: async () => {
    set({ loading: true });
    try {
      console.log('🔍 Fetching projects...');
      
      // 1. Get projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      if (!projects?.length) {
        console.log('No projects found');
        set({ projects: [] });
        return;
      }

      // 2. Get unique owner IDs
      const ownerIds = [...new Set(projects.map(p => p.owner_id))];
      
      // 3. Get profiles (simplified - no individual queries loop)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      // 4. Create profile map
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // 5. Hardcoded fallback for known missing users (temporary fix)
      const knownUsers: Record<string, any> = {
        '1fad8220-918f-49b7-bc97-11570f4b6c9e': { 
          id: '1fad8220-918f-49b7-bc97-11570f4b6c9e', 
          full_name: 'Pedro Rodriguez', 
          email: 'pedro@avilatek.dev' 
        },
        '84451afe-546f-489d-80f0-1bfaa47242c3': { 
          id: '84451afe-546f-489d-80f0-1bfaa47242c3', 
          full_name: 'Guillermo Sosa', 
          email: 'guillermososa99@gmail.com' 
        }
      };

      // 6. Combine projects with profiles
      const projectsWithProfiles = projects.map(project => ({
        ...project,
        profiles: profileMap.get(project.owner_id) || knownUsers[project.owner_id] || null
      }));

      console.log(`✅ Loaded ${projectsWithProfiles.length} projects`);
      set({ projects: projectsWithProfiles });
      
    } catch (error) {
      console.error('Error in fetchProjects:', error);
      set({ projects: [] });
      throw error; // Re-throw for error boundary handling
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

    const { data, error } = await supabase
      .from('projects')
      .insert({ 
        name, 
        description,
        owner_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    
    // Get the profile for the new project
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    const projectWithProfile = {
      ...data,
      profiles: profile || null
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