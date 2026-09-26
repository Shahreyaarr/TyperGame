# 🎯 TyperGame (TYPE//TANK)

<div align="center">

  [![Live Demo](https://img.shields.io/badge/Live%20Demo-typegame.web.app-00f0ff?style=for-the-badge&logo=google-chrome&logoColor=white)](https://typegame.web.app)
  [![Firebase Hosting](https://img.shields.io/badge/Hosted%20on-Firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)](https://typegame.web.app)
  [![GitHub Repo](https://img.shields.io/badge/GitHub-Shahreyaarr%2FTyperGame-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Shahreyaarr/TyperGame)
  [![Status](https://img.shields.io/badge/Status-Active%20%2F%20Deployed-00e676?style=for-the-badge)](https://typegame.web.app)

  <br />

  <h3>⚡ Tactical Ballistic Keyboard Combat System ⚡</h3>
  <p>Defend the perimeter, lock on targets, and fire ballistic strikes by typing with speed and pinpoint accuracy.</p>

  <p>
    <a href="https://typegame.web.app"><strong>🌐 Play Online (Live Demo)</strong></a> ·
    <a href="#-key-features">Key Features</a> ·
    <a href="#-controls">Controls</a> ·
    <a href="#-tech-stack">Tech Stack</a> ·
    <a href="#-local-development">Local Setup</a>
  </p>
</div>

---

## 🚀 Live Deployment

The game is deployed and available globally at:

### 🔗 **[https://typegame.web.app](https://typegame.web.app)**

---

## 🕹️ About The Game

**TyperGame (`TYPE//TANK`)** is an arcade-style typing defense game designed to sharpen your keyboard speed, reaction time, and precision. Incoming enemy drones, missiles, and armored units descend towards your command station with designated code words. Type the matching target word to lock your turret, unleash ballistic artillery, and vaporize hostile units before they breach your hull.

---

## ✨ Key Features

- **🎯 4 Tactical Arsenal Modes**:
  - **Cadet (Easy)**: Short words, standard descent speed, ideal for warmups.
  - **Sergeant (Medium)**: Moderate vocabulary, multi-target pressure.
  - **Commander (Hard)**: Extended technical words, faster projectiles.
  - **Ghost Protocol (Extreme)**: High-speed swarms and complex phrase defense.

- **🔊 Web Audio API Sound Engine**:
  - Procedural, synthesized retro audio effects (laser fire, explosions, combo chimes, alerts).
  - 100% self-contained — no bulky external MP3/WAV files required.

- **📊 Combat HUD & Real-Time Telemetry**:
  - Real-time **Words Per Minute (WPM)** computation.
  - Precision **Accuracy %** and dynamic **Combo Multipliers (x2, x3, x5)**.
  - Hull integrity defense gauge with visual damage alarms.

- **📺 Arcade Cabinet & Display Controls**:
  - **CRT Scanline & Phosphor Overlay**: Toggle vintage arcade monitor visuals.
  - **Aspect Ratio Switcher**: Auto, 16:9 widescreen, or 4:3 classic box.
  - **Theme Engine**: Instant toggle between Dark Ops (Cyberpunk) and Light Command themes.

- **💾 Persistent Operator Records**:
  - LocalStorage-backed high score leaderboards and sortie logs.
  - Personalized operator callsigns and preference persistence.

- **🎉 Visual Effects**:
  - HTML5 Canvas particle explosions, muzzle flashes, and victory confetti.

---

## 🎮 Controls & Shortcuts

| Key / Action | Command / Function |
| :--- | :--- |
| **Typing (A–Z)** | Target lock and fire ballistic cannon rounds |
| **ESC** | Abort current combat sortie / Return to tactical screen |
| **Enter** | Confirm / Launch mission / Acknowledge debrief |
| **Header Buttons** | Toggle Sound, CRT Filter, Aspect Ratio, Theme, and Operator Callsign |

---

## 🛠️ Tech Stack

- **Core**: Vanilla HTML5, CSS3, and JavaScript (ES6+ modular architecture)
- **Graphics**: HTML5 `<canvas>` rendering engine with 60 FPS animation loop
- **Audio**: Web Audio API (Synthesized oscillators & noise nodes)
- **Typography**: Google Fonts (*JetBrains Mono*, *Orbitron*, *Rajdhani*, *Outfit*)
- **Hosting**: Google Firebase Hosting

---

## 📂 Project Structure

```text
TyperGame/
├── index.html          # Main arcade cabinet and screen viewports
├── style.css           # Glassmorphism, cyber aesthetics & responsive layouts
├── firebase.json       # Firebase Hosting configuration
├── .firebaserc         # Firebase project binding (typergame)
├── .gitignore          # Git exclusion rules
├── README.md           # Documentation
└── js/
    ├── app.js          # Screen router, modal controllers & UI event glue
    ├── audio.js        # Web Audio API synthesizer
    ├── game.js         # Core physics, canvas rendering & target tracking
    ├── storage.js      # Callsign, high scores & preferences storage
    └── words.js        # Vocabulary dictionary categorized by difficulty
```

---

## 💻 Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shahreyaarr/TyperGame.git
   cd TyperGame
   ```

2. **Run locally:**
   Since it uses pure vanilla JavaScript, you can open `index.html` directly in any modern browser, or use a local dev server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```

3. **Deploy to Firebase:**
   ```bash
   npx firebase-tools deploy --only hosting --project typergame
   ```

---

## 👤 Author

**Shahreyaarr**
- GitHub: [@Shahreyaarr](https://github.com/Shahreyaarr)
- Repository: [https://github.com/Shahreyaarr/TyperGame](https://github.com/Shahreyaarr/TyperGame)
- Live Game: [https://typegame.web.app](https://typegame.web.app)

---

<div align="center">
  <sub>Built with ❤️ and pure vanilla web technologies.</sub>
</div>
