# LifeCoach Esports Mode - Integration Guide

## System Overview

The Esports Mode transforms LifeCoach into a competitive gamification platform where users compete 1v1 in 24-hour matches, completing real productivity tasks to win XP, climb ranks, and dominate the leaderboard.

**Core Concept**: "Make users feel like they're playing a competitive esports game, but actually improving their real life."

---

## Architecture

### Database Layer
**Tables** (Supabase PostgreSQL):
- `user_xp_profile` - Current XP, rank tier, statistics
- `xp_transactions` - XP change history for auditing
- `user_ranks` - Leaderboard position and rank metadata
- `esports_matches` - Match records with outcomes
- `esports_achievements` - Achievement tracking (streaks, rank-ups)
- `leaderboard_cache` - Cached rankings for performance

**Location**: Deploy `supabase-esports-schema.sql` to your Supabase project

---

## API Endpoints

All endpoints return `{ success: boolean, ...data }`

### XP System (`/pages/api/esports/xp-system.js`)

**POST** `/api/esports/xp-system`
- `action: 'addXP'` - Add XP to user
  ```json
  { "userId": "user123", "amount": 50, "source": "task_complete" }
  ```
- `action: 'getUserRankInfo'` - Get user's rank/XP status
  ```json
  { "userId": "user123" }
  // Returns: { rank, level, currentXP, wins, winStreak, leaderboardPosition }
  ```

### Leaderboard (`/pages/api/esports/leaderboard.js`)

**GET** `/api/esports/leaderboard`
- `action: 'getLeaderboard'`, `type: 'daily|weekly|all_time'`, `limit: 100`
  ```json
  // Returns: { rankings: [{ rank, username, xp, wins, trend }] }
  ```
- `action: 'getUserLeaderboardContext'` - User + nearby players
  ```json
  // Returns: { userRank, above, below, percentile }
  ```

### Matches (`/pages/api/esports/match.js`)

**POST** `/api/esports/match`
- `action: 'startMatch'` - Create new match
  ```json
  { "userId": "user123", "opponentId": "opponent456" }
  // Returns: { matchId, startedAt, duration }
  ```
- `action: 'completeMatchTask'` - Record task completion
  ```json
  { "matchId": "MATCH-001", "userId": "user123", "taskId": "task456" }
  ```
- `action: 'endMatch'` - Determine winner and award XP
  ```json
  { "matchId": "MATCH-001" }
  // Returns: { winner, xpAwarded }
  ```

### Commentator (`/pages/api/esports/commentator.js`)

**POST** `/api/esports/commentator`
- `action: 'generateCommentary'` - Generate epic commentary
  ```json
  { 
    "eventType": "streak|rankUp|matchWin|comeback|milestone|leaderboard",
    "username": "Player123",
    "count": 5,  // for streaks
    "rank": "Gold",  // for rank-ups
    "xp": 100,  // for milestones
    "useAI": true  // use Gemini for variety
  }
  // Returns: { message: "🔥 on fire today! 5 tasks in a row!" }
  ```

---

## Frontend Integration

### 1. Dashboard View
**File**: `/public/esports-dashboard.html`

**Integration Points**:
- Link from main app navigation to `/public/esports-dashboard.html`
- Displays user's current XP, rank, active match status
- Shows recent match history
- Buttons to start new matches or view leaderboard

**Dependencies**:
- `/public/esports-effects.js` - Para animations/sounds

### 2. Leaderboard View
**File**: `/public/esports-leaderboard.html`

**Features**:
- Top 3 podium with trophy emojis
- Full rankings table (1-100+)
- User's position highlighted
- Filter by daily/weekly/all-time
- Comparison with nearby players

### 3. Match Screen
**File**: `/public/esports-match.html`

**Live During Match**:
- Split-screen (You vs Opponent)
- Task completion counter
- 24h countdown timer
- XP display
- Live winning condition
- Screen shake & effects

### 4. Effects System
**File**: `/public/esports-effects.js`

**Global Instance**: `window.esportsEffects`

**Key Methods**:
```javascript
// Task completed with sound, particle effect
esportsEffects.taskCompletionEffect(element)

// Rank up celebration
esportsEffects.rankUpEffect(element)

// Victory fanfare
esportsEffects.victoryEffect()

// XP gain floating text
esportsEffects.xpGainEffect(amount, element)

// Screen shake
esportsEffects.screenShake(intensity, duration)

// Streak notification
esportsEffects.streakEffect(count)
```

---

## Integration with Existing LifeCoach

### Step 1: Deploy Database Schema
```bash
# Use Supabase dashboard to run:
# Copy content of supabase-esports-schema.sql and execute
```

### Step 2: Add Navigation Links
In your main app layout, add links to esports:
```html
<a href="/public/esports-dashboard.html">⚡ Esports Arena</a>
<a href="/public/esports-leaderboard.html">🏆 Leaderboard</a>
```

