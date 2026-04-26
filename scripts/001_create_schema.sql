-- NutriRace Database Schema

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
  daily_calorie_goal INTEGER DEFAULT 2000,
  daily_protein_goal INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Social features (leaderboard/friends) need read access to profile display info.
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Meals table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  image_url TEXT,
  total_calories INTEGER DEFAULT 0,
  total_protein NUMERIC DEFAULT 0,
  total_carbs NUMERIC DEFAULT 0,
  total_fat NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meals_select_own" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert_own" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update_own" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meals_delete_own" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- Users can read accepted friends' meals for social features
DROP POLICY IF EXISTS "meals_select_friends" ON public.meals;
CREATE POLICY "meals_select_friends" ON public.meals FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = meals.user_id)
        OR
        (f.addressee_id = auth.uid() AND f.requester_id = meals.user_id)
      )
  )
);

-- Food items table (individual items in a meal)
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  weight_grams NUMERIC,
  calories INTEGER DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "food_items_select_own" ON public.food_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "food_items_insert_own" ON public.food_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "food_items_update_own" ON public.food_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "food_items_delete_own" ON public.food_items FOR DELETE USING (auth.uid() = user_id);

-- Users can read accepted friends' meal item details for social features
DROP POLICY IF EXISTS "food_items_select_friends" ON public.food_items;
CREATE POLICY "food_items_select_friends" ON public.food_items FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = auth.uid() AND f.addressee_id = food_items.user_id)
        OR
        (f.addressee_id = auth.uid() AND f.requester_id = food_items.user_id)
      )
  )
);

-- Friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships where they are involved
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT 
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE 
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Leaderboard scores table
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  meals_logged INTEGER DEFAULT 0,
  goals_completed INTEGER DEFAULT 0,
  healthy_score INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Everyone can view leaderboard
CREATE POLICY "leaderboard_select_all" ON public.leaderboard_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "leaderboard_insert_own" ON public.leaderboard_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leaderboard_update_own" ON public.leaderboard_scores FOR UPDATE USING (auth.uid() = user_id);

-- User streaks table
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_log_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_select_own" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streaks_insert_own" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update_own" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also create initial streak record
  INSERT INTO public.user_streaks (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON public.meals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_items_meal_id ON public.food_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_week ON public.leaderboard_scores(week_start, total_score DESC);

-- View for public profiles (for friends and leaderboard)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles;

-- Allow authenticated users to view public profiles
GRANT SELECT ON public.public_profiles TO authenticated;
