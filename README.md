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
- ✅ Progress tracking (saved to localStorage)
- ✅ Step-by-step instructions with typing animation
- ✅ Hint system (auto-dismisses on navigation)
- ✅ Navigation controls (Back/Next/Done/Restart)
- ✅ Responsive design

### 🎮 Progressive Unlocking System (NEW!)
- **Basic Level**: Always available - learn fundamentals
- **Standard Level**: Unlocks when Basic is completed
- **Advanced Level**: Unlocks when Standard is completed
- Progress saved per lesson
- Alert notification when unlocking new levels
- Level indicator in lesson title

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

## 📖 How Progressive Unlocking Works

1. **Start with Basic**: All lessons begin at Basic level
2. **Complete all steps**: Mark each step as "Done" ✓
3. **Unlock next level**: When all Basic steps are done, Standard unlocks
4. **Restart to switch levels**: Click "Restart" button to begin Standard
5. **Repeat for Advanced**: Complete Standard to unlock Advanced

Progress is saved automatically in your browser's localStorage.

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
- Level progress saved separately from step progress
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

**Levels not unlocking?**
- Complete ALL steps in current level (click "Done ✓" on each)
- Watch for unlock notification alert
- Click "Restart" to begin next level

**Animation issues?**
- Particles should stop at bubble bottom
- Red/blue should drift toward yellow when thinking
- Hard refresh (Ctrl+Shift+R) if animation glitches

---

Made with ❤️ for Cognitive Systems Academy™
