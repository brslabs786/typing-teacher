# KeySprint 🏎️

**Master Your Keyboard. Win Every Race.**

A complete, gamified typing learning website built with pure HTML5, CSS3, and Vanilla JavaScript. No frameworks, no backend, no dependencies — deployable directly on GitHub Pages.

---

## Features

| Feature | Description |
|---------|-------------|
| 🏎️ **Racing Game** | Race 3 AI opponents across a live 2D track. Your car moves as you type correctly. |
| 📚 **Practice Mode** | 14 structured lessons from beginner home-row to advanced paragraphs, with a live visual keyboard. |
| ⏱️ **Speed Test** | 30-second or 60-second timed tests with live WPM and accuracy. |
| 🎯 **Adaptive Learning** | Tracks per-key accuracy and auto-generates targeted drills for your weakest keys. |
| 📈 **Progress Tracking** | WPM history chart, session summaries, goals, and persistent localStorage stats. |
| 📊 **Results Screen** | Detailed post-session results with race position, personal best, and next recommended action. |

---

## Project Structure

```
keysprint/
├── index.html              # Single-page app shell
├── css/
│   ├── style.css           # Design tokens, base styles, shared components
│   ├── race.css            # Race track, cars, countdown, test UI, keyboard
│   └── responsive.css      # Mobile breakpoints, accessibility, print
└── js/
    ├── storage.js          # localStorage persistence layer
    ├── typing-engine.js    # Core WPM/accuracy engine + passage library
    ├── adaptive-learning.js # Weak-key detection + targeted practice generation
    ├── statistics.js       # WPM chart, session summaries, results screen
    ├── race.js             # Bot simulation, countdown, requestAnimationFrame loop
    ├── practice.js         # Lesson library, visual keyboard renderer
    └── app.js              # Main controller: view routing, event wiring
```

---

## How to Run

**Locally:** Open `keysprint/index.html` directly in your browser.  
**GitHub Pages:** Push to a repo, enable Pages from the `main` branch root (or point to the `keysprint/` folder).

---

## WPM Formula

```
WPM = (Correct characters ÷ 5) ÷ elapsed time in minutes
```

Consistent across the racing game, speed test, and practice mode.

---

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). No polyfills needed.
