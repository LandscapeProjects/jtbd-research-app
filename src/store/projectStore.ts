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
  refreshProfiles: () => Promise<void>; // Pure dynamic profile refresh
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

  fetchProjects: async () => {
    // Race condition guard
    const { isFetching } = get();
    if (isFetching) {
      console.log('⚠️ fetchProjects already in progress, skipping...');
      return;
    }

    console.log('Loading projects...');
    set({ loading: true, isFetching: true });
    
    try {
      // Stable projects query
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, owner_id, status, created_at')
        .limit(50)
        .order('created_at', { ascending: false });

      if (projectsError) {
        throw new Error(`Projects query failed: ${projectsError.message}`);
      }

      if (!projects?.length) {
        console.log('No projects found');
        set({ projects: [] });
        return;
      }

      // Extract owner IDs and query profiles
      const ownerIds = [...new Set(projects.map(p => p.owner_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
      }

      // Create profile map and combine with projects
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const projectsWithProfiles = projects.map(project => ({
        ...project,
        profiles: profileMap.get(project.owner_id) || null
      }));

      console.log(`Projects loaded: ${projectsWithProfiles.length}`);
      set({ projects: projectsWithProfiles });
      
    } catch (error: any) {
      console.error('Error loading projects:', error);
      set({ projects: [] });
    } finally {
      set({ loading: false, isFetching: false });
    }
  },

  refreshProfiles: async () => {
    const { projects, isFetching } = get();
    
    if (isFetching || !projects.length) {
      console.log('Cannot refresh profiles - store busy or no projects');
      return;
    }
    
    try {
      console.log('Refreshing profiles...');
      const ownerIds = [...new Set(projects.map(p => p.owner_id))];
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);
      
      if (error) {
        console.error('Profile refresh error:', error);
        return;
      }
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const updatedProjects = projects.map(project => ({
        ...project,
        profiles: profileMap.get(project.owner_id) || null
      }));
      
      set({ projects: updatedProjects });
      console.log('Profiles refreshed');
    } catch (error) {
      console.error('Profile refresh failed:', error);
    }
  },

  createProject: async (name: string, description?: string) => {
    console.log('🚀 Starting createProject...');
    console.log('📝 Project data:', { name, description });

    try {
      // STEP 1: Get authenticated user with multiple methods
      console.log('🔍 Step 1: Getting authenticated user...');
      
      // Method 1: Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('📋 Session result:', { 
        hasSession: !!sessionData.session,
        hasUser: !!sessionData.session?.user,
        userId: sessionData.session?.user?.id?.slice(0, 8) + '...',
        error: sessionError?.message || 'none'
      });

      // Method 2: Get current user (fallback)
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('👤 User result:', { 
        hasUser: !!userData.user,
        userId: userData.user?.id?.slice(0, 8) + '...',
        email: userData.user?.email,
        error: userError?.message || 'none'
      });

      // Determine which user ID to use
      const user = sessionData.session?.user || userData.user;
      
      if (!user) {
        console.error('❌ No authenticated user found');
        console.log('🔍 Session data:', sessionData);
        console.log('🔍 User data:', userData);
        throw new Error('User not authenticated - please log in again');
      }

      console.log('✅ Authenticated user found:', {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      });

      // STEP 2: Verify user exists in profiles table
      console.log('🔍 Step 2: Verifying user profile exists...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', user.id)
        .single();

      console.log('👤 Profile verification:', {
        found: !!profile,
        profileId: profile?.id?.slice(0, 8) + '...',
        fullName: profile?.full_name,
        error: profileError?.message || 'none'
      });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ Profile query error:', profileError);
        throw new Error(`Profile verification failed: ${profileError.message}`);
      }

      // STEP 3: Create project with explicit user ID
      console.log('🔍 Step 3: Creating project in database...');
      console.log('📝 Insert data:', {
        name,
        description: description || '',
        owner_id: user.id
      });

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({ 
          name, 
          description: description || '',
          owner_id: user.id
        })
        .select('id, name, description, owner_id, status, created_at')
        .single();

      console.log('📊 Insert result:', {
        success: !!newProject,
        projectId: newProject?.id?.slice(0, 8) + '...',
        ownerId: newProject?.owner_id?.slice(0, 8) + '...',
        error: insertError?.message || 'none'
      });

      if (insertError) {
        console.error('❌ Project creation failed:', insertError);
        console.log('🔍 Full error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`Failed to create project: ${insertError.message}`);
      }

      if (!newProject) {
        console.error('❌ No project returned from insert');
        throw new Error('Project creation failed - no data returned');
      }

      // STEP 4: Add profile to project and update store
      console.log('🔍 Step 4: Adding profile to project...');
      const projectWithProfile = {
        ...newProject,
        profiles: profile || null
      };

      console.log('✅ Project created successfully:', {
        id: projectWithProfile.id,
        name: projectWithProfile.name,
        owner: projectWithProfile.profiles?.full_name || 'No profile'
      });
      
      // Update store with new project
      const { projects } = get();
      set({ projects: [projectWithProfile, ...projects] });
      
      console.log('🎉 createProject completed successfully');
      return projectWithProfile;

    } catch (error: any) {
      console.error('💥 createProject failed:', error);
      console.log('🔍 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n')[0]
      });
      
      // Re-throw with user-friendly message
      if (error.message.includes('not authenticated')) {
        throw new Error('Please log in again to create a project');
      } else if (error.message.includes('RLS')) {
        throw new Error('Permission denied - please check your account access');
      } else {
        throw new Error(`Failed to create project: ${error.message}`);
      }
    }
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