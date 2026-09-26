/**
 * TYPE//TANK - Next-Gen 60 FPS Ballistic Defense Engine
 * High-Production Multicolor Visuals, 180° Railgun Turret,
 * Ballistic Plasma Lasers, Lowest-First Lock, and Dynamic Particle FX.
 */

window.TypeTankGame = (function () {
  'use strict';

  // Engine State
  let canvas = null;
  let ctx = null;
  let animationFrameId = null;
  let isRunning = false;
  let isPaused = false;

  // Options & Callbacks
  let mode = 1;
  let customMatrix = null;
  let callsign = 'COMMANDER';
  let onSortieEndCallback = null;

  // Dimensions & Coordinate Calibration
  let width = 800;
  let height = 600;
  let dpr = 1;
  let perimeterY = 540;

  // Timers
  let lastTime = 0;
  let sortieStartTime = 0;
  let nextSpawnTime = 0;
  let nextBonusSpawnTime = 0;

  // Entities
  let fallingWords = [];
  let bullets = [];
  let particles = [];
  let floatingTexts = [];
  let activeTarget = null;

  // Futuristic Tank & Railgun Turret
  let tank = {
    x: 400,
    y: 570,
    turretRadius: 36,
    barrelLength: 52,
    barrelWidth: 12,
    angle: -Math.PI / 2, // -90 deg (straight up)
    targetAngle: -Math.PI / 2,
    recoil: 0,
    muzzleFlash: 0,
    reactorPulse: 0
  };

  // Combat Telemetry
  let hullIntegrity = 100;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let correctKeystrokes = 0;
  let totalKeystrokes = 0;
  let wordsDestroyed = 0;
  let redBonusDestroyed = 0;

  // Screen Shake FX
  let shakeIntensity = 0;
  let shakeDuration = 0;

  function getDifficultyModifiers(elapsedSec) {
    const speedFactor = 1 + Math.min(1.4, elapsedSec / 85);
    const baseSpawnInterval = Math.max(1100, 2600 - (elapsedSec * 18));
    return { speedFactor, spawnInterval: baseSpawnInterval };
  }

  function init(canvasElement, onSortieEnd) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d', { alpha: false });
    onSortieEndCallback = onSortieEnd;
    recalibrateDimensions();
  }

  function recalibrateDimensions() {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;

    width = Math.max(480, Math.floor(rect.width));
    height = Math.max(360, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }

    perimeterY = height - 60;
    tank.x = width / 2;
    tank.y = height - 20;

    fallingWords.forEach(w => {
      const maxX = width - w.calculatedWidth - 30;
      if (w.x > maxX) {
        w.x = Math.max(30, maxX);
      }
    });
  }

  function startSortie(options = {}) {
    stopSortie();

    mode = options.mode || 1;
    customMatrix = options.customMatrix || null;
    callsign = options.callsign || 'COMMANDER';

    hullIntegrity = 100;
    score = 0;
    combo = 0;
    maxCombo = 0;
    correctKeystrokes = 0;
    totalKeystrokes = 0;
    wordsDestroyed = 0;
    redBonusDestroyed = 0;

    fallingWords = [];
    bullets = [];
    particles = [];
    floatingTexts = [];
    activeTarget = null;

    tank.angle = -Math.PI / 2;
    tank.targetAngle = -Math.PI / 2;
    tank.recoil = 0;
    tank.muzzleFlash = 0;
    tank.reactorPulse = 0;

    shakeIntensity = 0;
    shakeDuration = 0;

    window.TypeTankWords.resetExclusions();
    recalibrateDimensions();

    const now = performance.now();
    sortieStartTime = now;
    lastTime = now;
    nextSpawnTime = now + 500;
    nextBonusSpawnTime = now + 10000 + Math.random() * 8000;

    isRunning = true;
    isPaused = false;

    spawnWord(false);

    animationFrameId = requestAnimationFrame(gameLoop);
    updateHUD();
  }

  function abortSortie() {
    if (!isRunning) return;
    terminateSortie('SORTIE_ABORTED');
  }

  function stopSortie() {
    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function spawnWord(isBonus = false) {
    if (!isRunning) return;

    const existingInitials = fallingWords.map(w => w.word.charAt(0));
    const wordText = window.TypeTankWords.getRandomWord(mode, isBonus, existingInitials, customMatrix);
    if (!wordText) return;

    if (isBonus) {
      window.TypeTankWords.setActiveBonusInitial(wordText.charAt(0));
      window.TypeTankAudio.playBonusSpawn();
    }

    ctx.font = '700 18px "JetBrains Mono", monospace';
    const textMetrics = ctx.measureText(wordText);
    const wordWidth = Math.ceil(textMetrics.width);

    const margin = 40;
    const availableWidth = width - wordWidth - margin * 2;
    let spawnX = margin + Math.random() * Math.max(10, availableWidth);

    for (let attempts = 0; attempts < 5; attempts++) {
      const tooClose = fallingWords.some(w => w.y < 130 && Math.abs(w.x - spawnX) < wordWidth + 25);
      if (!tooClose) break;
      spawnX = margin + Math.random() * Math.max(10, availableWidth);
    }

    const elapsedSec = (performance.now() - sortieStartTime) / 1000;
    const { speedFactor } = getDifficultyModifiers(elapsedSec);

    let baseSpeed = isBonus ? (48 + Math.random() * 16) : (28 + Math.random() * 12);
    let finalSpeed = baseSpeed * speedFactor;

    // Multicolor accent selection per word
    const colors = ['#00b4d8', '#a855f7', '#10b981', '#f59e0b'];
    const accentColor = isBonus ? '#ff3366' : colors[Math.floor(Math.random() * colors.length)];

    const wordObj = {
      id: 'w_' + Math.random().toString(36).substr(2, 7),
      word: wordText,
      typedIndex: 0,
      x: spawnX,
      y: -30,
      speed: finalSpeed / 60,
      isBonus: isBonus,
      calculatedWidth: wordWidth,
      accentColor: accentColor,
      charPositions: []
    };

    calculateCharPositions(wordObj);
    fallingWords.push(wordObj);

    if (isBonus) {
      floatingTexts.push({
        text: '▲ PRIORITY THREAT DETECTED ▲',
        x: width / 2,
        y: 65,
        color: '#ff3366',
        alpha: 1.0,
        dy: -0.3,
        fontSize: '14px',
        fontWeight: '900'
      });
    }
  }

  function calculateCharPositions(wordObj) {
    ctx.font = '700 18px "JetBrains Mono", monospace';
    wordObj.charPositions = [];
    let curX = 0;
    for (let i = 0; i < wordObj.word.length; i++) {
      const charStr = wordObj.word[i];
      const charW = ctx.measureText(charStr).width;
      wordObj.charPositions.push({
        char: charStr,
        offset: curX,
        width: charW,
        centerX: curX + charW / 2
      });
      curX += charW;
    }
    wordObj.calculatedWidth = curX;
  }

  function handleKeystroke(key) {
    if (!isRunning || isPaused) return false;
    if (key.length !== 1) return false;

    totalKeystrokes++;

    // 1. Locked Target check
    if (activeTarget && fallingWords.includes(activeTarget)) {
      const expectedChar = activeTarget.word.charAt(activeTarget.typedIndex);
      if (key === expectedChar) {
        processKeystrokeHit(activeTarget);
        return true;
      } else {
        processKeystrokeMiss();
        return false;
      }
    }

    // 2. No target locked -> Lowest-first rule
    const matchingWords = fallingWords.filter(w => {
      return w.typedIndex === 0 && w.word.charAt(0) === key;
    });

    if (matchingWords.length > 0) {
      // Sort by Y descending (highest Y = lowest on screen, closest to tank)
      matchingWords.sort((a, b) => b.y - a.y);
      const chosenWord = matchingWords[0];
      activeTarget = chosenWord;
      processKeystrokeHit(chosenWord);
      return true;
    } else {
      processKeystrokeMiss();
      return false;
    }
  }

  function processKeystrokeHit(targetWord) {
    correctKeystrokes++;
    combo++;
    if (combo > maxCombo) maxCombo = combo;

    const hitCharIndex = targetWord.typedIndex;
    targetWord.typedIndex++;

    const charPos = targetWord.charPositions[hitCharIndex] || { centerX: 10 };
    const targetCharX = targetWord.x + charPos.centerX;
    const targetCharY = targetWord.y;

    // Turret aiming & recoil
    const dx = targetCharX - tank.x;
    const dy = targetCharY - tank.y;
    tank.targetAngle = Math.atan2(dy, dx);
    tank.targetAngle = Math.max(-Math.PI + 0.05, Math.min(-0.05, tank.targetAngle));
    tank.angle = tank.targetAngle;
    tank.recoil = 9;
    tank.muzzleFlash = 4;
    tank.reactorPulse = 1.0;

    const barrelTipX = tank.x + Math.cos(tank.angle) * tank.barrelLength;
    const barrelTipY = tank.y + Math.sin(tank.angle) * tank.barrelLength;

    bullets.push({
      startX: barrelTipX,
      startY: barrelTipY,
      x: barrelTipX,
      y: barrelTipY,
      destX: targetCharX,
      destY: targetCharY,
      progress: 0,
      speed: 0.24,
      isBonus: targetWord.isBonus,
      accentColor: targetWord.accentColor
    });

    createMuzzleParticles(barrelTipX, barrelTipY, tank.angle, targetWord.isBonus);
    window.TypeTankAudio.playLaserShot();

    const comboMultiplier = getComboMultiplier(combo);
    const letterPoints = Math.round(10 * comboMultiplier * (targetWord.isBonus ? 3.5 : 1));
    score += letterPoints;

    if (targetWord.typedIndex >= targetWord.word.length) {
      eliminateWord(targetWord);
    }

    updateHUD();
  }

  function processKeystrokeMiss() {
    combo = 0;
    window.TypeTankAudio.playTypingError();
    tank.recoil = 2;
    updateHUD();
  }

  function eliminateWord(wordObj) {
    wordsDestroyed++;
    if (wordObj.isBonus) {
      redBonusDestroyed++;
      window.TypeTankWords.clearBonusTarget(wordObj.word.charAt(0));
    }

    const comboMultiplier = getComboMultiplier(combo);
    const bonusScale = wordObj.isBonus ? 3.5 : 1.0;
    const wordBonusPoints = Math.round((wordObj.word.length * 30 + 60) * comboMultiplier * bonusScale);
    score += wordBonusPoints;

    const wordCenterX = wordObj.x + wordObj.calculatedWidth / 2;
    createWordExplosionParticles(wordCenterX, wordObj.y, wordObj.isBonus, wordObj.accentColor);

    floatingTexts.push({
      text: `+${wordBonusPoints}${wordObj.isBonus ? ' [3.5X BONUS]' : ''}`,
      x: wordCenterX,
      y: wordObj.y - 14,
      color: wordObj.isBonus ? '#ff3366' : '#00f5a0',
      alpha: 1.0,
      dy: -0.7,
      fontSize: '15px',
      fontWeight: '800'
    });

    window.TypeTankAudio.playExplosion();

    fallingWords = fallingWords.filter(w => w !== wordObj);
    if (activeTarget === wordObj) {
      activeTarget = null;
    }
  }

  function breachPerimeter(wordObj) {
    const damage = wordObj.isBonus ? 30 : 20;
    hullIntegrity = Math.max(0, hullIntegrity - damage);
    combo = 0;

    if (wordObj.isBonus) {
      window.TypeTankWords.clearBonusTarget(wordObj.word.charAt(0));
    }

    shakeDuration = 20;
    shakeIntensity = wordObj.isBonus ? 16 : 10;

    const breachX = wordObj.x + wordObj.calculatedWidth / 2;
    createPerimeterBreachParticles(breachX, perimeterY, wordObj.isBonus);
    window.TypeTankAudio.playDamage();

    floatingTexts.push({
      text: `PERIMETER BREACH -${damage}%`,
      x: breachX,
      y: perimeterY - 22,
      color: '#ff3366',
      alpha: 1.0,
      dy: -0.4,
      fontSize: '15px',
      fontWeight: '900'
    });

    fallingWords = fallingWords.filter(w => w !== wordObj);
    if (activeTarget === wordObj) {
      activeTarget = null;
    }

    updateHUD();

    if (hullIntegrity <= 0) {
      triggerTankDestruction();
    }
  }

  function triggerTankDestruction() {
    shakeDuration = 45;
    shakeIntensity = 22;

    const colors = ['#00f2fe', '#a855f7', '#ff3366', '#fbbf24', '#ffffff'];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 8.5;
      particles.push({
        x: tank.x,
        y: tank.y - 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02
      });
    }

    window.TypeTankAudio.playExplosion();

    setTimeout(() => {
      terminateSortie('HULL_DESTROYED');
    }, 700);
  }

  function terminateSortie(reason) {
    stopSortie();

    const elapsedSeconds = Math.max(1, (performance.now() - sortieStartTime) / 1000);
    const elapsedMinutes = elapsedSeconds / 60;
    const finalWPM = Math.round((correctKeystrokes / 5) / elapsedMinutes);
    const finalAccuracy = totalKeystrokes > 0 ? (correctKeystrokes / totalKeystrokes) * 100 : 100;

    const sortieSummary = {
      reason,
      callsign,
      mode,
      score,
      wpm: finalWPM,
      accuracy: Math.round(finalAccuracy * 10) / 10,
      wordsDestroyed,
      redBonusDestroyed,
      maxCombo,
      elapsedSeconds: Math.round(elapsedSeconds),
      survived: hullIntegrity > 0
    };

    if (onSortieEndCallback) {
      onSortieEndCallback(sortieSummary);
    }
  }

  function getComboMultiplier(c) {
    if (c >= 35) return 2.5;
    if (c >= 20) return 2.0;
    if (c >= 10) return 1.5;
    if (c >= 5) return 1.2;
    return 1.0;
  }

  function createMuzzleParticles(tipX, tipY, angle, isBonus) {
    const colors = isBonus ? ['#ff3366', '#fbbf24', '#ffffff'] : ['#00f2fe', '#a855f7', '#ffffff'];
    for (let i = 0; i < 9; i++) {
      const spread = (Math.random() - 0.5) * 0.7;
      const speed = 2.5 + Math.random() * 4.5;
      particles.push({
        x: tipX,
        y: tipY,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3,
        alpha: 1.0,
        decay: 0.12
      });
    }
  }

  function createImpactParticles(x, y, isBonus, accentColor) {
    const baseColor = isBonus ? '#ff3366' : (accentColor || '#00f2fe');
    const colors = [baseColor, '#ffffff', '#fbbf24'];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2.5,
        alpha: 1.0,
        decay: 0.08
      });
    }
  }

  function createWordExplosionParticles(x, y, isBonus, accentColor) {
    const colors = isBonus 
      ? ['#ff3366', '#ff0844', '#fbbf24', '#ffffff'] 
      : [accentColor || '#00f2fe', '#00f5a0', '#a855f7', '#ffffff', '#fbbf24'];

    for (let i = 0; i < 34; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.025 + Math.random() * 0.025
      });
    }
  }

  function createPerimeterBreachParticles(x, y, isBonus) {
    const colors = isBonus ? ['#ff3366', '#ff0844', '#fbbf24'] : ['#f59e0b', '#fbbf24', '#f43f5e'];
    for (let i = 0; i < 36; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const speed = 2.5 + Math.random() * 7.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 3.5,
        alpha: 1.0,
        decay: 0.025 + Math.random() * 0.03
      });
    }
  }

  function gameLoop(now) {
    if (!isRunning) return;

    const dt = Math.min(64, now - lastTime);
    lastTime = now;

    update(now, dt);
    render();

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function update(now, dt) {
    const elapsedSec = (now - sortieStartTime) / 1000;
    const { spawnInterval } = getDifficultyModifiers(elapsedSec);

    // 1. Spawning regular threat
    if (now >= nextSpawnTime) {
      spawnWord(false);
      nextSpawnTime = now + spawnInterval + (Math.random() * 400 - 200);
    }

    // 2. Spawning red bonus threat
    if (now >= nextBonusSpawnTime) {
      const hasBonus = fallingWords.some(w => w.isBonus);
      if (!hasBonus) {
        spawnWord(true);
      }
      nextBonusSpawnTime = now + 14000 + Math.random() * 8000;
    }

    // 3. Update falling words
    for (let i = fallingWords.length - 1; i >= 0; i--) {
      const w = fallingWords[i];
      w.y += w.speed * (dt / 16.667);

      if (w.y >= perimeterY) {
        breachPerimeter(w);
      }
    }

    // 4. Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.progress += b.speed;
      b.x = b.startX + (b.destX - b.startX) * Math.min(1, b.progress);
      b.y = b.startY + (b.destY - b.startY) * Math.min(1, b.progress);

      if (b.progress >= 1) {
        createImpactParticles(b.destX, b.destY, b.isBonus, b.accentColor);
        bullets.splice(i, 1);
      }
    }

    // 5. Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    // 6. Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.dy;
      ft.alpha -= 0.018;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // 7. Update Turret & Reactor Core
    if (tank.recoil > 0) {
      tank.recoil *= 0.82;
      if (tank.recoil < 0.2) tank.recoil = 0;
    }
    if (tank.muzzleFlash > 0) {
      tank.muzzleFlash--;
    }
    if (tank.reactorPulse > 0) {
      tank.reactorPulse *= 0.92;
    }

    if (activeTarget && fallingWords.includes(activeTarget)) {
      const charPos = activeTarget.charPositions[activeTarget.typedIndex] || { centerX: 10 };
      const targetCharX = activeTarget.x + charPos.centerX;
      const targetCharY = activeTarget.y;
      const dx = targetCharX - tank.x;
      const dy = targetCharY - tank.y;
      tank.targetAngle = Math.atan2(dy, dx);
      tank.targetAngle = Math.max(-Math.PI + 0.05, Math.min(-0.05, tank.targetAngle));
      const diff = tank.targetAngle - tank.angle;
      tank.angle += diff * 0.35;
    } else {
      const diff = (-Math.PI / 2) - tank.angle;
      tank.angle += diff * 0.08;
    }

    // 8. Update screen shake
    if (shakeDuration > 0) {
      shakeDuration--;
      if (shakeDuration <= 0) shakeIntensity = 0;
    }
  }

  function render() {
    if (!ctx) return;

    ctx.save();

    if (shakeDuration > 0 && shakeIntensity > 0) {
      const ox = (Math.random() - 0.5) * shakeIntensity;
      const oy = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(ox, oy);
    }

    const isLight = document.body.classList.contains('theme-light');

    if (isLight) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#f8fafc');
      bgGrad.addColorStop(0.6, '#f1f5f9');
      bgGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#060913');
      bgGrad.addColorStop(0.7, '#0b1329');
      bgGrad.addColorStop(1, '#0e1834');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    drawHolodeckGrid(isLight);
    drawPerimeter(isLight);
    drawWords(isLight);
    drawBullets(isLight);
    drawTank(isLight);
    drawParticles();
    drawFloatingTexts();

    ctx.restore();
  }

  function drawHolodeckGrid(isLight) {
    ctx.save();
    ctx.strokeStyle = isLight ? 'rgba(0, 180, 216, 0.14)' : 'rgba(0, 180, 216, 0.06)';
    ctx.lineWidth = 1;

    for (let y = 60; y < perimeterY; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let x = 60; x < width; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, perimeterY);
      ctx.stroke();
    }

    // Subtle radial range rings around tank
    ctx.strokeStyle = isLight ? 'rgba(121, 40, 202, 0.12)' : 'rgba(121, 40, 202, 0.08)';
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, 160, Math.PI, 0);
    ctx.stroke();

    ctx.strokeStyle = isLight ? 'rgba(0, 180, 216, 0.12)' : 'rgba(0, 242, 254, 0.08)';
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, 300, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }

  function drawPerimeter(isLight) {
    ctx.save();

    const isCritical = hullIntegrity < 25;
    const isWarning = hullIntegrity < 50;

    let barrierColor = isLight ? '#059669' : '#00f5a0';
    let glowColor = isLight ? 'rgba(16, 185, 129, 0.4)' : 'rgba(0, 245, 160, 0.5)';
    if (isCritical) {
      barrierColor = '#f43f5e';
      glowColor = 'rgba(244, 63, 94, 0.6)';
    } else if (isWarning) {
      barrierColor = isLight ? '#d97706' : '#fbbf24';
      glowColor = isLight ? 'rgba(217, 119, 6, 0.5)' : 'rgba(251, 191, 36, 0.6)';
    }

    // Glowing energy defense line
    ctx.strokeStyle = barrierColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(0, perimeterY);
    ctx.lineTo(width, perimeterY);
    ctx.stroke();

    // Defense chevrons
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = barrierColor;
    for (let x = 12; x < width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, perimeterY);
      ctx.lineTo(x - 6, perimeterY + 8);
      ctx.stroke();
    }

    ctx.font = '700 11px "Orbitron", sans-serif';
    ctx.fillStyle = barrierColor;
    ctx.fillText('◄ DEFENSE BARRIER // SHIELD PERIMETER ◄', 16, perimeterY - 8);

    ctx.restore();
  }

  function drawWords(isLight) {
    ctx.save();
    ctx.font = '700 18px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';

    fallingWords.forEach(w => {
      const isLocked = (w === activeTarget);
      const isBonus = w.isBonus;
      const accent = isBonus ? '#ff3366' : w.accentColor;

      const padH = 10;
      const padV = 6;
      const boxX = w.x - padH;
      const boxY = w.y - 12 - padV;
      const boxW = w.calculatedWidth + padH * 2;
      const boxH = 24 + padV * 2;
      const radius = 6;

      // Rounded Pill Threat Capsule
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, radius);
      
      const cardGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
      if (isBonus) {
        cardGrad.addColorStop(0, isLight ? 'rgba(255, 228, 230, 0.98)' : 'rgba(80, 8, 24, 0.92)');
        cardGrad.addColorStop(1, isLight ? 'rgba(254, 205, 211, 0.98)' : 'rgba(40, 4, 12, 0.92)');
      } else if (isLocked) {
        cardGrad.addColorStop(0, isLight ? 'rgba(224, 242, 254, 0.98)' : 'rgba(10, 30, 60, 0.94)');
        cardGrad.addColorStop(1, isLight ? 'rgba(186, 230, 253, 0.98)' : 'rgba(4, 15, 35, 0.94)');
      } else {
        cardGrad.addColorStop(0, isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(14, 23, 42, 0.88)');
        cardGrad.addColorStop(1, isLight ? 'rgba(248, 250, 252, 0.96)' : 'rgba(8, 14, 28, 0.88)');
      }
      ctx.fillStyle = cardGrad;
      ctx.fill();

      // Border with glow
      ctx.strokeStyle = isLocked ? (isLight ? '#0284c7' : '#ffffff') : accent;
      ctx.shadowColor = isLocked ? '#00b4d8' : accent;
      ctx.shadowBlur = isLocked ? 12 : 5;
      ctx.lineWidth = isLocked ? 2.2 : 1.4;
      ctx.stroke();
      ctx.restore();

      // Bonus Badge
      if (isBonus) {
        ctx.save();
        ctx.fillStyle = '#ff3366';
        ctx.font = '900 10px "Orbitron", sans-serif';
        ctx.fillText('★ 3.5X BONUS', boxX, boxY - 6);
        ctx.restore();
      }

      // Ballistic Letter Fade Effect
      for (let i = 0; i < w.word.length; i++) {
        const charInfo = w.charPositions[i];
        if (!charInfo) continue;

        const charX = w.x + charInfo.offset;
        const charY = w.y;

        if (i < w.typedIndex) {
          // TYPED CHARACTER: FADED TO ~35-40% OPACITY
          ctx.fillStyle = isLight 
            ? (isBonus ? 'rgba(225, 29, 72, 0.35)' : 'rgba(15, 23, 42, 0.35)') 
            : (isBonus ? 'rgba(255, 120, 150, 0.38)' : 'rgba(255, 255, 255, 0.38)');
          ctx.fillText(charInfo.char, charX, charY);
        } else if (i === w.typedIndex && isLocked) {
          // ACTIVE CURRENT LETTER: HIGHLIGHTED
          ctx.fillStyle = isLight ? '#0284c7' : '#ffffff';
          ctx.shadowColor = isBonus ? '#ff3366' : '#00f2fe';
          ctx.shadowBlur = 8;
          ctx.fillText(charInfo.char, charX, charY);
          ctx.shadowBlur = 0;

          // Target reticle underline
          ctx.fillStyle = isBonus ? '#ff3366' : '#00b4d8';
          ctx.fillRect(charX, charY + 11, charInfo.width, 3);
        } else {
          // UNTYPED REMAINING LETTERS
          ctx.fillStyle = isLight 
            ? (isBonus ? '#e11d48' : (isLocked ? '#0369a1' : '#0f172a')) 
            : (isBonus ? '#ff8099' : (isLocked ? '#a5f3fc' : '#e2e8f0'));
          ctx.fillText(charInfo.char, charX, charY);
        }
      }
    });

    ctx.restore();
  }

  function drawBullets() {
    ctx.save();
    bullets.forEach(b => {
      const beamColor = b.isBonus ? '#ff3366' : (b.accentColor || '#00b4d8');

      // Ballistic Laser Beam Tracer
      ctx.strokeStyle = beamColor;
      ctx.lineWidth = 2.8;
      ctx.shadowColor = beamColor;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(b.startX, b.startY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Glowing plasma projectile head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawTank(isLight) {
    ctx.save();

    const cx = tank.x;
    const cy = tank.y;

    // 1. Robotic Caterpillar Tread Base
    const treadWidth = 130;
    const treadHeight = 24;
    const treadX = cx - treadWidth / 2;
    const treadY = cy + 2;

    ctx.fillStyle = isLight ? '#cbd5e1' : '#03060c';
    ctx.beginPath();
    ctx.roundRect(treadX, treadY, treadWidth, treadHeight, 6);
    ctx.fill();

    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.strokeStyle = isLight ? '#64748b' : '#1e3a5f';
    ctx.lineWidth = 1.2;
    for (let tx = treadX + 8; tx < treadX + treadWidth; tx += 11) {
      ctx.beginPath();
      ctx.moveTo(tx, treadY);
      ctx.lineTo(tx, treadY + treadHeight);
      ctx.stroke();
    }

    // 2. Active Railgun Cannon Barrel
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tank.angle);

    const barrelLength = tank.barrelLength - tank.recoil;
    const halfWidth = tank.barrelWidth / 2;

    ctx.fillStyle = isLight ? '#f1f5f9' : '#0a1628';
    ctx.beginPath();
    ctx.roundRect(0, -halfWidth, barrelLength, tank.barrelWidth, 3);
    ctx.fill();

    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.strokeStyle = '#7928ca';
    ctx.lineWidth = 2;
    for (let c = 12; c < barrelLength - 8; c += 10) {
      ctx.beginPath();
      ctx.moveTo(c, -halfWidth - 1);
      ctx.lineTo(c, halfWidth + 1);
      ctx.stroke();
    }

    ctx.fillStyle = isLight ? '#cbd5e1' : '#1e293b';
    ctx.fillRect(barrelLength - 6, -halfWidth - 2, 8, tank.barrelWidth + 4);
    ctx.strokeRect(barrelLength - 6, -halfWidth - 2, 8, tank.barrelWidth + 4);

    if (tank.muzzleFlash > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(barrelLength + 8, 0, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(barrelLength + 8, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 3. Semicircular Dome Turret
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, tank.turretRadius, Math.PI, 0);
    ctx.closePath();

    const turretGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, tank.turretRadius);
    if (isLight) {
      turretGrad.addColorStop(0, '#ffffff');
      turretGrad.addColorStop(0.7, '#f1f5f9');
      turretGrad.addColorStop(1, '#cbd5e1');
    } else {
      turretGrad.addColorStop(0, '#1e293b');
      turretGrad.addColorStop(0.7, '#0f172a');
      turretGrad.addColorStop(1, '#080d1a');
    }
    ctx.fillStyle = turretGrad;
    ctx.fill();

    ctx.strokeStyle = '#00b4d8';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = 'rgba(0, 180, 216, 0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy);
    ctx.lineTo(cx - 16, cy - 26);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 24, cy);
    ctx.lineTo(cx + 16, cy - 26);
    ctx.stroke();

    const corePulse = 1 + tank.reactorPulse * 0.4;
    ctx.fillStyle = '#00b4d8';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 12 * corePulse;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 5 * corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

  }

  function drawParticles() {
    ctx.save();
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawFloatingTexts() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    floatingTexts.forEach(ft => {
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = `${ft.fontWeight || '700'} ${ft.fontSize || '14px'} "Orbitron", sans-serif`;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
    });

    ctx.restore();
  }

  function updateHUD() {
    const elOperator = document.getElementById('header-callsign-display');
    const elMode = document.getElementById('hud-mode');
    const elScore = document.getElementById('hud-score');
    const elCombo = document.getElementById('hud-combo');
    const elWpm = document.getElementById('hud-wpm');
    const elAcc = document.getElementById('hud-accuracy');
    const elHullFill = document.getElementById('hud-hull-fill');
    const elHullVal = document.getElementById('hud-hull-val');

    if (elOperator) elOperator.textContent = callsign;
    if (elMode) {
      const modeNames = { 1: 'MODE 1 [ALPHA]', 2: 'MODE 2 [BRAVO]', 3: 'MODE 3 [CHARLIE]', 4: 'MODE 4 [DELTA]' };
      elMode.textContent = modeNames[mode] || 'MODE 1';
    }
    if (elScore) {
      elScore.textContent = String(score).padStart(6, '0');
    }
    if (elCombo) {
      elCombo.textContent = combo > 1 ? `x${combo}` : 'x1';
      elCombo.className = combo >= 10 ? 'hud-val combo-high' : 'hud-val';
    }

    const elapsedMinutes = Math.max(0.05, (performance.now() - sortieStartTime) / 60000);
    const liveWpm = Math.round((correctKeystrokes / 5) / elapsedMinutes);
    if (elWpm) elWpm.textContent = String(liveWpm);

    const liveAcc = totalKeystrokes > 0 ? Math.round((correctKeystrokes / totalKeystrokes) * 100) : 100;
    if (elAcc) elAcc.textContent = `${liveAcc}%`;

    if (elHullFill && elHullVal) {
      elHullFill.style.width = `${hullIntegrity}%`;
      elHullVal.textContent = `${hullIntegrity}%`;

      if (hullIntegrity > 50) {
        elHullFill.className = 'hull-fill status-green';
      } else if (hullIntegrity > 25) {
        elHullFill.className = 'hull-fill status-amber';
      } else {
        elHullFill.className = 'hull-fill status-red';
      }
    }
  }

  return {
    init,
    recalibrateDimensions,
    startSortie,
    abortSortie,
    handleKeystroke,
    isRunning: () => isRunning
  };
})();
