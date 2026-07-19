-- ========================================
-- AeroPrep AI — Supabase Schema Migration
-- Run this in Supabase SQL Editor
-- ========================================

-- Users profile table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  interview_count INTEGER DEFAULT 0,
  highest_score NUMERIC(5,1) DEFAULT 0,
  average_score NUMERIC(5,1) DEFAULT 0,
  continuous_days INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- Interview records
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  role_label TEXT DEFAULT '',
  company TEXT NOT NULL,
  mode TEXT NOT NULL,
  persona TEXT DEFAULT '',
  score NUMERIC(5,1) DEFAULT 0,
  evaluation TEXT DEFAULT '',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  total_turns INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only read/update their own data
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own interviews"
  ON public.interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- Site Config (全局站点配置)
-- ========================================
CREATE TABLE IF NOT EXISTS public.site_config (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT ''
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取 site_config（收款码等公开信息）
CREATE POLICY "Anyone can read site_config"
  ON public.site_config FOR SELECT
  USING (true);

-- 仅管理员可写入 site_config
CREATE POLICY "Only admins can insert site_config"
  ON public.site_config FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));
CREATE POLICY "Only admins can update site_config"
  ON public.site_config FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true));
