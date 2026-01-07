# EliteVote Project Structure

## Project Tree

```
voter/
│
├── 📄 index.html                          # HTML template
├── 📄 package.json                        # Dependencies & scripts
├── 📄 vite.config.js                      # Vite configuration
├── 📄 tailwind.config.js                  # Tailwind CSS config
├── 📄 postcss.config.js                   # PostCSS plugins
├── 📄 .eslintrc.json                      # ESLint rules
├── 📄 .gitignore                          # Git ignore patterns
├── 📄 .env.local                          # Local environment variables
├── 📄 .env.example                        # Environment template
│
├── 📚 README.md                           # Project documentation
├── 📚 SUPABASE_SETUP.md                   # Database setup guide
├── 📚 MIGRATION_GUIDE.md                  # Migration from old version
│
├── 📁 src/                                # Source code
│   ├── 📄 main.jsx                        # React entry point
│   ├── 📄 App.jsx                         # Main app component
│   ├── 📄 index.css                       # Global styles
│   │
│   ├── 📁 components/                     # React components
│   │   ├── 📄 AuthScreen.jsx              # Login/signup
│   │   ├── 📄 Dashboard.jsx               # User dashboard
│   │   ├── 📄 VoterView.jsx               # Voting booth
│   │   ├── 📄 AnnouncementsView.jsx       # Election results
│   │   └── 📄 AdminDashboard.jsx          # Admin panel
│   │
│   └── 📁 lib/                            # Utilities
│       └── 📄 supabaseClient.js           # Supabase client setup
│
├── 📁 supabase/                           # Database configuration
│   ├── 📄 config.json                     # Supabase project config
│   │
│   └── 📁 migrations/                     # Database migrations
│       └── 📄 20240107000000_initial_schema.sql  # Initial schema
│
└── 📁 node_modules/ (auto-generated)      # Dependencies
```

## File Descriptions

### Root Files

| File | Purpose |
|------|---------|
| `index.html` | HTML template - minimal, loads React app |
| `package.json` | Node dependencies and npm scripts |
| `vite.config.js` | Build tool configuration |
| `tailwind.config.js` | CSS framework configuration |
| `postcss.config.js` | CSS post-processing |
| `.eslintrc.json` | Code linting rules |
| `.gitignore` | Git ignore patterns |
| `.env.local` | Local environment variables (not committed) |
| `.env.example` | Template for environment variables |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `SUPABASE_SETUP.md` | Supabase configuration guide |
| `MIGRATION_GUIDE.md` | Guide for migrating from old version |

### Source Code (`src/`)

#### Main Files
| File | Purpose |
|------|---------|
| `main.jsx` | Entry point - mounts React app to DOM |
| `App.jsx` | Main application component with routing |
| `index.css` | Global styles and Tailwind imports |

#### Components (`src/components/`)
| Component | Purpose |
|-----------|---------|
| `AuthScreen.jsx` | User authentication (login/signup) |
| `Dashboard.jsx` | Main user dashboard with voting progress |
| `VoterView.jsx` | Voting booth interface |
| `AnnouncementsView.jsx` | Election results display |
| `AdminDashboard.jsx` | Admin panel for managing election |

#### Utilities (`src/lib/`)
| File | Purpose |
|------|---------|
| `supabaseClient.js` | Supabase client initialization |

### Database (`supabase/`)

| File/Folder | Purpose |
|-------------|---------|
| `config.json` | Supabase project credentials |
| `migrations/` | Database schema files |
| `20240107000000_initial_schema.sql` | Initial database schema |

## Component Hierarchy

```
App (main)
├── AuthScreen
│   └── (handles auth)
└── Dashboard (logged in)
    ├── Sidebar (navigation)
    │   ├── Dashboard link
    │   ├── Voting Booth link
    │   ├── Winners link
    │   └── Admin link (if admin)
    │
    └── Main Content
        ├── Dashboard
        │   ├── Voting Progress
        │   ├── Total Candidates
        │   ├── System Status
        │   └── Current Standings
        │
        ├── VoterView
        │   └── Voting Booth
        │       └── Candidate Cards (per position)
        │
        ├── AnnouncementsView
        │   └── Election Results
        │       └── Winner Cards (per position)
        │
        └── AdminDashboard
            ├── Add Contestant Form
            ├── Manage Contestants Table
            └── Voters Table
```

## Data Flow

```
User Action
    ↓
React Component State Update
    ↓
Supabase API Call
    ↓
Database Operation
    ↓
Response → Component Update
    ↓
UI Render
```

## Build Output

After `npm run build`:

```
dist/
├── index.html              # Minified HTML
├── assets/
│   ├── index-xxx.js        # Bundled JavaScript
│   └── index-xxx.css       # Bundled CSS
└── favicon.ico             # Icon
```

## Key Technologies

- **React 18** - UI framework
- **Vite** - Build tool
- **Supabase** - Backend & database
- **Tailwind CSS** - Styling
- **PostCSS** - CSS processing
- **ESLint** - Code linting

## Development Workflow

1. Edit components in `src/`
2. Vite auto-reloads changes
3. Test in browser at `http://localhost:5173`
4. Commit to git
5. Push to deploy

## Production Build

```bash
npm run build          # Creates optimized dist/ folder
npm run preview        # Preview production build locally
```

## Environment Variables

Required in `.env.local`:
```env
VITE_SUPABASE_URL=     # Your Supabase project URL
VITE_SUPABASE_ANON_KEY= # Your Supabase anonymous key
```

## Scripts Available

```bash
npm run dev           # Start dev server with HMR
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Check code with ESLint
npm run db:migrations # Create new migration
npm run db:push       # Push migrations to Supabase
npm run db:pull       # Pull schema from Supabase
npm run db:status     # Show migration status
```

## Total Lines of Code

| Category | Lines |
|----------|-------|
| Components | ~600 |
| Config | ~50 |
| Database Schema | ~200 |
| Styles | ~50 |
| **Total** | **~900** |

Note: Code is much more maintainable than the original single 900-line HTML file!

## Next Actions

1. Run `npm install` to install dependencies
2. Configure Supabase (see `SUPABASE_SETUP.md`)
3. Run `npm run dev` to start development
4. Create account and test the voting system
5. Deploy with `npm run build`
