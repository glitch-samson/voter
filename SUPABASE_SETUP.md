# Supabase Setup Guide

## Quick Start

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Sign up / Log in
- Create new project
- Choose region (same as your app for best performance)

### 2. Get API Keys
- In Supabase Dashboard: Settings → API
- Copy `Project URL`
- Copy `Anon Key` (or Service Role Key for admin operations)

### 3. Configure Environment
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Paste content from: `supabase/migrations/20240107000000_initial_schema.sql`
4. Click "Run" or press Ctrl+Enter

### 5. Verify Setup
After migrations run, check:
- **Auth** tab: Should show Auth enabled
- **Database** → Tables: Should see users, contestants, votes, election_status
- **Policies** tab: Should see RLS policies

## Database Overview

### Users Table
```sql
- id (UUID, references auth.users)
- email (TEXT)
- name (TEXT)
- role (voter | admin)
- created_at
- updated_at
```

### Contestants Table
```sql
- id (UUID)
- name (TEXT)
- post (TEXT) - e.g., "President", "Secretary"
- image (TEXT) - Image URL
- bio (TEXT)
- votes (INTEGER)
- created_at
- updated_at
```

### Votes Table
```sql
- id (UUID)
- user_id (references users)
- contestant_id (references contestants)
- post (TEXT) - Store post name for reference
- created_at
- UNIQUE(user_id, post) - Prevents double voting
```

### Election Status Table
```sql
- id (UUID)
- is_active (BOOLEAN)
- results_announced (BOOLEAN)
- created_at
- updated_at
```

## RLS Policies

### Public Access
- **contestants**: Anyone can read
- **election_status**: Anyone can read

### User Access
- **users**: Can only read/update own record
- **votes**: Can only read/write own votes

### Admin Only
- **contestants**: Can insert, update, delete
- **election_status**: Can update status
- **users**: Can view all

## Authentication Setup

Supabase Auth is auto-configured. To allow sign-ups:

1. **Email/Password** (default enabled)
   - Users can sign up with email/password
   - Email confirmation required (optional)

2. **OAuth Providers** (optional)
   - GitHub, Google, etc.
   - Configure in Authentication → Providers

3. **Email Confirmations** (optional)
   - Go to Authentication → Email Templates
   - Customize confirmation emails

## Admin User Setup

After running migrations:

1. Sign up a user normally
2. In Supabase → SQL Editor, run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

## Testing

### Test Users
```sql
-- Create test voter
INSERT INTO auth.users (email, password, email_confirmed_at) 
VALUES ('voter@test.com', '...', NOW());

-- Create test admin
INSERT INTO auth.users (email, password, email_confirmed_at, role) 
VALUES ('admin@test.com', '...', NOW(), 'admin');
```

## Troubleshooting

### "Invalid Supabase URL"
- Check VITE_SUPABASE_URL format
- Should be: `https://xxxxx.supabase.co`
- Not: `https://xxxxx.supabase.co/` (no trailing slash)

### "Rate limited"
- Supabase free tier has request limits
- Upgrade to Pro tier for higher limits

### "RLS policy violation"
- User trying action they don't have permission for
- Check user role and RLS policies
- Admins should have elevated permissions

### "Migrations not applying"
- Execute manually in SQL Editor
- Check for PostgreSQL syntax errors
- Ensure you're using correct project

## Production Deployment

1. **Use Service Role Key for sensitive operations**
   - Not just Anon Key
   - Store securely in environment variables

2. **Enable Row Level Security**
   - Already configured in migrations
   - Verify all tables have policies

3. **Set up backup**
   - Supabase auto-backups, but configure schedule
   - Test restores periodically

4. **Monitor usage**
   - Go to Dashboard → Usage
   - Set up billing alerts

## Useful Commands

```bash
# View migrations
supabase migration list

# Push local migrations
supabase db push

# Pull remote schema
supabase db pull

# Reset database (warning: destructive)
supabase db reset
```

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Guide](https://supabase.com/docs/guides/realtime)
