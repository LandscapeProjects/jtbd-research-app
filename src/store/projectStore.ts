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
  isFetching: boolean;
  
  // Project operations
  fetchProjects: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
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
  
  // Error recovery
  resetAllStores: () => void;
  clearAuthErrors: () => Promise<void>;
}

// Enhanced creation helper with aggressive timeout and connection management
const createEntityWithRetry = async <T>(
  tableName: string,
  data: any,
  entityType: string,
  retries: number = 3
): Promise<T> => {
  console.log(`📝 Creating ${entityType} with data:`, data);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 ${entityType} creation attempt ${attempt}/${retries}`);
      
      // STEP 1: Verify auth state with timeout
      console.log(`🔍 Verifying auth for ${entityType}...`);
      const authPromise = supabase.auth.getUser();
      const authTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth verification timeout')), 10000);
      });
      
      const { data: { user }, error: authError } = await Promise.race([authPromise, authTimeout]);
      
      if (authError || !user) {
        throw new Error(`Authentication required for ${entityType} creation`);
      }
      
      console.log(`✅ Auth verified for ${entityType} creation`);
      
      // STEP 2: Create with aggressive timeout and connection management
      console.log(`🚀 Executing ${entityType} INSERT operation...`);
      
      // Create the Supabase query
      const insertQuery = supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();
      
      // Set up aggressive timeout (8 seconds instead of 15)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error(`⏰ ${entityType} creation timeout after 8 seconds`);
          reject(new Error(`${entityType} creation timeout - operation took too long`));
        }, 8000);
      });

      // Race the query against timeout
      const result = await Promise.race([insertQuery, timeoutPromise]);
      
      // Check for errors
      if (result.error) {
        console.error(`❌ ${entityType} creation failed (attempt ${attempt}):`, result.error);
        
        // If it's the last attempt, throw the error
        if (attempt === retries) {
          throw new Error(`${entityType} creation failed: ${result.error.message}`);
        }
        
        // Wait before retry with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Check for data
      if (!result.data) {
        throw new Error(`${entityType} creation returned no data`);
      }

      console.log(`✅ ${entityType} created successfully on attempt ${attempt}:`, result.data);
      return result.data;
      
    } catch (error: any) {
      console.error(`💥 ${entityType} creation error (attempt ${attempt}):`, error);
      
      // If it's a timeout error and not the last attempt, try again immediately
      if (error.message.includes('timeout') && attempt < retries) {
        console.log(`🔄 Timeout detected, retrying immediately...`);
        continue;
      }
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw new Error(`${entityType} creation failed after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`${entityType} creation failed after ${retries} attempts`);
};

