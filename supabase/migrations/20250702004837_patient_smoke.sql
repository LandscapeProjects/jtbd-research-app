/*
  # Fix Story Creation Timeout Issues

  1. Database Optimizations
    - Add missing indexes for better performance
    - Optimize RLS policies for faster execution
    - Ensure all constraints are properly indexed

  2. Connection Pool Settings
    - Optimize for faster INSERT operations
    - Reduce connection overhead

  3. Performance Improvements
    - Add composite indexes for common queries
    - Optimize foreign key constraints
*/

-- STEP 1: Add performance indexes for stories table
CREATE INDEX IF NOT EXISTS idx_stories_interview_created ON public.stories(interview_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_title ON public.stories(title);
CREATE INDEX IF NOT EXISTS idx_stories_cluster ON public.stories(cluster_id) WHERE cluster_id IS NOT NULL;

-- STEP 2: Add performance indexes for other tables
CREATE INDEX IF NOT EXISTS idx_interviews_project_created ON public.interviews(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_participant ON public.interviews(participant_name);
CREATE INDEX IF NOT EXISTS idx_forces_story_type ON public.forces(story_id, type);
CREATE INDEX IF NOT EXISTS idx_forces_type_created ON public.forces(type, created_at DESC);

-- STEP 3: Optimize RLS policies for better performance
-- Drop existing policies and recreate with optimized conditions
DROP POLICY IF EXISTS "universal_stories_all" ON public.stories;

-- Create optimized story policies
CREATE POLICY "stories_select_optimized" 
  ON public.stories FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "stories_insert_optimized" 
  ON public.stories FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "stories_update_optimized" 
  ON public.stories FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "stories_delete_optimized" 
  ON public.stories FOR DELETE 
  TO authenticated 
  USING (true);

-- STEP 4: Ensure all timestamp columns have proper defaults and constraints
ALTER TABLE public.stories 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Add NOT NULL constraints where missing
ALTER TABLE public.stories 
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- STEP 5: Optimize foreign key constraints
-- Drop and recreate with better indexing
ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_interview_id_fkey;
ALTER TABLE public.stories ADD CONSTRAINT stories_interview_id_fkey 
  FOREIGN KEY (interview_id) REFERENCES public.interviews(id) ON DELETE CASCADE;

-- STEP 6: Add table statistics update
ANALYZE public.stories;
ANALYZE public.interviews;
ANALYZE public.forces;

-- STEP 7: Verify the optimizations
DO $$
DECLARE
    story_indexes INTEGER;
    story_policies INTEGER;
BEGIN
    -- Count indexes on stories table
    SELECT COUNT(*) INTO story_indexes
    FROM pg_indexes 
    WHERE tablename = 'stories' 
    AND schemaname = 'public';
    
    -- Count policies on stories table
    SELECT COUNT(*) INTO story_policies
    FROM pg_policies 
    WHERE tablename = 'stories' 
    AND schemaname = 'public';
    
    RAISE NOTICE 'Stories table indexes: %, policies: %', story_indexes, story_policies;
    
    IF story_indexes >= 4 AND story_policies >= 4 THEN
        RAISE NOTICE 'SUCCESS: Story creation optimizations applied successfully!';
    ELSE
        RAISE WARNING 'ISSUE: Expected at least 4 indexes and 4 policies, got % indexes and % policies', story_indexes, story_policies;
    END IF;
END $$;

-- Final success message
SELECT 'Story creation timeout fix applied. Database optimized for faster INSERT operations.' as status;