/**
 * TYPE//TANK - Application State Machine & Screen Router
 * Seamless keyboard-first navigation, aspect ratio engine,
 * sortie debriefing, flight log inspection, and celebration FX.
 */

window.TypeTankApp = (function () {
  'use strict';

  // Available Screens
  const SCREENS = {
    LOGIN: 'screen-login',
    SETTINGS: 'screen-settings',
    INSTRUCTIONS: 'screen-instructions',
    GAME: 'screen-game',
    RESULT: 'screen-result',
    RECORDS: 'screen-records'
  };

  let currentScreen = SCREENS.LOGIN;
  let confettiAnimId = null;
  let activeLogFilter = 'all';

  /**
   * Application Initialization
   */
  function init() {
    // 1. Initialize Audio and Storage settings
    const soundEnabled = window.TypeTankStorage.getSoundEnabled();
    window.TypeTankAudio.setMuted(!soundEnabled);
    updateAudioHUDButton(soundEnabled);

    const crtEnabled = window.TypeTankStorage.getCrtEnabled();
    applyCrtScanlines(crtEnabled);

    const theme = window.TypeTankStorage.getTheme();
    applyTheme(theme);

    const aspectMode = window.TypeTankStorage.getAspectMode();
    applyAspectMode(aspectMode);

    // 2. Initialize Game Engine on Canvas
    const canvas = document.getElementById('battlefield-canvas');
    window.TypeTankGame.init(canvas, onSortieCompleted);

    // 3. Bind UI Event Listeners
    bindHeaderControls();
    bindScreenNavigation();
    bindSettingsControls();
    bindRecordsControls();
    bindGlobalKeyboard();

    // 4. Window Resize Recalibration
    window.addEventListener('resize', () => {
      window.TypeTankGame.recalibrateDimensions();
    });

    // 5. Check if operator already logged in
    const callsign = window.TypeTankStorage.getCallsign();
    document.getElementById('header-callsign-display').textContent = callsign;

    // Load initial screen
    navigateTo(SCREENS.LOGIN);
  }

  /**
   * Screen Navigation State Router
   */
  function navigateTo(screenId) {
    stopConfetti();

    // Hide all screens
    Object.values(SCREENS).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('screen-hidden');
        el.classList.remove('screen-active');
      }
    });

    // Show target screen
    const targetEl = document.getElementById(screenId);
    if (targetEl) {
      targetEl.classList.remove('screen-hidden');
      targetEl.classList.add('screen-active');
      currentScreen = screenId;
    }

    // Header HUD visibility
    const headerHud = document.getElementById('marquee-hud');
    if (headerHud) {
      if (screenId === SCREENS.GAME) {
        headerHud.classList.add('hud-combat-mode');
      } else {
        headerHud.classList.remove('hud-combat-mode');
      }
    }

    // Screen-specific setup
    switch (screenId) {
      case SCREENS.LOGIN:
        setupLoginScreen();
        break;
      case SCREENS.SETTINGS:
        setupSettingsScreen();
        break;
      case SCREENS.INSTRUCTIONS:
        setupInstructionsScreen();
        break;
      case SCREENS.GAME:
        setupGameScreen();
        break;
      case SCREENS.RESULT:
        // Result is populated via onSortieCompleted
        break;
      case SCREENS.RECORDS:
        setupRecordsScreen();
        break;
    }

    window.TypeTankAudio.playTerminalClick();
  }

  /**
   * 1. Login Screen Setup
   */
  function setupLoginScreen() {
    const input = document.getElementById('login-callsign-input');
    if (input) {
      input.value = window.TypeTankStorage.getCallsign();
      input.focus();
      input.select();
    }
  }

  function submitLogin() {
    const input = document.getElementById('login-callsign-input');
    const name = input ? input.value.trim().toUpperCase() : 'COMMANDER';
    const finalCallsign = window.TypeTankStorage.setCallsign(name || 'COMMANDER');

    document.getElementById('header-callsign-display').textContent = finalCallsign;
    navigateTo(SCREENS.SETTINGS);
  }

  /**
   * 2. Settings Screen Setup
   */
  function setupSettingsScreen() {
    const activeMode = window.TypeTankStorage.getArsenalMode();
    const matrix = window.TypeTankStorage.getCustomMatrix();

    selectArsenalMode(activeMode, false);
    syncMatrixCheckboxes(matrix);
    updateDynamicSampleTicker(activeMode);
  }

  function selectArsenalMode(modeNumber, updateMatrix = true) {
    window.TypeTankStorage.setArsenalMode(modeNumber);

    // Update active card visual
    document.querySelectorAll('.mode-card').forEach(card => {
      const m = parseInt(card.dataset.mode, 10);
      if (m === modeNumber) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    if (updateMatrix) {
      let matrix = { uppercase: false, numbers: false, specials: false };
      if (modeNumber === 2) matrix = { uppercase: true, numbers: false, specials: false };
      if (modeNumber === 3) matrix = { uppercase: true, numbers: true, specials: false };
      if (modeNumber === 4) matrix = { uppercase: true, numbers: true, specials: true };

      window.TypeTankStorage.setCustomMatrix(matrix);
      syncMatrixCheckboxes(matrix);
    }

    updateDynamicSampleTicker(modeNumber);
    window.TypeTankAudio.playTerminalClick();
  }

  function onMatrixToggleChanged() {
    const chkUpper = document.getElementById('matrix-uppercase').checked;
    const chkNum = document.getElementById('matrix-numbers').checked;
    const chkSpec = document.getElementById('matrix-specials').checked;

    const matrix = {
      uppercase: chkUpper,
      numbers: chkNum,
      specials: chkSpec
    };
    window.TypeTankStorage.setCustomMatrix(matrix);

    // Infer Mode from Matrix
    let inferredMode = 1;
    if (chkSpec) {
      inferredMode = 4;
    } else if (chkNum) {
      inferredMode = 3;
    } else if (chkUpper) {
      inferredMode = 2;
    }

    selectArsenalMode(inferredMode, false);
  }

  function syncMatrixCheckboxes(matrix) {
    const elUpper = document.getElementById('matrix-uppercase');
    const elNum = document.getElementById('matrix-numbers');
    const elSpec = document.getElementById('matrix-specials');

    if (elUpper) elUpper.checked = !!matrix.uppercase;
    if (elNum) elNum.checked = !!matrix.numbers;
    if (elSpec) elSpec.checked = !!matrix.specials;
  }

  function updateDynamicSampleTicker(modeNumber) {
    const ticker = document.getElementById('settings-sample-ticker');
    if (!ticker) return;

    const samples = {
      1: ['tank', 'radar', 'artillery', 'recon', 'flank', 'mortar', 'salvo', 'citadel', 'vector'],
      2: ['Tank', 'RadarX', 'DeltaForce', 'Vanguard', 'ApexPredator', 'IronDome', 'WarHammer'],
      3: ['Squad5', 'Tank99', 'v2.0', 'Defcon1', 'Sector7G', 'AH64', 'Tomahawk4', 'Su57'],
      4: ['[tank-01]', '(8+9)', '{cmd-9}', '!alert!', '<LOCK>', '*STRIKE*', '#DEFEND!', 'kill-9']
    };

    const words = samples[modeNumber] || samples[1];
    ticker.textContent = words.map(w => `[ ${w} ]`).join('   ');
  }

  /**
   * 3. Instructions Screen Setup
   */
  function setupInstructionsScreen() {
    // Everything is cleanly styled in HTML/CSS
  }

  /**
   * 4. Game Screen Setup
   */
  function setupGameScreen() {
    const mode = window.TypeTankStorage.getArsenalMode();
    const matrix = window.TypeTankStorage.getCustomMatrix();
    const callsign = window.TypeTankStorage.getCallsign();

    window.TypeTankGame.startSortie({
      mode,
      customMatrix: matrix,
      callsign
    });
  }

  /**
   * 5. Sortie Completion Handler & Debriefing
   */
  function onSortieCompleted(summary) {
    // 1. Record in Storage
    const { record, isPB } = window.TypeTankStorage.addFlightLog(summary);
    const prevPB = window.TypeTankStorage.getPersonalBest(summary.mode);

    // 2. Populate Debrief Metrics
    document.getElementById('debrief-callsign').textContent = summary.callsign;
    document.getElementById('debrief-score').textContent = String(summary.score).padStart(6, '0');
    document.getElementById('debrief-wpm').textContent = String(summary.wpm);
    document.getElementById('debrief-accuracy').textContent = `${summary.accuracy}%`;
    document.getElementById('debrief-words').textContent = String(summary.wordsDestroyed);
    document.getElementById('debrief-combo').textContent = `x${summary.maxCombo}`;

    const hullElem = document.getElementById('debrief-hull');
    if (hullElem) {
      if (summary.survived) {
        hullElem.textContent = summary.reason === 'user_abort' ? 'ABORTED' : 'ONLINE';
        hullElem.className = 'metric-val text-emerald';
      } else {
        hullElem.textContent = 'BREACHED';
        hullElem.className = 'metric-val text-coral';
      }
    }

    const statusTitle = document.getElementById('debrief-status-title');
    const statusBadge = document.getElementById('debrief-status-badge');
    const statusDot = document.getElementById('debrief-status-dot');
    if (summary.survived) {
      if (statusTitle) statusTitle.textContent = 'MISSION COMPLETE // SORTIE DEBRIEF';
      if (statusBadge) {
        statusBadge.textContent = 'SURVIVED';
        statusBadge.className = 'header-badge badge-emerald';
      }
      if (statusDot) statusDot.className = 'header-dot dot-emerald';
    } else {
      if (statusTitle) statusTitle.textContent = 'MISSION FAILED // HULL COMPROMISED';
      if (statusBadge) {
        statusBadge.textContent = 'DEFEATED';
        statusBadge.className = 'header-badge badge-coral';
      }
      if (statusDot) statusDot.className = 'header-dot dot-coral';
    }

    const modeLabels = { 1: 'ALPHA', 2: 'BRAVO', 3: 'CHARLIE', 4: 'DELTA' };
    document.getElementById('debrief-mode').textContent = `MODE ${summary.mode} [${modeLabels[summary.mode] || 'CUSTOM'}]`;

    // 3. PB / Celebration Banner
    const recordBanner = document.getElementById('debrief-record-banner');
    const pbComparisonBox = document.getElementById('debrief-pb-comparison');

    if (isPB) {
      if (recordBanner) {
        recordBanner.classList.remove('hidden');
        recordBanner.innerHTML = '★ ★ ★ NEW PERSONAL BEST RECORD ACHIEVED! ★ ★ ★';
      }
      if (pbComparisonBox) {
        pbComparisonBox.innerHTML = `<span class="text-amber">OUTSTANDING PERFORMANCE OPERATOR!</span> You set a new combat benchmark for this arsenal tier.`;
      }
      // Audio & Confetti
      window.TypeTankAudio.playRecordFanfare();
      startConfetti();
    } else {
      if (recordBanner) {
        recordBanner.classList.add('hidden');
      }
      if (pbComparisonBox && prevPB) {
        const delta = prevPB.bestScore - summary.score;
        pbComparisonBox.innerHTML = `PREVIOUS BEST: <strong class="text-amber">${prevPB.bestScore} PTS</strong> (${prevPB.bestWpm} WPM).<br>DELTA NEEDED TO SURPASS: <span class="text-coral">+${delta} PTS</span>.`;
      }
    }

    navigateTo(SCREENS.RESULT);
  }

  /**
   * 6. Records Screen Setup (Flight Logs)
   */
  function setupRecordsScreen() {
    renderLifetimeStats();
    renderModeBestsQuad();
    renderFlightLogTable();
  }

  function renderLifetimeStats() {
    const stats = window.TypeTankStorage.getLifetimeStats();
    document.getElementById('stat-pb-score').textContent = String(stats.bestScore).padStart(6, '0');
    document.getElementById('stat-max-wpm').textContent = String(stats.maxWpm);
    document.getElementById('stat-peak-acc').textContent = `${stats.peakAccuracy}%`;
    document.getElementById('stat-total-words').textContent = String(stats.totalWordsDestroyed);
  }

  function renderModeBestsQuad() {
    const quad = window.TypeTankStorage.getModeBests();
    for (let m = 1; m <= 4; m++) {
      const elScore = document.getElementById(`mode-best-score-${m}`);
      const elWpm = document.getElementById(`mode-best-wpm-${m}`);
      if (elScore) elScore.textContent = `${quad[m].score} PTS`;
      if (elWpm) elWpm.textContent = `${quad[m].wpm} WPM`;
    }
  }

  function renderFlightLogTable() {
    const tbody = document.getElementById('flight-logs-tbody');
    if (!tbody) return;

    let logs = window.TypeTankStorage.getFlightLogs();
    if (activeLogFilter !== 'all') {
      const modeNum = parseInt(activeLogFilter, 10);
      logs = logs.filter(l => l.mode === modeNum);
    }

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="log-empty-msg">[ NO FLIGHT LOGS RECORDED FOR THIS CRITERIA ]</td></tr>`;
      return;
    }

    const modeNames = { 1: 'ALPHA', 2: 'BRAVO', 3: 'CHARLIE', 4: 'DELTA' };

    tbody.innerHTML = logs.map(l => {
      const pbBadge = l.isPB ? `<span class="badge-pb">★ PB</span>` : '';
      return `
        <tr>
          <td>${l.dateStr}</td>
          <td><span class="badge-mode">M${l.mode}:${modeNames[l.mode] || 'CUSTOM'}</span></td>
          <td class="log-score">${String(l.score).padStart(6, '0')} ${pbBadge}</td>
          <td>${l.wpm}</td>
          <td>${l.accuracy}%</td>
          <td>x${l.maxCombo}</td>
          <td>${l.wordsDestroyed}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Full-screen Arcade Confetti System
   */
  function startConfetti() {
    stopConfetti();
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#00ff66', '#ff2244', '#ffea00', '#00f0ff', '#ffffff', '#ff00aa'];

    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 4,
        vy: 2.5 + Math.random() * 5,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let elapsedFrames = 0;

    function renderConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      elapsedFrames++;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (elapsedFrames < 280) {
        confettiAnimId = requestAnimationFrame(renderConfetti);
      } else {
        stopConfetti();
      }
    }

    confettiAnimId = requestAnimationFrame(renderConfetti);
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Header Controls & Aspect Ratio Handling
   */
  function bindHeaderControls() {
    // 1. Audio Mute Toggle
    const btnAudio = document.getElementById('btn-toggle-audio');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const currentMuted = window.TypeTankAudio.isAudioMuted();
        const nextState = currentMuted; // toggle
        window.TypeTankAudio.setMuted(!nextState);
        window.TypeTankStorage.setSoundEnabled(nextState);
        updateAudioHUDButton(nextState);
        if (nextState) window.TypeTankAudio.playTerminalClick();
      });
    }

    // 2. CRT Scanlines Toggle
    const btnCrt = document.getElementById('btn-toggle-crt');
    if (btnCrt) {
      btnCrt.addEventListener('click', () => {
        const isCurrent = window.TypeTankStorage.getCrtEnabled();
        const nextState = !isCurrent;
        window.TypeTankStorage.setCrtEnabled(nextState);
        applyCrtScanlines(nextState);
        window.TypeTankAudio.playTerminalClick();
      });
    }

    // 3. Aspect Ratio Toggle Button (cycles AUTO -> 16:9 -> 4:3 -> AUTO)
    const btnAspect = document.getElementById('btn-toggle-aspect');
    if (btnAspect) {
      btnAspect.addEventListener('click', () => {
        const currentMode = window.TypeTankStorage.getAspectMode();
        let nextMode = 'auto';
        if (currentMode === 'auto') nextMode = '16:9';
        else if (currentMode === '16:9') nextMode = '4:3';
        else nextMode = 'auto';

        applyAspectMode(nextMode);
        window.TypeTankAudio.playTerminalClick();
      });
    }

    // 4. Callsign Switcher
    const btnCallsign = document.getElementById('btn-switch-callsign');
    if (btnCallsign) {
      btnCallsign.addEventListener('click', () => {
        if (window.TypeTankGame.isRunning()) {
          window.TypeTankGame.abortSortie();
        }
        navigateTo(SCREENS.LOGIN);
      });
    }

    // 5. Theme Toggle Button
    const btnTheme = document.getElementById('btn-toggle-theme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const current = window.TypeTankStorage.getTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        window.TypeTankAudio.playTerminalClick();
      });
    }

    // 6. Combat Abort HUD Button
    const btnAbort = document.getElementById('btn-combat-abort');
    if (btnAbort) {
      btnAbort.addEventListener('click', () => {
        window.TypeTankGame.abortSortie();
      });
    }
  }

  function applyTheme(theme) {
    window.TypeTankStorage.setTheme(theme);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    const btn = document.getElementById('btn-toggle-theme');
    if (btn) {
      btn.textContent = theme === 'dark' ? '🌙 DARK MODE' : '☀️ LIGHT MODE';
    }
  }

  function updateAudioHUDButton(enabled) {
    const btn = document.getElementById('btn-toggle-audio');
    if (btn) {
      btn.textContent = enabled ? '🔊 SOUND: ON' : '🔇 MUTED';
      btn.className = enabled ? 'hud-btn active' : 'hud-btn muted';
    }
  }

  function applyCrtScanlines(enabled) {
    const overlay = document.getElementById('crt-overlay');
    const btn = document.getElementById('btn-toggle-crt');
    if (overlay) {
      if (enabled) {
        overlay.classList.remove('crt-disabled');
      } else {
        overlay.classList.add('crt-disabled');
      }
    }
    if (btn) {
      btn.textContent = enabled ? '📺 CRT: ON' : '📺 CRT: OFF';
      btn.className = enabled ? 'hud-btn active' : 'hud-btn';
    }
  }

  function applyAspectMode(mode) {
    window.TypeTankStorage.setAspectMode(mode);
    const cabinet = document.getElementById('arcade-cabinet');
    const btn = document.getElementById('btn-toggle-aspect');

    if (cabinet) {
      cabinet.classList.remove('aspect-auto', 'aspect-16-9', 'aspect-4-3');
      if (mode === '16:9') cabinet.classList.add('aspect-16-9');
      else if (mode === '4:3') cabinet.classList.add('aspect-4-3');
      else cabinet.classList.add('aspect-auto');
    }

    if (btn) {
      btn.textContent = `🖥️ ASPECT: ${mode.toUpperCase()}`;
    }

    // Update settings buttons if present
    document.querySelectorAll('.aspect-btn').forEach(b => {
      if (b.dataset.aspect === mode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Re-scale canvas dimensions & coordinate calibration immediately
    setTimeout(() => {
      window.TypeTankGame.recalibrateDimensions();
    }, 30);
  }

  /**
   * Navigation Buttons Binding
   */
  function bindScreenNavigation() {
    // Login Screen Submit
    const btnLoginConfirm = document.getElementById('btn-login-confirm');
    if (btnLoginConfirm) {
      btnLoginConfirm.addEventListener('click', submitLogin);
    }

    const inputLogin = document.getElementById('login-callsign-input');
    if (inputLogin) {
      inputLogin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitLogin();
        }
      });
    }

    // Settings -> Instructions
    const btnSettingsNext = document.getElementById('btn-settings-next');
    if (btnSettingsNext) {
      btnSettingsNext.addEventListener('click', () => {
        navigateTo(SCREENS.INSTRUCTIONS);
      });
    }

    // Settings -> Records
    const btnSettingsRecords = document.getElementById('btn-settings-records');
    if (btnSettingsRecords) {
      btnSettingsRecords.addEventListener('click', () => {
        navigateTo(SCREENS.RECORDS);
      });
    }

    // Instructions -> Game (Engage)
    const btnEngage = document.getElementById('btn-instructions-engage');
    if (btnEngage) {
      btnEngage.addEventListener('click', () => {
        navigateTo(SCREENS.GAME);
      });
    }

    // Result -> Replay
    const btnReplay = document.getElementById('btn-debrief-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        navigateTo(SCREENS.GAME);
      });
    }

    // Result -> Records
    const btnResultRecords = document.getElementById('btn-debrief-records');
    if (btnResultRecords) {
      btnResultRecords.addEventListener('click', () => {
        navigateTo(SCREENS.RECORDS);
      });
    }

    // Result -> Settings
    const btnResultSettings = document.getElementById('btn-debrief-settings');
    if (btnResultSettings) {
      btnResultSettings.addEventListener('click', () => {
        navigateTo(SCREENS.SETTINGS);
      });
    }

    // Records -> Back to Settings
    const btnRecordsBack = document.getElementById('btn-records-back');
    if (btnRecordsBack) {
      btnRecordsBack.addEventListener('click', () => {
        navigateTo(SCREENS.SETTINGS);
      });
    }
  }

  /**
   * Settings Controls (Arsenal Cards & Matrix Checkboxes)
   */
  function bindSettingsControls() {
    // Mode Cards Click
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const modeNum = parseInt(card.dataset.mode, 10);
        selectArsenalMode(modeNum, true);
      });
    });

    // Matrix Checkboxes
    ['matrix-uppercase', 'matrix-numbers', 'matrix-specials'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', onMatrixToggleChanged);
      }
    });

    // Aspect buttons in Settings
    document.querySelectorAll('.aspect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyAspectMode(btn.dataset.aspect);
      });
    });
  }

  /**
   * Flight Logs Records Controls (Filter buttons & Purge)
   */
  function bindRecordsControls() {
    document.querySelectorAll('.log-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLogFilter = btn.dataset.filter;
        renderFlightLogTable();
        window.TypeTankAudio.playTerminalClick();
      });
    });

    const btnPurge = document.getElementById('btn-records-purge');
    if (btnPurge) {
      btnPurge.addEventListener('click', () => {
        if (confirm('CONFIRM PURGE: Clear all operator flight records from memory?')) {
          window.TypeTankStorage.purgeFlightLogs();
          setupRecordsScreen();
          window.TypeTankAudio.playDamage();
        }
      });
    }
  }

  /**
   * Global Keyboard Router & Shortcuts
   */
  function bindGlobalKeyboard() {
    window.addEventListener('keydown', (e) => {
      // 1. GAMEPLAY KEYSTROKES
      if (currentScreen === SCREENS.GAME) {
        if (e.key === 'Escape') {
          e.preventDefault();
          window.TypeTankGame.abortSortie();
          return;
        }

        // Prevent browser scrolling on Space during combat
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          window.TypeTankGame.handleKeystroke(' ');
          return;
        }

        // Forward normal typing keys
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          window.TypeTankGame.handleKeystroke(e.key);
          return;
        }
        return;
      }

      // 2. NAVIGATION SHORTCUTS OUTSIDE COMBAT
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        // Allow normal input behavior in textfields
        return;
      }

      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleAdvanceKey();
        return;
      }

      if (currentScreen === SCREENS.RESULT) {
        if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          navigateTo(SCREENS.RECORDS);
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          navigateTo(SCREENS.SETTINGS);
          return;
        }
      }
    });
  }

  function handleAdvanceKey() {
    switch (currentScreen) {
      case SCREENS.LOGIN:
        submitLogin();
        break;
      case SCREENS.SETTINGS:
        navigateTo(SCREENS.INSTRUCTIONS);
        break;
      case SCREENS.INSTRUCTIONS:
        navigateTo(SCREENS.GAME);
        break;
      case SCREENS.RESULT:
        navigateTo(SCREENS.GAME); // Replay sortie
        break;
      case SCREENS.RECORDS:
        navigateTo(SCREENS.SETTINGS);
        break;
    }
  }

  return {
    init,
    navigateTo,
    SCREENS
  };
})();

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.TypeTankApp.init();
});
