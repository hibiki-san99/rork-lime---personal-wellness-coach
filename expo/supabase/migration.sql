-- Lime Health App - Supabase Migration
-- Run this SQL in your Supabase Dashboard SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  reset_token TEXT,
  reset_token_expiry BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auth tokens table (persistent sessions)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User sync data (all health/app data as JSONB per user)
CREATE TABLE IF NOT EXISTS user_sync_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sync_data_user_id ON user_sync_data(user_id);

-- Disable RLS (backend handles its own auth via Hono)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_data DISABLE ROW LEVEL SECURITY;

-- Grant access to anon and authenticated roles
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON auth_tokens TO anon, authenticated;
GRANT ALL ON user_sync_data TO anon, authenticated;
