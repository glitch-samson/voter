# Manual Vote Adjustment Feature

## Overview
Admins can now manually add and subtract votes for contestants through the Admin Dashboard. This feature provides flexible vote management with multiple adjustment methods.

## Features

### 1. **Quick Adjustment Buttons** (±1 votes)
- **Minus Button (Red)**: Decreases votes by 1
- **Plus Button (Green)**: Increases votes by 1
- **Usage**: Rapid adjustments of small amounts
- **Location**: Manage Contestants tab, in the Votes column

### 2. **Direct Vote Input** (Set exact count)
- **Method**: Click on the vote count number to enter edit mode
- **How it works**:
  1. Click on any contestant's vote count
  2. An input field appears with the current number
  3. Type the new vote count
  4. Press Enter or click the ✓ button to save
  5. Click × button to cancel without saving
- **Validation**: Cannot set votes below 0 (negative values are prevented)
- **Location**: Manage Contestants tab, in the Votes column

### 3. **Quick Access Button**
- **Manual Vote Adjustment Button** in the Overview tab
- Click to quickly navigate to the Manage Contestants section
- **Icon**: Pencil/Edit icon

## Vote Update Behavior

### When adjusting votes:
- The vote count updates immediately in the database
- A confirmation message appears notifying the admin of the change
- Current vote totals update in real-time
- Winner standings are recalculated automatically
- Admins can undo changes by adjusting votes back

### Notifications:
- **±1 adjustment**: "Vote count adjusted (X total)"
- **Direct set**: "Votes set to X"
- **Errors**: Displays error message if update fails

## Access Control
- **Only Admins** can access vote adjustment features
- All changes are reflected instantly across the application
- Vote counts in voter views update in real-time

## Use Cases

1. **Correcting Miscounts**: If manual recount shows different results
2. **Administrative Adjustments**: Adding bonus votes, penalties, or corrections
3. **Bulk Changes**: Resetting all votes at once (use "Reset All Votes" button)
4. **Manual Vote Entry**: If using offline voting or paper ballots, manually enter the final counts

## Tips

- Use ±1 buttons for small adjustments (1-5 votes)
- Use direct input for larger changes or setting exact totals
- Always verify the current vote count before making adjustments
- The "Reset All Votes" button clears ALL votes at once - use carefully!
- All vote changes are immediate and cannot be undone (except by manually adjusting again)

## Technical Details

- Vote changes are stored in the Supabase `contestants` table
- The `votes` column is updated directly
- No audit log is kept (future enhancement could add vote change history)
- Changes are applied with Row Level Security (RLS) enabled for admin role only
