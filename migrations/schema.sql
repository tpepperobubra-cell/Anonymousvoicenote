-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  user_link TEXT UNIQUE NOT NULL,
  admin_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  audio_base64 TEXT NOT NULL,
  mime TEXT DEFAULT 'audio/webm',
  duration TEXT,
  created_at TIMESTAMP DEFAULT now()
);
