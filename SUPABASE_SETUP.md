# Supabase Setup Guide for OpenBook

This guide walks you through setting up Supabase for the OpenBook authentication system.

## Prerequisites

- A Supabase account (free at https://supabase.com)
- PostgreSQL knowledge (basic)
- 15 minutes

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign up or log in
2. Click "New Project"
3. Choose a name: `openbook`
4. Set a password (save this - you'll need it)
5. Choose a region closest to you
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_KEY`
   - **JWT Secret** → `SUPABASE_JWT_SECRET`

3. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

4. Paste your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-api-settings
GEMINI_API_KEY=your-gemini-key-if-you-have-one
APP_URL=http://localhost:5173
NODE_ENV=development
API_PORT=3000
```

## Step 3: Create the Profiles Table

1. Go to Supabase Dashboard → SQL Editor
2. Create a new SQL query
3. Paste and run this SQL:

```sql
-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT,
  favorite_genres TEXT[] DEFAULT '{}',
  reading_goal INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Anyone can read public profile info (for future social features)
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Step 4: Configure Authentication

1. Go to Authentication → Providers
2. Ensure "Email" provider is enabled (default)
3. Optional: Configure OAuth providers:
   - Google (for future social login)
   - GitHub (for future social login)
   - Apple (for future social login)

4. Go to Authentication → Email Templates
5. Check the templates (Confirm signup, Reset password, etc.)

## Step 5: Configure Frontend Environment

1. The frontend automatically reads from `.env`:
   ```
   VITE_SUPABASE_URL (same as SUPABASE_URL)
   VITE_SUPABASE_ANON_KEY (same as SUPABASE_ANON_KEY)
   ```

2. Vite automatically prefixes environment variables with `VITE_` for frontend access

## Step 6: Verify Setup

1. In the Supabase dashboard, go to SQL Editor
2. Run this query to verify the profiles table exists:
```sql
SELECT * FROM profiles LIMIT 1;
```

3. You should see the table structure (empty, but present)

## Step 7: Install Dependencies

```bash
npm install
```

## Step 8: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` - the app should now connect to Supabase!

## Troubleshooting

### "Missing environment variables" error
- Check that `.env` file exists in project root
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
- Frontend env vars must start with `VITE_` prefix
- Restart dev server after updating `.env`

### "Could not connect to Supabase" error
- Verify SUPABASE_URL is correct (copy from API settings)
- Verify SUPABASE_ANON_KEY is correct
- Check your internet connection

### "Profiles table not found" error
- Go to Supabase Dashboard → SQL Editor
- Run the CREATE TABLE script above
- Verify the table was created successfully

### "Row level security violation" error
- The RLS policies might be too restrictive
- Check that the policies were created
- Verify auth.uid() matches your user ID

## Next Steps

After setup is complete, the app will have:
- ✅ User registration with email/password
- ✅ User login/logout
- ✅ User profile management
- ✅ Protected routes (only authenticated users)
- ✅ Auto token refresh
- ✅ Session persistence

## Production Deployment

When deploying to production:
1. Update `.env` with production Supabase credentials
2. Ensure VITE_SUPABASE_URL points to production URL
3. Update APP_URL to your production domain
4. Test all auth flows in production environment

## Documentation

- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Database: https://supabase.com/docs/guides/database
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
