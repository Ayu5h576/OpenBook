# Quick Guide: Get Supabase Credentials

## Step-by-Step Instructions

### 1. Create Supabase Project
- Go to **https://supabase.com**
- Sign up or log in
- Click **"New Project"**
- Fill in:
  - **Project name**: `openbook` (or your preference)
  - **Database password**: Save this somewhere safe
  - **Region**: Select closest to you
- Click **"Create new project"** and wait 1-2 minutes

### 2. Get Your Credentials
Once your project is created:

1. **Go to Project Settings**
   - Click the gear icon ⚙️ at the bottom left
   - Select **"Settings"**

2. **Find the API Section**
   - Click **"API"** in the left sidebar
   - You'll see a section called "Project API keys"

3. **Copy These Values**
   ```
   Project URL          → SUPABASE_URL & VITE_SUPABASE_URL
   anon public key      → VITE_SUPABASE_ANON_KEY
   service_role secret  → SUPABASE_SERVICE_KEY
   JWT Secret           → SUPABASE_JWT_SECRET (scroll down to find it)
   ```

### 3. Create Your .env File

Create a new file called `.env` in the project root (NOT .env.example):

```bash
# Backend Supabase
SUPABASE_URL=https://your-project-xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...xxxxxxxxx
SUPABASE_JWT_SECRET=super-secret-jwt-key-xxxxxxxxx

# Frontend Supabase (VITE_ prefix is important!)
VITE_SUPABASE_URL=https://your-project-xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...xxxxxxxxx

# App Configuration
NODE_ENV=development
API_PORT=3000
APP_URL=http://localhost:5173
```

### 4. Database Setup (Optional but Recommended)

To test with the database schema:

1. In Supabase Dashboard, go to **"SQL Editor"**
2. Click **"New Query"**
3. Copy and paste the SQL from `SUPABASE_SETUP.md`
4. Click **"Run"**

This creates the `profiles` table needed for user management.

### 5. Test Your Setup

```bash
# Install dependencies (if not done)
npm install

# Start dev server
npm run dev

# Visit http://localhost:5173
# You should see the OpenBook app without Supabase errors
```

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env` file exists in project root
- Check that variable names match exactly (case-sensitive)
- Restart dev server after creating .env
- **Important**: Variables for frontend MUST start with `VITE_`

### Error: "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### Database errors when logging in
- Make sure you ran the SQL schema setup from `SUPABASE_SETUP.md`
- Verify JWT_SECRET in .env matches Supabase dashboard

### Still getting errors?
Check:
1. `.env` file is in project root (same level as package.json)
2. All 6 environment variables are present
3. No extra spaces or quotes around values
4. VITE_ prefix on frontend variables
5. Restart `npm run dev` after changes

## Security Note

- **NEVER commit `.env` file to git** - it contains secrets!
- **NEVER share `.env` file** - treat it like a password
- The `.env.example` file is safe to commit and shows what variables are needed

## Next Steps

Once your .env is configured and dev server runs:
- Go to http://localhost:5173
- Register a new account with email/password
- Test the auth flow
- Check browser console for any errors

See `PHASE_2_IMPLEMENTATION_SUMMARY.md` for full implementation details.
