/*
  # Fix RLS Policies for Universal Access

  1. Policy Changes
    - Drop all existing restrictive policies
    - Create universal access policies for all authenticated users
    - Enable team collaboration across all projects

  2. Security
    - Maintain authentication requirement
    - Allow all authenticated users to access all data
    - Remove owner-based restrictions
*/

-- First, drop ALL existing policies that might be restrictive
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies on our tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'projects', 'interviews', 'stories', 'forces', 'force_groups', 'story_group_matrix')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
    END LOOP;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.force_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_group_matrix ENABLE ROW LEVEL SECURITY;

-- Create TRUE universal access policies using auth.role() = 'authenticated'
-- This ensures ANY authenticated user can access ALL data

-- PROFILES: Universal access for all authenticated users
CREATE POLICY "universal_profiles_select" 
  ON public.profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "universal_profiles_insert" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "universal_profiles_update" 
  ON public.profiles FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- PROJECTS: Universal CRUD access for all authenticated users
CREATE POLICY "universal_projects_select" 
  ON public.projects FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "universal_projects_insert" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "universal_projects_update" 
  ON public.projects FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "universal_projects_delete" 
  ON public.projects FOR DELETE 
  USING (auth.role() = 'authenticated');

-- INTERVIEWS: Universal access
CREATE POLICY "universal_interviews_all" 
  ON public.interviews FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- STORIES: Universal access
CREATE POLICY "universal_stories_all" 
  ON public.stories FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- FORCES: Universal access
CREATE POLICY "universal_forces_all" 
  ON public.forces FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- FORCE_GROUPS: Universal access
CREATE POLICY "universal_force_groups_all" 
  ON public.force_groups FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- STORY_GROUP_MATRIX: Universal access
CREATE POLICY "universal_matrix_all" 
  ON public.story_group_matrix FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify the policies were created correctly and test access
DO $$
DECLARE
    policy_count INTEGER;
    project_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Count policies created
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'projects', 'interviews', 'stories', 'forces', 'force_groups', 'story_group_matrix');
    
    RAISE NOTICE 'Total universal access policies created: %', policy_count;
    
    -- Test universal access to projects
    SELECT COUNT(*) INTO project_count FROM public.projects;
    RAISE NOTICE 'Universal access test - Total projects accessible: %', project_count;
    
    -- Test universal access to profiles
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    RAISE NOTICE 'Universal access test - Total profiles accessible: %', profile_count;
    
END $$;

-- Final success message
SELECT 'Universal access policies have been implemented. All authenticated users should now see ALL data.' as implementation_status;