// Alternative direct creation method for stories (bypass the helper if needed)
const createStoryDirect = async (data: any): Promise<Story> => {
  console.log('🎯 Using direct story creation method...');
  
  try {
    // Verify auth first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    console.log('📝 Direct story insert with data:', data);
    
    // Use the most basic insert possible
    const { data: story, error } = await supabase
      .from('stories')
      .insert(data)
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ Direct story creation failed:', error);
      throw error;
    }
    
    if (!story) {
      throw new Error('No story data returned');
    }
    
    console.log('✅ Direct story creation successful:', story);
    return story;
    
  } catch (error) {
    console.error('💥 Direct story creation error:', error);
    throw error;
  }
};

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
    const { isFetching } = get();
    if (isFetching) {
      console.log('⚠️ fetchProjects already in progress, skipping...');
      return;
    }

    console.log('Loading projects...');
    set({ loading: true, isFetching: true });
    
    try {
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

      const ownerIds = [...new Set(projects.map(p => p.owner_id))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
      }

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
    
    try {
      // Verify authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated - please log in again');
      }

      console.log('✅ Authenticated user found:', user.id);

      // Prepare project data with all required fields
      const projectData = {
        name: name.trim(),
        description: description?.trim() || '',
        owner_id: user.id,
        status: 'active'
      };

      console.log('📝 Creating project with data:', projectData);

      // Use universal creation helper
      const project = await createEntityWithRetry<Project>('projects', projectData, 'Project');

      // Get profile for display
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', user.id)
        .single();

      const projectWithProfile = { ...project, profiles: profile };
      
      // Update store
      set((state) => ({
        projects: [projectWithProfile, ...state.projects]
      }));
      
      console.log('🎉 createProject completed successfully');
      return projectWithProfile;

    } catch (error: any) {
      console.error('💥 createProject failed:', error);
      throw new Error(`Failed to create project: ${error.message}`);
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
    console.log('🎤 Starting createInterview...');
    
    try {
      // Prepare interview data with all required fields
      const interviewData = {
        project_id: data.project_id,
        participant_name: data.participant_name?.trim() || '',
        participant_age: data.participant_age || null,
        participant_gender: data.participant_gender || null,
        interview_date: data.interview_date || new Date().toISOString().split('T')[0],
        context: data.context?.trim() || ''
      };

      console.log('📝 Creating interview with data:', interviewData);

      // Use universal creation helper
      const interview = await createEntityWithRetry<Interview>('interviews', interviewData, 'Interview');
      
      // Update store
      set((state) => ({
        interviews: [interview, ...state.interviews]
      }));
      
      console.log('🎉 createInterview completed successfully');
      return interview;

    } catch (error: any) {
      console.error('💥 createInterview failed:', error);
      throw new Error(`Failed to create interview: ${error.message}`);
    }
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
    console.log('📖 Starting createStory...');
    
    try {
      // Prepare story data with all required fields
      const storyData = {
        interview_id: data.interview_id,
        title: data.title?.trim() || '',
        description: data.description?.trim() || '',
        situation_a: data.situation_a?.trim() || '',
        situation_b: data.situation_b?.trim() || '',
        cluster_id: null
      };

      console.log('📝 Creating story with data:', storyData);

      // Try the universal creation helper first
      let story: Story;
      try {
        console.log('🔄 Attempting story creation with retry helper...');
        story = await createEntityWithRetry<Story>('stories', storyData, 'Story');
      } catch (retryError) {
        console.log('⚠️ Retry helper failed, trying direct method...', retryError);
        // Fallback to direct creation
        story = await createStoryDirect(storyData);
      }
      
      // Update store
      set((state) => ({
        stories: [story, ...state.stories]
      }));
      
      console.log('🎉 createStory completed successfully');
      return story;

    } catch (error: any) {
      console.error('💥 createStory failed:', error);
      throw new Error(`Failed to create story: ${error.message}`);
    }
  },

  updateStory: async (id: string, data: Partial<Story>) => {
    console.log('🔄 Updating story:', id);
    
    try {
      const { error } = await supabase
        .from('stories')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('❌ Story update failed:', error);
        throw error;
      }

      console.log('✅ Story updated successfully');
      
      set((state) => ({
        stories: state.stories.map(s => s.id === id ? { ...s, ...data } : s)
      }));
      
    } catch (error) {
      console.error('💥 updateStory error:', error);
      throw error;
    }
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
    console.log('🔥 Starting createForce...');
    
    try {
      const forceData = {
        story_id: storyId,
        type,
        description: description.trim()
      };

      console.log('📝 Creating force with data:', forceData);

      // Use universal creation helper
      const force = await createEntityWithRetry<Force>('forces', forceData, 'Force');
      
      // Update store
      set((state) => ({
        forces: [force, ...state.forces]
      }));
      
      console.log('🎉 createForce completed successfully');
      return force;

    } catch (error: any) {
      console.error('💥 createForce failed:', error);
      throw new Error(`Failed to create force: ${error.message}`);
    }
  },

  updateForce: async (id: string, data: Partial<Force>) => {
    console.log('🔄 Updating force:', id);
    
    try {
      const { error } = await supabase
        .from('forces')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('❌ Force update failed:', error);
        throw error;
      }

      console.log('✅ Force updated successfully');
      
      set((state) => ({
        forces: state.forces.map(f => f.id === id ? { ...f, ...data } : f)
      }));
      
    } catch (error) {
      console.error('💥 updateForce error:', error);
      throw error;
    }
  },

  deleteForce: async (id: string) => {
    console.log('🗑️ Deleting force:', id);
    
    try {
      const { error } = await supabase
        .from('forces')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Force deletion failed:', error);
        throw error;
      }

      console.log('✅ Force deleted successfully');
      
      set((state) => ({
        forces: state.forces.filter(f => f.id !== id)
      }));
      
    } catch (error) {
      console.error('💥 deleteForce error:', error);
      throw error;
    }
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
    console.log('📊 Starting createForceGroup...');
    
    try {
      const isLeftover = name.toLowerCase().includes('leftover');
      
      const groupData = {
        project_id: projectId,
        name: name.trim(),
        type,
        is_leftover: isLeftover,
        color: '#3B82F6',
        position: 0
      };

      console.log('📝 Creating force group with data:', groupData);

      // Use universal creation helper
      const group = await createEntityWithRetry<ForceGroup>('force_groups', groupData, 'ForceGroup');
      
      // Update store
      set((state) => ({
        forceGroups: [...state.forceGroups, group]
      }));
      
      console.log('🎉 createForceGroup completed successfully');
      return group;

    } catch (error: any) {
      console.error('💥 createForceGroup failed:', error);
      throw new Error(`Failed to create force group: ${error.message}`);
    }
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
    console.log('📋 Starting createMatrixEntry...');
    
    try {
      const matrixData = {
        story_id: data.story_id,
        group_id: data.group_id,
        matches: data.matches
      };

      console.log('📝 Creating matrix entry with data:', matrixData);

      // Use universal creation helper
      const entry = await createEntityWithRetry<MatrixEntry>('story_group_matrix', matrixData, 'MatrixEntry');
      
      // Update store
      set((state) => ({
        matrixEntries: [entry, ...state.matrixEntries]
      }));
      
      console.log('🎉 createMatrixEntry completed successfully');
      return entry;

    } catch (error: any) {
      console.error('💥 createMatrixEntry failed:', error);
      throw new Error(`Failed to create matrix entry: ${error.message}`);
    }
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

  // Error recovery functions
  resetAllStores: () => {
    console.log('🔄 Resetting all stores due to persistent errors');
    set({
      currentProject: null,
      projects: [],
      interviews: [],
      stories: [],
      forces: [],
      forceGroups: [],
      matrixEntries: [],
      loading: false,
      isFetching: false
    });
  },

  clearAuthErrors: async () => {
    try {
      console.log('🔄 Clearing auth state...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Current session:', session ? 'Valid' : 'Invalid');
      
      if (!session) {
        console.log('⚠️ No valid session, redirecting to login');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('💥 Auth cleanup failed:', error);
      window.location.href = '/';
    }
  }
}));