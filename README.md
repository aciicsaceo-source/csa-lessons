# CSA Lesson Player

Interactive lesson player for Cognitive Systems Academy™ AI Coding courses.

## 📦 What's Included

- `index.html` - Main HTML file
- `app.js` - JavaScript with all features (scratchblocks rendering, cortex animation, progress tracking)
- `styles.css` - Styling
- `csa_logo_jelly.jpeg` - Logo image
- `Y1_T1_W01.json` - Week 1: Talking Character
- `Y1_T1_W02.json` - Week 2: Guess My Number
- `Y1_T1_W03.json` - Week 3: Smart Pet
- `Y1_T1_W04.json` - Week 4: Reaction Timer

## 🚀 Quick Start

### Option 1: GitHub Pages (Recommended)
1. Create a new GitHub repository
2. Upload ALL files to the repository root
3. Go to Settings → Pages
4. Enable GitHub Pages (Source: main branch, root folder)
5. Access at: `https://yourusername.github.io/your-repo-name/`

### Option 2: Local Testing
1. Extract all files to a folder
2. Open `index.html` in a browser
3. Note: Scratchblocks requires internet connection to load from CDN

## 📚 Accessing Different Lessons

- Week 1: `index.html?lesson=Y1_T1_W01`
- Week 2: `index.html?lesson=Y1_T1_W02`
- Week 3: `index.html?lesson=Y1_T1_W03`
- Week 4: `index.html?lesson=Y1_T1_W04`

## ✨ Features

- ✅ Scratchblocks rendering with proper CSS
- ✅ Cortex animation (floating dots from cube centers)
- ✅ Progress tracking (saved to localStorage)
- ✅ Step-by-step instructions with typing animation
- ✅ Hint system
- ✅ Navigation controls (Back/Next/Done/Restart)
- ✅ Responsive design

## 🎨 Cortex Animation

- **Idle**: Slow floating dots from each cube (red/amber/blue)
- **Thinking**: Fast burst of dots when typing instructions
- Colors aligned with respective cube centers

## 🔧 Adding More Lessons

Create new JSON files following this format:

```json
{
  "year": "Year X",
  "term": "Term X",
  "week": "Week X",
  "title": "Lesson Title",
  "steps": [
    {
      "title": "Step title",
      "instruction": "What students should do",
      "hint": "Help if stuck",
      "blocks_text": "Scratch blocks code here"
    }
  ]
}
```

Name format: `Y{year}_T{term}_W{week}.json` (e.g., `Y1_T2_W05.json`)

## 📝 Notes

- All files must be in the same directory
- Requires internet connection for scratchblocks CDN
- Progress is saved per lesson in browser localStorage
- Compatible with all modern browsers

## 🐛 Troubleshooting

**Scratch blocks not showing?**
- Check browser console (F12) for errors
- Ensure CSS file is loading: https://scratchblocks.github.io/scratchblocks/scratchblocks.css
- Check if CDN is blocked by your network

**Lesson not loading?**
- Ensure JSON filename matches exactly (case-sensitive)
- Check JSON is valid (use jsonlint.com)
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

Made with ❤️ for Cognitive Systems Academy™
