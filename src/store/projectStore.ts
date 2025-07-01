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
  isFetching: boolean; // Guard against concurrent calls
  
  // Project operations
  fetchProjects: () => Promise<void>;
  refreshProfiles: () => Promise<void>; // NEW: Pure dynamic profile refresh
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
  isFetching: false,

  // PURE DYNAMIC VERSION of fetchProjects - NO HARDCODED DATA
  fetchProjects: async () => {
    // KEEP: Race condition guard
    const { isFetching } = get();
    if (isFetching) {
      console.log('⚠️ fetchProjects already in progress, skipping...');
      return;
    }

    console.log('🔍 1. Starting pure dynamic fetchProjects...');
    set({ loading: true, isFetching: true });
    
    // Timeout promise with state cleanup
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.log('⏱️ fetchProjects timeout - cleaning up...');
        set({ loading: false, isFetching: false });
        reject(new Error('fetchProjects timeout after 10 seconds'));
      }, 10000);
    });

    const fetchPromise = async () => {
      try {
        console.log('🔍 2. Querying projects...');
        
        // KEEP: Stable projects query
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, description, owner_id, status, created_at')
          .limit(50)
          .order('created_at', { ascending: false });

        console.log('🔍 3. Projects result:', { 
          success: !!projects,
          count: projects?.length || 0,
          error: projectsError?.message || 'none'
        });

        if (projectsError) {
          throw new Error(`Projects query failed: ${projectsError.message}`);
        }

        if (!projects?.length) {
          console.log('📭 4. No projects found');
          set({ projects: [] });
          return;
        }

        console.log('🔍 4. Extracting owner IDs...');
        const ownerIds = [...new Set(projects.map(p => p.owner_id))];
        console.log('🔍 5. Owner IDs to query:', ownerIds.map(id => id.slice(0,8) + '...'));

        console.log('🔍 6. Querying profiles dynamically...');
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ownerIds);

        console.log('🔍 7. Profiles result:', { 
          success: !!profiles,
          requested: ownerIds.length,
          found: profiles?.length || 0,
          error: profilesError?.message || 'none'
        });

        if (profilesError) {
          console.error('❌ Profiles query error:', profilesError);
          // Continue without profiles rather than fail completely
        }

        console.log('🔍 8. Creating dynamic profile map...');
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        // Log what we found for each user
        ownerIds.forEach(id => {
          const profile = profileMap.get(id);
          console.log(`🔗 Owner ${id.slice(0,8)}... → ${profile ? `Found: ${profile.full_name}` : 'NOT FOUND'}`);
        });

        console.log('🔍 9. Combining projects with dynamic profiles...');
        const projectsWithProfiles = projects.map(project => {
          const profile = profileMap.get(project.owner_id);
          
          return {
            ...project,
            profiles: profile || null // PURE - only real data or null
          };
        });

        console.log('✅ 10. Success - pure dynamic data loaded');
        console.log(`📊 Projects: ${projectsWithProfiles.length}, Profiles found: ${profiles?.length || 0}`);
        
        set({ projects: projectsWithProfiles });
        
      } catch (error: any) {
        console.error('💥 Error in fetchProjects:', error);
        set({ projects: [] });
        throw error; // Re-throw to be caught by Promise.race
      }
    };

    try {
      await Promise.race([fetchPromise(), timeoutPromise]);
      console.log('✅ 11. fetchProjects completed successfully');
    } catch (error: any) {
      console.error('💥 fetchProjects failed/timed out:', error);
      set({ projects: [] });
    } finally {
      console.log('🔍 12. Cleanup - resetting flags');
      set({ loading: false, isFetching: false });
    }
  },

  // NEW: Pure dynamic profile refresh function
  refreshProfiles: async () => {
    const { projects, isFetching } = get();
    
    if (isFetching || !projects.length) {
      console.log('⚠️ Cannot refresh profiles - store busy or no projects');
      return;
    }
    
    try {
      console.log('🔄 Refreshing profiles from database...');
      const ownerIds = [...new Set(projects.map(p => p.owner_id))];
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);
      
      if (error) {
        console.error('❌ Profile refresh error:', error);
        return;
      }
      
      console.log(`🔄 Profile refresh: found ${profiles?.length || 0} of ${ownerIds.length} requested`);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const updatedProjects = projects.map(project => ({
        ...project,
        profiles: profileMap.get(project.owner_id) || null // Pure dynamic only
      }));
      
      set({ projects: updatedProjects });
      console.log('✅ Pure dynamic profiles refreshed');
    } catch (error) {
      console.error('💥 Profile refresh failed:', error);
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
    
    // Get the profile for the new project - PURE DYNAMIC
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    const projectWithProfile = {
      ...data,
      profiles: profile || null // Pure - only real data or null
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