### Step 3: Connect Task System
When users complete a task, trigger XP reward:
```javascript
// In your existing task completion handler
fetch('/api/esports/xp-system', {
  method: 'POST',
  body: JSON.stringify({
    action: 'addXP',
    userId: currentUser.id,
    amount: 10,
    source: 'task_complete'
  })
}).then(res => res.json())
.then(data => {
  if (data.success && window.esportsEffects) {
    esportsEffects.xpGainEffect(10);
    esportsEffects.playSound('xp_gain', 0.2);
  }
});
```

### Step 4: Real-Time Commentary
When notable events happen (rank-up, winning streak):
```javascript
// Trigger AI commentary
fetch('/api/esports/commentator', {
  method: 'POST',
  body: JSON.stringify({
    action: 'generateCommentary',
    eventType: 'rankUp',
    username: user.username,
    rank: 'Gold',
    useAI: true
  })
}).then(res => res.json())
.then(data => {
  if (window.esportsEffects) {
    esportsEffects.createNotification(data.message);
    esportsEffects.rankUpEffect(document.querySelector('.rank-display'));
  }
});
```

---

## User Flow

```
1. User visits Dashboard
   → Shows current rank/XP/match status
   
2. User clicks "Find Opponent"
   → System matches with similar rank player or AI
   → Redirects to Match Screen
   
3. During 24-hour Match
   → User completes real tasks (goals, habits, reflections)
   → Each task = +10 XP + visible counter
   → Real-time opponent AI simulation
   → Screen shows live competition
   
4. Match Ends (24h or one player wins by large margin)
   → Victory/Defeat overlay with XP reward
   → Leaderboard updates
   → Commentary generates from AI
   
5. User views Leaderboard
   → Sees their rank position
   → Sees top players and nearby competitors
   → Can compare with adjacent players
```

---

## Gamification Mechanics

### XP Rewards
- Task completion: +10 XP
- Match win: +100 XP
- Match loss: +50 XP
- Rank up: +250 XP bonus
- Streak (3+): +5 XP per task multiplier

### Rank Tiers (6 levels)
1. **Bronze** (0-2,000 XP) - Beginner
2. **Silver** (2,000-5,000 XP) - Intermediate
3. **Gold** (5,000-10,000 XP) - Pro
4. **Diamond** (10,000-20,000 XP) - Expert
5. **Master** (20,000-50,000 XP) - Elite
6. **Grandmaster** (50,000+ XP) - Legend

### Streaks
- Win consecutive matches → 🔥 streak indicator
- Visual badge, AI commentary, bonus XP
- Resets on loss

### Achievements
- First win
- 5-game win streak
- Each rank tier reached
- Leaderboard top 100
- Leaderboard top 10
- Leaderboard #1

---

## Performance Optimization

### Caching
- Leaderboard cached hourly (update on user rank change)
- User XP info cached 5 minutes
- Match data pulled in real-time

### Database Queries
- Indexed on: `user_id`, `rank`, `created_at`, `xp`
- Pagination: leaderboard fetches top 100 only
- Lazy load match history (20 at a time)

### Frontend
- Lazy load effects JS only when needed
- Web Audio synth (no MP3 files = instant)
- CSS animations (GPU-accelerated)

---

## Configuration

### Environment Variables Needed
```
GEMINI_API_KEY=         # For AI commentator
SUPABASE_URL=           # Your Supabase instance
SUPABASE_ANON_KEY=      # Public Supabase key
```

### Sound Effects Toggle
```javascript
// Users can disable sound
esportsEffects.toggleSound(false)
```

### Testing
- Use mock data in HTML files (already implemented)
- Replace `loadMockData()` with real API calls when ready
- Test leaderboard with 100+ user records

---

## Future Enhancements

- **Team Mode** (3v3 competitive teams)
- **Seasonal Rankings** (reset every month with badges)
- **Custom Match Lobbies** (invite friends)
- **Live Spectating** (watch other matches)
- **Coaching Rewards** (highest ranked = rewards)
- **Mobile App Integration** (push notifications on match events)
- **Real-time WebSocket** Events (live leaderboard updates)
- **Audio Multiplayer** (Discord bot integration)

---

## Troubleshooting

**Matches not starting?**
- Check user exists in `user_xp_profile` table
- Verify opponent selection logic

**Leaderboard not updating?**
- Clear cache: Run cache invalidation query
- Check `xp_transactions` for new entries

**Effects not showing?**
- Verify `/public/esports-effects.js` is loaded
- Check browser console for Audio API errors
- Some browsers require user interaction before audio plays

**Commentator messages generic?**
- Ensure `GEMINI_API_KEY` is set
- Check API quota limits
- Fallback works without internet

---

## Success Metrics

Track these KPIs:
- Daily Active Users in Esports
- Match completion rate (avg match duration)
- Average XP gained per user per day
- User retention (week-over-week)
- Leaderboard engagement (visits/day)
- Commentary effectiveness (interaction rate)

**Target**: 35% weekly engagement increase after launch
