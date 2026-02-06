# Player Training AI Assistant (Legacy)

> **Note:** This agent has been superseded by the [Orchestrator Agent (Ace)](orchestrator.md). The `/api/training/chat` endpoint still works but delegates to the orchestrator. This document is kept for historical reference.

**Personalized tennis training coach powered by journal analysis**

---

## Overview

The Player Training AI Assistant is an intelligent coaching tool that helps tennis players improve their game through data-driven, personalized training recommendations. It analyzes players' journal entries from coaching sessions to identify patterns, strengths, and areas for improvement.

### Key Capabilities

- **Journal Analysis**: Reviews coaching session notes and player reflections
- **Progress Tracking**: Compares performance over time to measure improvement  
- **Data-Driven Insights**: Calculates statistics on focus areas and trends
- **Personalized Plans**: Creates custom training recommendations based on each player's data
- **Goal Setting**: Helps set realistic weekly training goals
- **Training Plan Templates**: Generates structured plans for coach review

---

## Architecture

### Dual-Mode AI Assistant

The system uses a **single AI assistant component** that automatically switches between two modes based on user role:

```
┌──────────────────────────────────┐
│   AdminAIAssistant Component     │
│   (components/admin/)            │
└────────────┬─────────────────────┘
             │
        Detect user.role
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐     ┌──────────────┐
│  Admin  │     │   Player     │
│  Mode   │     │   Mode       │
└────┬────┘     └──────┬───────┘
     │                 │
     │                 │
     ▼                 ▼
/api/admin/chat   /api/training/chat
     │                 │
     ▼                 ▼
Admin AI Agent    Training AI Agent
(booking mgmt)    (personalized training)
```

---

## Setup Requirements

### Environment Configuration

Same as other AI agents — requires Google Gemini API key in **`backend/.env`**:

```env
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_GENAI_MODEL=gemini-3-flash-preview
```

---

## How It Works

### Role Detection

When a user opens the AI assistant:
1. Component reads `user.role` from auth context
2. If role is `"admin"` → Shows admin booking assistant
3. If role is `"player"` or `"coach"` → Shows training assistant
4. Changes welcome message, endpoint, and functionality accordingly

### Data Analysis Flow

```
Player asks: "What should I work on?"
         ↓
Agent calls: getPlayerJournalAnalytics(playerId)
         ↓
Backend analyzes:
  - All journal entries for player
  - Areas worked on (frequency %)
  - Recent focus (last 3 sessions)
  - Coach pointers
  - Player reflections
  - Trends (improving vs needs work)
         ↓
Agent receives rich analytics data
         ↓
Agent provides personalized recommendations
```

---

## AI Agent Tools

### 1. `getPlayerJournalAnalytics`

Analyzes all journal entries for a player.

**Parameters:**
```typescript
{
  playerId: string;
}
```

**Returns:**
```typescript
{
  totalSessions: number;
  dateRange: { earliest: string; latest: string };
  areasFrequency: Record<string, number>;
  areasPercentage: Record<string, number>;
  recentFocus: string[];
  coachPointers: string[];
  playerReflections: string[];
  trends: {
    improving: string[];
    needsWork: string[];
  };
}
```

**Example Analysis:**
- "You've worked on backhand 40% of sessions (8 times)"
- "Recent focus: serve, footwork, mental"
- "Improving areas: forehand (less frequent in recent sessions)"
- "Needs work: backhand (increasing frequency suggests ongoing focus)"

### 2. `getPlayerProfile`

Gets basic player information.

**Parameters:**
```typescript
{
  playerId: string;
}
```

**Returns:**
```typescript
{
  name: string;
  memberNumber: string;
  joinDate: string;
  role: string;
}
```

### 3. `getPlayerTrainingHistory`

Retrieves all previous training plans for the player.

**Parameters:**
```typescript
{
  playerId: string;
}
```

**Returns:**
```typescript
{
  totalPlans: number;
  plans: Array<{
    id: string;
    created: string;
    focusAreas: string[];
    version: number;
    lastReview: string;
  }>;
}
```

**Use Case:** Avoids repetition, tracks progress over time.

### 4. `createTrainingPlanTemplate`

