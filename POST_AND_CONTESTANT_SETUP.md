# Post & Contestant Management System

## Overview
The voting system has been restructured to separate **Posts** (positions/roles) from **Contestants** (candidates). This allows for:
- Proper organization of elections by position
- Prevention of double voting per position
- Better data management and scalability

## Database Changes

### New: Posts Table
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE (e.g., "President", "Vice President")
  description TEXT (optional details)
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

### Updated: Contestants Table
```sql
ALTER TABLE contestants ADD COLUMN post_id UUID REFERENCES posts(id)
- Old: post (TEXT) - manually entered text
- New: post_id (UUID) - foreign key reference to posts table
```

## Admin Workflow

### Step 1: Create Posts (New "Manage Posts" Tab)
1. Go to **Admin Dashboard** → **Manage Posts** tab
2. Fill in:
   - **Post Name** - e.g., "President", "Secretary", "Treasurer"
   - **Description** (optional) - e.g., "Chief executive of the organization"
3. Click **+ Create Post**

### Step 2: Add Contestants to Posts
1. Go to **Admin Dashboard** → **Manage Contestants** tab
2. Fill in contestant details:
   - **Full Name** - candidate name
   - **Position / Post** - **SELECT from dropdown** (instead of typing)
   - **Candidate Photo** - upload image (optional)
   - **Short Bio** - description
3. Click **+ Add Contestant**

### Step 3: View Results
1. Go to **Results & Winners** tab
2. See winners grouped by post
3. Each post shows:
   - 🥇 Winner with vote count
   - Other candidates ranked

## Voting Rules
- Users can vote **only once per post**
- Users can vote for different candidates in different posts
- The `votes` table maintains the unique constraint: `UNIQUE(user_id, post)`

## Example Workflow

```
Organization: Student Council Election

Posts Created:
├── President
├── Vice President
├── Secretary
└── Treasurer

Contestants Added:
├── President
│   ├── Alice Johnson (25 votes)
│   └── Bob Smith (18 votes)
├── Vice President
│   ├── Carol Davis (22 votes)
│   └── David Lee (20 votes)
├── Secretary
│   ├── Emma White (15 votes)
│   └── Frank Brown (12 votes)
└── Treasurer
    ├── Grace Wilson (19 votes)
    └── Henry Miller (16 votes)

Voting:
- User1: votes for Alice (President) + Carol (VP) + Emma (Secretary) + Grace (Treasurer) ✓
- User2: votes for Alice (President) + Alice (VP) ✗ NOT ALLOWED - already voted for President position
```

## UI Changes

### AdminDashboard.jsx
- **New Tab**: "Manage Posts" - Create, view, and delete posts
- **Updated Form**: Contestant position now uses dropdown (not text input)
- **Enhanced Results**: Shows post name + description in results view
- **Posts Display**: Shows number of contestants per post

### App.jsx
- Added `posts` state
- Added `setPosts` function
- Fetch posts on app load
- Pass posts to AdminDashboard

## RLS Policies
All posts are protected by Row Level Security:
- **SELECT**: Anyone can read posts (for voting)
- **INSERT/UPDATE/DELETE**: Only admins can modify posts

## Migration Notes

If you have existing contestants with the old `post` (text) field:

```sql
-- This migration already handles it, but if needed:
-- Copy data from text field to post_id by matching post names:

UPDATE contestants c1
SET post_id = p.id
FROM posts p
WHERE c1.post = p.name;

-- Then drop the old column (optional):
ALTER TABLE contestants DROP COLUMN post;
```

## Benefits
✅ Cleaner data structure
✅ Prevents accidental post typos
✅ Easier to manage multiple positions
✅ Better reporting and analytics
✅ Proper enforcement of one-vote-per-position rule
✅ Scalable for large elections

## Troubleshooting

**Q: Can't see post dropdown when adding contestant?**
A: Create at least one post in the "Manage Posts" tab first.

**Q: Old contestant data shows as missing post?**
A: You may need to run the migration to link old text posts to new post_id references.

**Q: Getting "Foreign key constraint" error?**
A: Make sure the post exists before adding a contestant to it.
