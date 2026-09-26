/**
 * TYPE//TANK - LocalStorage Engine
 * Operator profiles, flight logs, arsenal presets, personal best records.
 */

window.TypeTankStorage = (function () {
  'use strict';

  const KEYS = {
    CALLSIGN: 'type_tank_callsign',
    SOUND: 'type_tank_sound_enabled',
    CRT: 'type_tank_crt_enabled',
    THEME: 'type_tank_theme_mode',
    ASPECT: 'type_tank_aspect_mode',
    MODE: 'type_tank_arsenal_mode',
    MATRIX: 'type_tank_custom_matrix',
    FLIGHT_LOGS: 'type_tank_flight_logs'
  };

  function getTheme() {
    const val = localStorage.getItem(KEYS.THEME);
    return val === 'light' ? 'light' : 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme === 'dark' ? 'dark' : 'light');
  }

  function getCallsign() {
    const stored = localStorage.getItem(KEYS.CALLSIGN);
    return (stored && stored.trim()) ? stored.trim().toUpperCase() : 'COMMANDER';
  }

  function setCallsign(name) {
    const clean = (name || '').trim().toUpperCase() || 'COMMANDER';
    localStorage.setItem(KEYS.CALLSIGN, clean);
    return clean;
  }

  function getSoundEnabled() {
    const val = localStorage.getItem(KEYS.SOUND);
    return val === null ? true : val === 'true';
  }

  function setSoundEnabled(enabled) {
    localStorage.setItem(KEYS.SOUND, !!enabled);
  }

  function getCrtEnabled() {
    const val = localStorage.getItem(KEYS.CRT);
    return val === null ? false : val === 'true';
  }

  function setCrtEnabled(enabled) {
    localStorage.setItem(KEYS.CRT, !!enabled);
  }

  function getAspectMode() {
    const val = localStorage.getItem(KEYS.ASPECT);
    if (['auto', '16:9', '4:3'].includes(val)) {
      return val;
    }
    return 'auto';
  }

  function setAspectMode(mode) {
    if (['auto', '16:9', '4:3'].includes(mode)) {
      localStorage.setItem(KEYS.ASPECT, mode);
    }
  }

  function getArsenalMode() {
    const val = parseInt(localStorage.getItem(KEYS.MODE), 10);
    return [1, 2, 3, 4].includes(val) ? val : 1;
  }

  function setArsenalMode(mode) {
    const val = parseInt(mode, 10);
    if ([1, 2, 3, 4].includes(val)) {
      localStorage.setItem(KEYS.MODE, val);
    }
  }

  function getCustomMatrix() {
    try {
      const data = localStorage.getItem(KEYS.MATRIX);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed parsing custom matrix', e);
    }
    return { uppercase: false, numbers: false, specials: false };
  }

  function setCustomMatrix(matrix) {
    try {
      localStorage.setItem(KEYS.MATRIX, JSON.stringify(matrix));
    } catch (e) {
      console.warn('Failed saving custom matrix', e);
    }
  }

  function getFlightLogs() {
    try {
      const data = localStorage.getItem(KEYS.FLIGHT_LOGS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed parsing flight logs', e);
    }
    return [];
  }

  /**
   * Get Personal Best for a specific mode
   * @param {number} mode 1..4
   * @returns {{ bestScore: number, bestWpm: number, totalSorties: number } | null}
   */
  function getPersonalBest(mode) {
    const logs = getFlightLogs().filter(log => log.mode === mode);
    if (logs.length === 0) return null;

    let bestScore = 0;
    let bestWpm = 0;
    logs.forEach(l => {
      if (l.score > bestScore) bestScore = l.score;
      if (l.wpm > bestWpm) bestWpm = l.wpm;
    });

    return {
      bestScore,
      bestWpm,
      totalSorties: logs.length
    };
  }

  /**
   * Check if a score is a new Personal Best for this mode
   */
  function checkIfNewPersonalBest(mode, score) {
    const prev = getPersonalBest(mode);
    if (!prev) return true; // First game in this mode is always a record
    return score > prev.bestScore;
  }

  /**
   * Add a new completed sortie entry
   */
  function addFlightLog(entry) {
    const logs = getFlightLogs();
    const isPB = checkIfNewPersonalBest(entry.mode, entry.score);

    const record = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }),
      callsign: entry.callsign || getCallsign(),
      mode: entry.mode,
      score: entry.score,
      wpm: Math.round(entry.wpm),
      accuracy: Math.round(entry.accuracy * 10) / 10,
      wordsDestroyed: entry.wordsDestroyed,
      maxCombo: entry.maxCombo,
      isPB: isPB
    };

    logs.unshift(record); // Prepend to show latest first
    // Keep max 200 logs to prevent bloat
    if (logs.length > 200) {
      logs.length = 200;
    }

    try {
      localStorage.setItem(KEYS.FLIGHT_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed saving flight log', e);
    }

    return { record, isPB };
  }

  function purgeFlightLogs() {
    localStorage.removeItem(KEYS.FLIGHT_LOGS);
  }

  /**
   * Lifetime aggregate statistics for current operator / overall
   */
  function getLifetimeStats() {
    const logs = getFlightLogs();
    if (logs.length === 0) {
      return {
        bestScore: 0,
        maxWpm: 0,
        peakAccuracy: 0,
        totalWordsDestroyed: 0,
        totalSorties: 0
      };
    }

    let bestScore = 0;
    let maxWpm = 0;
    let peakAccuracy = 0;
    let totalWords = 0;

    logs.forEach(l => {
      if (l.score > bestScore) bestScore = l.score;
      if (l.wpm > maxWpm) maxWpm = l.wpm;
      if (l.accuracy > peakAccuracy) peakAccuracy = l.accuracy;
      totalWords += (l.wordsDestroyed || 0);
    });

    return {
      bestScore,
      maxWpm,
      peakAccuracy,
      totalWordsDestroyed: totalWords,
      totalSorties: logs.length
    };
  }

  /**
   * Best score and WPM for each mode (1 to 4)
   */
  function getModeBests() {
    const result = {};
    for (let m = 1; m <= 4; m++) {
      const pb = getPersonalBest(m);
      result[m] = pb ? { score: pb.bestScore, wpm: pb.bestWpm } : { score: 0, wpm: 0 };
    }
    return result;
  }

  return {
    getCallsign,
    setCallsign,
    getSoundEnabled,
    setSoundEnabled,
    getCrtEnabled,
    setCrtEnabled,
    getTheme,
    setTheme,
    getAspectMode,
    setAspectMode,
    getArsenalMode,
    setArsenalMode,
    getCustomMatrix,
    setCustomMatrix,
    getFlightLogs,
    addFlightLog,
    purgeFlightLogs,
    getPersonalBest,
    checkIfNewPersonalBest,
    getLifetimeStats,
    getModeBests
  };
})();
