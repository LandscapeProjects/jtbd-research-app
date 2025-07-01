/*
  # Sync Missing Profiles from Auth Users

  1. Data Sync
    - Insert missing users from auth.users into profiles table
    - Use metadata for full_name or fallback to email prefix
    - Handle existing users gracefully

  2. Future Prevention
    - Create trigger to auto-create profiles on user signup
    - Ensure no users are left without profiles

  3. Data Sources Priority
    - raw_user_meta_data->>'full_name' (first choice)
    - raw_user_meta_data->>'name' (second choice)  
    - email prefix (fallback)
*/

-- Insert missing users from auth.users into profiles
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name', 
    split_part(au.email, '@', 1)
  ) as full_name,
  'researcher' as role,
  au.created_at,
  now() as updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.email IS NOT NULL;

-- Create function to auto-create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'researcher'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Verify the sync worked
DO $$
DECLARE
  auth_count integer;
  profile_count integer;
  missing_count integer;
BEGIN
  SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email IS NOT NULL;
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO missing_count 
  FROM auth.users au 
  LEFT JOIN public.profiles p ON au.id = p.id 
  WHERE p.id IS NULL AND au.email IS NOT NULL;
  
  RAISE NOTICE 'Auth users: %, Profiles: %, Missing: %', auth_count, profile_count, missing_count;
END $$;