-- Fix the trigger to handle metadata timing issue

-- Step 1: Drop the old function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the new function with timing fix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if metadata is available
  -- Check if profile already exists to prevent duplicates
  IF NEW.raw_user_meta_data->>'username' IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    
    INSERT INTO public.profiles (id, email, username, full_name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger on BOTH INSERT and UPDATE
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT OR UPDATE ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