Creates a personalized training plan saved for coach review.

**Parameters:**
```typescript
{
  playerId: string;
  focusAreas: string[];           // e.g., ["backhand", "serve"]
  strengths: string[];            // e.g., ["footwork", "mental toughness"]
  areasForImprovement: string[];  // e.g., ["backhand consistency", "serve power"]
  recommendations: string;        // Detailed strategy
  suggestedDrills: string[];      // Specific exercises
  weeklyGoals: string[];          // Achievable goals
}
```

**Returns:**
```typescript
{
  planId: string;
  message: "Training plan created! Your coach can review and refine it."
}
```

**Storage:** Saved to `backend/data/training-plans.json`

---

## Example Conversations

### Example 1: Player Asks for Recommendations

**Player:** "What should I be working on?"

**AI:** "Let me analyze your training sessions... 

Based on your 10 coaching sessions since January 20th:

📊 **Your Focus Areas:**
- Backhand: 40% (most frequent)
- Footwork: 30%
- Serve: 20%
- Mental: 10%

💪 **Recent Progress:**
Your backhand has been a major focus lately. Coach Fernando noted in your last 3 sessions that you're improving follow-through and positioning.

🎯 **Recommendations:**
1. **Continue backhand work** - You're making great progress! Focus on cross-court shots as your coach suggested.
2. **Increase serve practice** - Only 20% of sessions. Your serve needs more attention for a well-rounded game.
3. **Mental game** - You reflected that you need to "trust your strokes more." Let's work on confidence drills.

Would you like me to create a structured training plan?"

### Example 2: Creating a Training Plan

**Player:** "Yes, create a plan for me!"

**AI:** "Perfect! Creating your personalized training plan...

✅ **Training Plan Created!**

**Focus Areas:** Backhand consistency, Serve power, Mental confidence

**Your Strengths:**
- Footwork and movement
- Dedication to improvement
- Good technique foundation

**Areas for Improvement:**
- Backhand cross-court shots
- Serve ball toss consistency
- Mental confidence in matches

**Recommended Drills:**
1. Backhand cross-court targets (20 reps daily)
2. Serve toss practice with target
3. Positive self-talk between points

**Weekly Goals:**
- Hit 100 quality backhand cross-courts
- Practice serve toss 15 minutes daily
- Write post-session reflections

This plan has been saved and your coach can review it in your next session! Keep up the great work! 🎾"

### Example 3: Progress Check

**Player:** "Analyze my progress"

**AI:** "Looking at your training history...

📈 **Progress Over Time:**

**January Sessions (5):**
- Heavy backhand focus (60%)
- Working on fundamentals

**February Sessions (5):**
- More balanced approach
- Backhand: 20% (improvement!)
- Serve: 20% (new focus)
- Mental: 20% (added component)

