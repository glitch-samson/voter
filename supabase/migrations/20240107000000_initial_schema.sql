-- Drop existing objects in correct order
DROP TRIGGER IF EXISTS update_election_status_updated_at ON election_status;
DROP TRIGGER IF EXISTS update_contestants_updated_at ON contestants;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Anyone can read contestants" ON contestants;
DROP POLICY IF EXISTS "Admins can insert contestants" ON contestants;
DROP POLICY IF EXISTS "Admins can update contestants" ON contestants;
DROP POLICY IF EXISTS "Admins can delete contestants" ON contestants;
DROP POLICY IF EXISTS "Users can read own votes" ON votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON votes;
DROP POLICY IF EXISTS "Admins can read all votes" ON votes;
DROP POLICY IF EXISTS "Anyone can read election status" ON election_status;
DROP POLICY IF EXISTS "Admins can update election status" ON election_status;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS election_status;
DROP TABLE IF EXISTS contestants;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role CASCADE;

-- CreateEnum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'voter');

-- Create users table with auth integration
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role DEFAULT 'voter',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create contestants table
CREATE TABLE contestants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  post TEXT NOT NULL,
  image TEXT,
  bio TEXT,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create votes table to track individual votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contestant_id UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
  post TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, post)
);

-- Create election_status table
CREATE TABLE election_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT TRUE,
  results_announced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_contestants_post ON contestants(post);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_contestant_id ON votes(contestant_id);
CREATE INDEX idx_votes_post ON votes(post);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can create own record" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for contestants table
CREATE POLICY "Anyone can read contestants" ON contestants
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can insert contestants" ON contestants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update contestants" ON contestants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete contestants" ON contestants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for votes table
CREATE POLICY "Users can read own votes" ON votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all votes" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for election_status
CREATE POLICY "Anyone can read election status" ON election_status
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can update election status" ON election_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'voter'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contestants_updated_at BEFORE UPDATE ON contestants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_election_status_updated_at BEFORE UPDATE ON election_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize default election status
INSERT INTO election_status (is_active, results_announced) VALUES (TRUE, FALSE)
ON CONFLICT DO NOTHING;
