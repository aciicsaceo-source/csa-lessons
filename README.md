# CSA Lesson Player

Interactive lesson player for Cognitive Systems Academy™ AI Coding courses with progressive difficulty unlocking.

## 📦 What's Included

- `index.html` - Main HTML file
- `app.js` - JavaScript with all features
- `styles.css` - Styling
- `csa_logo_jelly.jpeg` - Logo image
- `Y1_T1_W01.json` - Week 1: Talking Character
- `Y1_T1_W02.json` - Week 2: Guess My Number
- `Y1_T1_W03.json` - Week 3: Smart Pet (Basic/Standard/Advanced)
- `Y1_T1_W04.json` - Week 4: Reaction Timer (Basic/Standard/Advanced)

## 🚀 Quick Start

### GitHub Pages Deployment
1. Create a new GitHub repository
2. Upload ALL files to the repository root
3. Go to Settings → Pages
4. Enable GitHub Pages (Source: main branch, root folder)
5. Access at: `https://yourusername.github.io/your-repo-name/`

## 📚 Accessing Different Lessons

- Week 1: `index.html?lesson=Y1_T1_W01`
- Week 2: `index.html?lesson=Y1_T1_W02`
- Week 3: `index.html?lesson=Y1_T1_W03`
- Week 4: `index.html?lesson=Y1_T1_W04`

## ✨ Features

### Core Features
- ✅ Scratchblocks rendering with proper CSS
- ✅ Cortex animation with intelligent particle behavior
- ✅ Progress bar tracking (auto-updates as you progress through steps)
- ✅ Step-by-step instructions with typing animation
- ✅ Hint system (auto-dismisses on navigation)
- ✅ Navigation controls (Back/Next/Complete Level/Restart)
- ✅ Responsive design

### 🎮 Progressive Unlocking System
**How it works:**
1. Navigate through steps using "Next →" button
2. Progress bar fills automatically as you advance
3. On the **final step only**, "Complete Level ✓" button appears
4. Click "Complete Level ✓" to unlock next difficulty
5. Prompt asks: "Are you ready for [Standard/Advanced] level?"
   - **Yes** → Automatically transitions to next level
   - **No** → Stay on current level, try next level later via Restart

**Level Progression:**
- **Basic Level**: Always available - learn fundamentals
- **Standard Level**: Unlocks when Basic is completed
- **Advanced Level**: Unlocks when Standard is completed
- Progress saved per lesson
- Level indicator in lesson title: `[Basic]`, `[Standard]`, `[Advanced]`

### 🎨 Enhanced Cortex Animation
**Idle Mode** (slow, calm):
- Dots float gently upward from each cube
- Red, amber, and blue dots from respective cubes
- Low opacity, small size

**Thinking Mode** (fast, energetic):
- Burst of faster, brighter dots
- Red and blue dots **drift toward yellow** (simulating "joining hands")
- Stops at bubble bottom (no overlap with chat)
- Reduced intensity for cleaner look
- More amber/yellow dots (60% amber, 20% blue, 20% red)

**Precise Positioning**:
- Red cube: shifted left 1.1cm (~41.6px)
- Amber cube: shifted left 0.8cm (~30.2px)
- Blue cube: shifted left 0.3cm (~11.3px)

## 🎯 Student Experience Flow

### Multi-Level Lessons (W03, W04):
1. Start Week 3 → See **[Basic]** in title
2. Navigate through steps with "Next →"
3. Progress bar fills automatically (Step 1/4 → 2/4 → 3/4 → 4/4)
4. On **final step**, "Complete Level ✓" button appears
5. Click "Complete Level ✓"
6. Prompt: "🎉 Congratulations! You've completed Basic level! Standard level is now unlocked. Are you ready for Standard level?"
7. Click **OK** → Auto-loads Standard level from Step 1
8. Click **Cancel** → Stay on Basic, can restart anytime to try Standard

### Single-Level Lessons (W01, W02):
- Simple progression through steps
- No level system
- Progress bar shows completion

## 🔧 Creating Multi-Level Lessons

Use this JSON structure for lessons with difficulty levels:

```json
{
  "year": "Year X",
  "term": "Term X",
  "week": "Week X",
  "title": "Lesson Title",
  "steps_basic": [
    {
      "title": "Step title",
      "instruction": "Basic instruction",
      "hint": "Help if stuck",
      "blocks_text": "Scratch blocks"
    }
  ],
  "steps_standard": [
    {
      "title": "Step title",
      "instruction": "Standard instruction",
      "hint": "Help if stuck",
      "blocks_text": "Scratch blocks"
    }
  ],
  "steps_advanced": [
    {
      "title": "Step title",
      "instruction": "Advanced instruction",
      "hint": "Help if stuck",
      "blocks_text": "Scratch blocks"
    }
  ]
}
```

**For single-level lessons**, use `"steps"` instead of `"steps_basic"`.

## 📝 Technical Notes

- All files must be in the same directory
- Requires internet connection for scratchblocks CDN
- Progress saved per lesson in browser localStorage
- Level progress saved separately
- Progress bar updates automatically based on current step
- "Complete Level ✓" button only appears on final step
- Compatible with all modern browsers

## 🎯 Animation Technical Details

**Particle Spawn Rates**:
- Idle: 200ms between emits
- Thinking: 40ms between emits (5x faster)

**Particle Movement**:
- Idle speed: 0.3-0.5 px/frame
- Thinking speed: 1.2-3.0 px/frame
- Red/blue horizontal drift: 0.008 * distance to yellow

**Collision Detection**:
- Particles stop at bubble bottom Y coordinate
- Prevents visual overlap with chat text

## 🐛 Troubleshooting

**Scratch blocks not showing?**
- Check browser console (F12) for errors
- Ensure CSS loads: https://scratchblocks.github.io/scratchblocks/scratchblocks.css
- Check if CDN is blocked by network

**Level not unlocking?**
- Must reach the **final step** of current level
- "Complete Level ✓" button only appears on last step
- Click "Complete Level ✓" to trigger unlock prompt

**Want to try next level without prompt?**
- Click "Restart" button to switch between unlocked levels

---

Made with ❤️ for Cognitive Systems Academy™
