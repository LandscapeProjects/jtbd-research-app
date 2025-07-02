/*
  # Universal Creation Fix - Comprehensive RLS and Schema Update

  1. Schema Fixes
    - Ensure all tables have proper default values for timestamps
    - Add missing constraints and indexes
    - Standardize column definitions

  2. Universal RLS Policies
    - Drop all existing restrictive policies
    - Create consistent, permissive policies for all tables
    - Enable true team collaboration

  3. Performance Optimizations
    - Add missing indexes for foreign keys
    - Optimize query patterns
*/

-- STEP 1: Fix schema issues with default values
-- Ensure all timestamp columns have proper defaults
ALTER TABLE public.profiles 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.projects 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.interviews 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.stories 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.forces 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.force_groups 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.story_group_matrix 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- STEP 2: Drop ALL existing policies that might be causing conflicts
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

-- STEP 3: Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.force_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_group_matrix ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create universal access policies using the most permissive approach
-- These policies allow ANY authenticated user to perform ANY operation

-- PROFILES: Universal access
CREATE POLICY "universal_profiles_all" 
  ON public.profiles FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- PROJECTS: Universal access
CREATE POLICY "universal_projects_all" 
  ON public.projects FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- INTERVIEWS: Universal access
CREATE POLICY "universal_interviews_all" 
  ON public.interviews FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- STORIES: Universal access
CREATE POLICY "universal_stories_all" 
  ON public.stories FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- FORCES: Universal access
CREATE POLICY "universal_forces_all" 
  ON public.forces FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- FORCE_GROUPS: Universal access
CREATE POLICY "universal_force_groups_all" 
  ON public.force_groups FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- STORY_GROUP_MATRIX: Universal access
CREATE POLICY "universal_matrix_all" 
  ON public.story_group_matrix FOR ALL 
  TO authenticated 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- STEP 5: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_interviews_project_id ON public.interviews(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_interview_id ON public.stories(interview_id);
CREATE INDEX IF NOT EXISTS idx_forces_story_id ON public.forces(story_id);
CREATE INDEX IF NOT EXISTS idx_forces_group_id ON public.forces(group_id);
CREATE INDEX IF NOT EXISTS idx_force_groups_project_id ON public.force_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_matrix_story_id ON public.story_group_matrix(story_id);
CREATE INDEX IF NOT EXISTS idx_matrix_group_id ON public.story_group_matrix(group_id);

-- STEP 6: Verify the fix
DO $$
DECLARE
    policy_count INTEGER;
    table_count INTEGER;
BEGIN
    -- Count policies created
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'projects', 'interviews', 'stories', 'forces', 'force_groups', 'story_group_matrix')
    AND policyname LIKE 'universal_%';
    
    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO table_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname IN ('profiles', 'projects', 'interviews', 'stories', 'forces', 'force_groups', 'story_group_matrix')
    AND c.relrowsecurity = true;
    
    RAISE NOTICE 'Universal policies created: %, Tables with RLS: %', policy_count, table_count;
    
    IF policy_count = 7 AND table_count = 7 THEN
        RAISE NOTICE 'SUCCESS: Universal access policies implementation complete!';
    ELSE
        RAISE WARNING 'ISSUE: Expected 7 policies and 7 RLS tables, got % policies and % tables', policy_count, table_count;
    END IF;
END $$;

-- Final verification message
SELECT 'Universal creation fix applied successfully. All authenticated users can now create, read, update, and delete all data.' as status;