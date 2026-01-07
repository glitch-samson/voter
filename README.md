# EliteVote - React + Vite + Supabase

A modern, secure voting system built with React, Vite, and Supabase.

## Project Structure

```
voter/
├── src/
│   ├── components/
│   │   ├── AuthScreen.jsx          # Login/signup
│   │   ├── Dashboard.jsx           # User dashboard
│   │   ├── VoterView.jsx           # Voting booth
│   │   ├── AnnouncementsView.jsx   # Results
│   │   └── AdminDashboard.jsx      # Admin panel
│   ├── lib/
│   │   └── supabaseClient.js       # Supabase configuration
│   ├── App.jsx                     # Main app component
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Global styles
├── supabase/
│   └── migrations/
│       └── 20240107000000_initial_schema.sql  # Database schema
├── index.html                      # HTML template
├── package.json                    # Dependencies
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind CSS config
├── .env.local                      # Local environment variables
└── .env.example                    # Environment template
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

#### Option A: Use Supabase Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → API and copy your `Project URL` and `Anon Key`
3. Update `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Run migrations in Supabase SQL Editor:
   - Open `SQL Editor` in Supabase console
   - Copy content from `supabase/migrations/20240107000000_initial_schema.sql`
   - Paste and execute

#### Option B: Use Local Supabase (Development)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase locally
supabase init

# Start Supabase containers
supabase start

# Apply migrations
supabase db push
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run db:migrations # Create new migration
npm run db:push      # Push migrations to database
npm run db:pull      # Pull schema from database
npm run db:status    # Check migration status
```

## Database Schema

### Tables

- **users**: User accounts with role (admin/voter)
- **contestants**: Voting candidates
- **votes**: Individual vote records (one per user per post)
- **election_status**: Global election state (active, results_announced)

### Key Features

- Row Level Security (RLS) policies for data access control
- Automatic timestamp updates with triggers
- Vote count increments on vote submission
- Unique constraint on user_id + post combination (prevent double voting)

## Features

- ✅ User authentication (signup/login)
- ✅ Real-time voting system
- ✅ Admin panel for managing candidates and results
- ✅ Vote results announcement
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Secure database with RLS policies
- ✅ Real-time vote counter updates

## Authentication Flow

1. User signs up with email/password
2. Auth creates user in `auth.users` table
3. Trigger creates record in `users` table with voter role
4. Admin can promote users to admin role via Supabase
5. User logs in and accesses voting booth based on role

## Admin Features

- Add/remove candidates
- Manually adjust vote counts
- Announce/withdraw results
- View all registered voters
- Monitor voting progress

## Security

- PostgreSQL Row Level Security (RLS) enforces data access
- Admins only can manage candidates
- Users can only see their own votes
- One vote per position per user (database constraint)
- Password hashing via Supabase Auth

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploy to Netlify

```bash
npm run build

# Then connect git repo to Netlify or:
npm install -g netlify-cli
netlify deploy
```

## Troubleshooting

### "Supabase credentials not configured"
Make sure `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Migrations not applying
Run manually in Supabase SQL Editor:
1. Go to your project
2. SQL Editor → New Query
3. Paste migration SQL and execute

### Can't vote
- Check user is logged in
- Verify you haven't already voted for that position
- Check election status (voting may be closed)

## License

MIT