**Trends:**
✅ **Improving:** Forehand (less frequent = likely improved)
⚠️ **Ongoing Work:** Backhand (still appearing but that's normal for technique refinement)

**Coach Feedback Themes:**
- "Backhand follow-through improving" 
- "Work on serve placement"
- "Trust your game plan"

You're making excellent progress! The shift toward more diverse training shows you're becoming a more complete player."

---

## Data Models

### Training Plan Schema

```typescript
interface TrainingPlan {
  id: string;
  playerId: string;
  createdAt: string;
  lastModified: string;
  
  focusAreas: string[];
  strengths: string[];
  areasForImprovement: string[];
  
  recommendations: string;
  suggestedDrills: string[];
  weeklyGoals: string[];
  
  sessionCount: number;
  lastReviewDate: string;
  progressNotes?: string;
  
  createdBy: string;
  version: number;
}
```

### Journal Analytics Schema

```typescript
interface JournalAnalytics {
  totalSessions: number;
  dateRange: { earliest: string; latest: string };
  areasFrequency: Record<string, number>;
  areasPercentage: Record<string, number>;
  recentFocus: string[];
  coachPointers: string[];
  playerReflections: string[];
  trends: {
    improving: string[];
    needsWork: string[];
  };
}
```

---

## Access & Security

### Authentication

✅ **Required**: Valid JWT token
✅ **Endpoint**: `POST /api/training/chat`
✅ **Middleware**: `authenticate` (any authenticated user)

### Data Privacy

- Players can only access their own journal data
- Training plans are player-specific
- No cross-player data sharing
- Analytics based only on player's own sessions

---

## User Interface

### Floating Chat Button

**Location:** Bottom-right corner of dashboard pages
- Journal page: Always visible
- Admin bookings page: Switches mode based on role

**Visual Indicators:**
- **Player Mode**: 🎾 Tennis ball icon + "Training Coach"
- **Admin Mode**: 🤖 Robot icon + "Booking Assistant"
- **Pulsing animation**: Green indicator when active

### Welcome Messages

**Player/Coach:**
```
Hi! I'm your Tennis Training AI Coach! 🎾 

I'm here to help you improve your game by analyzing 
your training sessions and creating personalized practice plans.

Try asking me:
• 'What should I be working on?'
• 'Analyze my progress'
• 'What are my strengths and weaknesses?'
• 'Create a training plan for me'
```

**Admin:**
```
Hi! I'm your Admin AI Assistant. 

I can help you manage bookings with natural language.
[booking management examples...]
```

---

## Testing

### Test Scenarios

1. **As a Player** (e.g., Ava Sullivan):
   ```
   - Navigate to /dashboard/journal
   - Click AI assistant button
   - Ask: "What should I work on?"
   - Verify: Gets data-driven recommendations
   - Ask: "Create a training plan"
   - Verify: Plan saved to database
   ```

2. **As an Admin**:
   ```
   - Navigate to /dashboard/admin/bookings
   - Click AI assistant button
   - Verify: Gets booking management interface
   - Test: "Show me today's bookings"
   - Verify: Admin tools work as expected
   ```

3. **Mode Switching**:
   ```
   - Log in as admin
   - Go to bookings → See admin mode
   - Go to journal → See training mode
   - Verify: Same component, different behavior
   ```

---

## Future Enhancements

### Potential Features

1. **Video Analysis Integration**
   - Upload swing videos
   - AI provides technique feedback
   - Compare with professional swings

2. **Match Performance Tracking**
   - Record match results
   - Analyze patterns in wins/losses
   - Identify clutch moments vs errors

3. **Goal Progress Visualization**
   - Charts showing improvement over time
   - Milestone achievements
   - Celebration notifications

4. **Drill Library**
   - Searchable database of drills
   - Video demonstrations
   - Difficulty ratings

5. **Coach Collaboration**
   - Coaches can review/edit AI plans
   - Add coach notes to training plans
   - Approve/reject AI recommendations

6. **Group Training Plans**
   - Plans for similar skill levels
   - Peer comparison (anonymized)
   - Group drill suggestions

---

## Troubleshooting

### Common Issues

#### 1. AI Not Switching Modes

**Cause:** User role not detected
**Solution:**
- Check `user.role` in auth context
- Verify token includes role claim
- Clear localStorage and re-login

#### 2. No Journal Data Found

**Cause:** Player has no journal entries
**Solution:**
- Coach needs to create journal entries first
- AI will acknowledge: "I don't see any journal entries yet..."

#### 3. Training Plans Not Saving

**Cause:** File permissions or locking
**Solution:**
- Check `backend/data/training-plans.json` exists
- Verify write permissions
- Check backend logs for errors

---

## Technical Stack

- **Model**: Gemini 3 Flash Preview
- **Backend**: Node.js/Express
- **Frontend**: React/Next.js
- **Storage**: File-based JSON (training-plans.json)
- **Auth**: JWT with role-based access
- **Data Source**: Journal entries + player profiles

---

## Conclusion

The Player Training AI Assistant transforms static journal entries into actionable training insights. By analyzing patterns, trends, and coach feedback, it provides players with data-driven recommendations that accelerate improvement and keep them motivated.

**Key Benefits:**
- 📊 Data-driven recommendations
- 🎯 Personalized training plans
- 📈 Progress tracking over time
- 🤝 Coach collaboration ready
- 🎾 Accessible from journal dashboard

**Status:** Legacy (replaced by [Orchestrator Agent](orchestrator.md))  
**Last Updated:** February 6, 2026  
**Version:** 1.0.0 (final)
