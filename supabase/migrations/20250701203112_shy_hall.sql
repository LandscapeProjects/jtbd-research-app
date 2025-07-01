/*
  # Update RLS Policies for Team Access

  1. Policy Changes
    - Drop existing restrictive policies
    - Create universal access policies for all authenticated users
    - Enable team collaboration across all projects

  2. Security
    - Maintain authentication requirement
    - Allow all authenticated users to access all data
    - Remove owner-based restrictions
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Users can manage interviews in own projects" ON interviews;
DROP POLICY IF EXISTS "Users can manage stories in own projects" ON stories;
DROP POLICY IF EXISTS "Users can manage forces in own projects" ON forces;
DROP POLICY IF EXISTS "Users can manage force groups in own projects" ON force_groups;
DROP POLICY IF EXISTS "Users can manage matrix in own projects" ON story_group_matrix;

-- Create universal access policies for authenticated users
CREATE POLICY "universal_projects" ON projects 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "universal_interviews" ON interviews 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "universal_stories" ON stories 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "universal_forces" ON forces 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "universal_force_groups" ON force_groups 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "universal_matrix" ON story_group_matrix 
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);