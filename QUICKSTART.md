# Quick Start Guide

Get EliteVote up and running in 5 minutes! ⚡

## Prerequisites

- Node.js 16+ installed
- npm or yarn
- Supabase account (free tier available)

## Step 1: Install Dependencies (1 min)

```bash
cd voter
npm install
```

## Step 2: Set Up Supabase (2 min)

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Sign in and create project
4. Wait for setup (~2 min)

### Get API Keys
1. Go to **Settings → API**
2. Copy **Project URL**
3. Copy **Anon Public Key**

### Configure App
1. Open `.env.local`
2. Paste your URL and key:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Run Migrations
1. In Supabase: **SQL Editor → New Query**
2. Copy-paste content from `supabase/migrations/20240107000000_initial_schema.sql`
3. Click **Run**

## Step 3: Start Development Server (1 min)

```bash
npm run dev
```

Your browser should open to `http://localhost:5173`

## Step 4: Create Account & Test (1 min)

1. **Sign up** with any email/password
2. **Add candidates** (if admin):
   - Manual SQL to make admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
   ```
   - Then reload the page
3. **Vote** for candidates
4. **Announce results** (admin only)
5. **View winners**

## That's It! 🎉

Your voting system is now running!

---

## Common Issues & Fixes

### Port 5173 already in use
```bash
npm run dev -- --port 5174
```

### "Cannot find Supabase URL"
- Check `.env.local` exists
- Verify VITE_ prefix (very important!)
- Restart dev server after changing .env

### "RLS policy violation"
- Make sure admin migration ran
- Promote yourself to admin with SQL
- Refresh page after changes

### "Module not found" error
```bash
# Install dependencies again
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- 📚 Read [README.md](README.md) for full documentation
- 🗄️ Read [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for database details
- 🏗️ Read [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for code structure
- 🚀 Deploy to production (see README.md)

## Useful Commands

```bash
# Development
npm run dev              # Hot reload server

# Production
npm run build            # Create optimized build
npm run preview          # Preview production build locally

# Database
npm run db:status        # Check migrations
npm run db:push          # Push new migrations
npm run db:pull          # Pull from remote

# Code Quality
npm run lint             # Check for errors
```

## Key Features to Try

✅ **Create account** → Sign up page
✅ **Add candidates** → Admin panel
✅ **Cast vote** → Voting booth
✅ **See results** → Live standings
✅ **Announce winner** → Admin controls
✅ **View final results** → Winners page

## Support

- **Supabase Issues**: See [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
- **Code Issues**: Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Migration Help**: See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

---

**Happy Voting!** 🗳️
