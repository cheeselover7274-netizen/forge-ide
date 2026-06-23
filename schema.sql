-- GHOSTMARKET DATABASE SCHEMA

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  total_support_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Categories Table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT
);

-- 3. Wants Table (Product Ideas)
CREATE TABLE wants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price_id_pay NUMERIC, -- "Price I'd Pay"
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  support_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  trending_score FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Support Table (Upvotes/Joins)
CREATE TABLE supports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  want_id UUID REFERENCES wants(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, want_id)
);

-- 5. Comments Table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  want_id UUID REFERENCES wants(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS (Row Level Security) POLICIES

-- Profiles: Anyone can view, only owner can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: Anyone can view, only admin can modify (manual for now)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone." ON categories FOR SELECT USING (true);

-- Wants: Anyone can view, authenticated users can create, owner can update/delete
ALTER TABLE wants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wants are viewable by everyone." ON wants FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create wants." ON wants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wants." ON wants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wants." ON wants FOR DELETE USING (auth.uid() = user_id);

-- Supports: Anyone can view, authenticated users can support, owner can remove
ALTER TABLE supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Supports are viewable by everyone." ON supports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can support wants." ON supports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own support." ON supports FOR DELETE USING (auth.uid() = user_id);

-- Comments: Anyone can view, authenticated users can comment, owner can update/delete
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone." ON comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment." ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments." ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments." ON comments FOR DELETE USING (auth.uid() = user_id);

-- FUNCTIONS & TRIGGERS

-- Automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update support_count on wants when support is added/removed
CREATE OR REPLACE FUNCTION update_support_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE wants SET support_count = support_count + 1 WHERE id = NEW.want_id;
    UPDATE profiles SET total_support_received = total_support_received + 1 WHERE id = (SELECT user_id FROM wants WHERE id = NEW.want_id);
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE wants SET support_count = support_count - 1 WHERE id = OLD.want_id;
    UPDATE profiles SET total_support_received = total_support_received - 1 WHERE id = (SELECT user_id FROM wants WHERE id = OLD.want_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_support_change
AFTER INSERT OR DELETE ON supports
FOR EACH ROW EXECUTE FUNCTION update_support_count();

-- Update comment_count on wants
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE wants SET comment_count = comment_count + 1 WHERE id = NEW.want_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE wants SET comment_count = comment_count - 1 WHERE id = OLD.want_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_change
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Initial Categories
INSERT INTO categories (name, slug, icon) VALUES
('Hardware', 'hardware', 'Cpu'),
('SaaS', 'saas', 'Cloud'),
('Apps', 'apps', 'Smartphone'),
('AI Tools', 'ai-tools', 'Bot'),
('Home & Garden', 'home-garden', 'Home'),
('Health & Fitness', 'health-fitness', 'Activity'),
('Finance', 'finance', 'DollarSign'),
('Other', 'other', 'Layers');
