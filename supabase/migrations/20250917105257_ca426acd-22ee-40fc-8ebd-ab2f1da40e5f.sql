-- Fix security vulnerability in profiles table
-- Remove potentially insecure policies and create more restrictive ones

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create secure policies that explicitly require authentication
-- Only authenticated users can view their own profile
CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Only authenticated users can update their own profile
CREATE POLICY "Authenticated users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Only authenticated admins can view all profiles
CREATE POLICY "Authenticated admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND get_user_role(auth.uid()) = 'admin'::public.user_role
);

-- Only authenticated admins can create profiles
CREATE POLICY "Authenticated admins can create profiles" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND get_user_role(auth.uid()) = 'admin'::public.user_role
);

-- Only authenticated admins can update all profiles
CREATE POLICY "Authenticated admins can update all profiles" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND get_user_role(auth.uid()) = 'admin'::public.user_role
);

-- Add policy to prevent any public access to profiles
CREATE POLICY "Block public access to profiles" 
ON public.profiles FOR ALL 
TO public
USING (false);

-- Ensure RLS is enabled (should already be enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;