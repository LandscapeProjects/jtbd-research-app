/*
  # Initial JTBD Research Database Schema

  1. New Tables
    - `profiles` - User profile information
    - `projects` - Research projects
    - `interviews` - Interview sessions
    - `stories` - Individual participant stories
    - `forces` - Force instances (push/pull/habit/anxiety)
    - `force_groups` - Grouped forces for analysis
    - `story_group_matrix` - Validation matrix entries

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Restrict access to project owners and collaborators

  3. Important Notes
    - Uses UUID primary keys for all entities
    - Includes proper foreign key relationships
    - Sets up color-coded force types
    - Includes clustering preparation fields
*/

-- Create profiles table for additional user info
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'researcher',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  participant_name text NOT NULL,
  participant_age integer CHECK (participant_age > 0 AND participant_age < 120),
  participant_gender text,
  interview_date date DEFAULT CURRENT_DATE,
  context text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  situation_a text NOT NULL, -- Current state
  situation_b text NOT NULL, -- Desired state
  cluster_id integer, -- For future clustering results
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create force_groups table
CREATE TABLE IF NOT EXISTS force_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('push', 'pull')),
  color text DEFAULT '#3B82F6',
  is_leftover boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forces table
CREATE TABLE IF NOT EXISTS forces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('push', 'pull', 'habit', 'anxiety')),
  description text NOT NULL,
  group_id uuid REFERENCES force_groups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create story_group_matrix table for validation
CREATE TABLE IF NOT EXISTS story_group_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES force_groups(id) ON DELETE CASCADE NOT NULL,
  matches boolean, -- TRUE/FALSE/NULL for skip
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(story_id, group_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forces ENABLE ROW LEVEL SECURITY;
ALTER TABLE force_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_group_matrix ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Interviews policies
CREATE POLICY "Users can manage interviews in own projects"
  ON interviews FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Stories policies
CREATE POLICY "Users can manage stories in own projects"
  ON stories FOR ALL
  TO authenticated
  USING (
    interview_id IN (
      SELECT interviews.id FROM interviews
      JOIN projects ON interviews.project_id = projects.id
      WHERE projects.owner_id = auth.uid()
    )
  );

-- Forces policies
CREATE POLICY "Users can manage forces in own projects"
  ON forces FOR ALL
  TO authenticated
  USING (
    story_id IN (
      SELECT stories.id FROM stories
      JOIN interviews ON stories.interview_id = interviews.id
      JOIN projects ON interviews.project_id = projects.id
      WHERE projects.owner_id = auth.uid()
    )
  );

-- Force groups policies
CREATE POLICY "Users can manage force groups in own projects"
  ON force_groups FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Matrix policies
CREATE POLICY "Users can manage matrix in own projects"
  ON story_group_matrix FOR ALL
  TO authenticated
  USING (
    story_id IN (
      SELECT stories.id FROM stories
      JOIN interviews ON stories.interview_id = interviews.id
      JOIN projects ON interviews.project_id = projects.id
      WHERE projects.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_interviews_project ON interviews(project_id);
CREATE INDEX IF NOT EXISTS idx_stories_interview ON stories(interview_id);
CREATE INDEX IF NOT EXISTS idx_forces_story ON forces(story_id);
CREATE INDEX IF NOT EXISTS idx_forces_group ON forces(group_id);
CREATE INDEX IF NOT EXISTS idx_force_groups_project ON force_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_matrix_story ON story_group_matrix(story_id);
CREATE INDEX IF NOT EXISTS idx_matrix_group ON story_group_matrix(group_id);