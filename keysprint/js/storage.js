/**
 * storage.js — localStorage persistence layer for KeySprint
 */

const Storage = (() => {
  const KEYS = {
    STATS: 'ks_stats',
    RACE_HISTORY: 'ks_race_history',
    TEST_HISTORY: 'ks_test_history',
    PRACTICE_SESSIONS: 'ks_practice_sessions',
    KEY_STATS: 'ks_key_stats',
    COMPLETED_LESSONS: 'ks_completed_lessons',
    GOALS: 'ks_goals',
    SETTINGS: 'ks_settings',
  };

  function _get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.warn('Storage read error:', e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }

  /* ── Global Stats ───────────────────────────────────────── */
  function getStats() {
    return _get(KEYS.STATS) || {
      currentWPM: 0,
      bestWPM: 0,
      averageAccuracy: 0,
      totalRaces: 0,
      totalTests: 0,
      totalPracticeSessions: 0,
      totalTimeTyping: 0, // seconds
    };
  }

  function saveStats(stats) {
    _set(KEYS.STATS, stats);
  }

  function updateAfterSession({ wpm, accuracy, type = 'test', duration = 0 }) {
    const stats = getStats();
    const prevWPM = stats.currentWPM || 0;
    const prevBest = stats.bestWPM || 0;

    if (wpm > stats.bestWPM) stats.bestWPM = wpm;
    stats.currentWPM = wpm;

    // rolling average accuracy
    const totalSessions = stats.totalRaces + stats.totalTests + stats.totalPracticeSessions + 1;
    stats.averageAccuracy = Math.round(
      (stats.averageAccuracy * (totalSessions - 1) + accuracy) / totalSessions
    );

    if (type === 'race') stats.totalRaces += 1;
    else if (type === 'test') stats.totalTests += 1;
    else if (type === 'practice') stats.totalPracticeSessions += 1;

    stats.totalTimeTyping += duration;

    saveStats(stats);
    updateGoals(stats);
    return { stats, prevWPM, prevBest, improvement: wpm - prevWPM };
  }

  /* ── Race History ───────────────────────────────────────── */
  function getRaceHistory() {
    return _get(KEYS.RACE_HISTORY) || [];
  }

  function addRaceResult(result) {
    const history = getRaceHistory();
    history.push({ ...result, timestamp: Date.now() });
    if (history.length > 50) history.shift(); // keep last 50
    _set(KEYS.RACE_HISTORY, history);
  }

  /* ── Test History ───────────────────────────────────────── */
  function getTestHistory() {
    return _get(KEYS.TEST_HISTORY) || [];
  }

  function addTestResult(result) {
    const history = getTestHistory();
    history.push({ ...result, timestamp: Date.now() });
    if (history.length > 50) history.shift();
    _set(KEYS.TEST_HISTORY, history);
  }

  /* ── Practice Sessions ──────────────────────────────────── */
  function getPracticeSessions() {
    return _get(KEYS.PRACTICE_SESSIONS) || [];
  }

  function addPracticeSession(session) {
    const sessions = getPracticeSessions();
    sessions.push({ ...session, timestamp: Date.now() });
    if (sessions.length > 100) sessions.shift();
    _set(KEYS.PRACTICE_SESSIONS, sessions);
  }

  /* ── Per-Key Statistics ─────────────────────────────────── */
  function getKeyStats() {
    return _get(KEYS.KEY_STATS) || {};
  }

  function updateKeyStats(keyUpdates) {
    // keyUpdates: { 'a': { correct: 2, incorrect: 1 }, 'b': { correct: 5 } }
    const stats = getKeyStats();
    for (const [key, update] of Object.entries(keyUpdates)) {
      if (!stats[key]) {
        stats[key] = { attempts: 0, correct: 0, incorrect: 0 };
      }
      stats[key].correct += update.correct || 0;
      stats[key].incorrect += update.incorrect || 0;
      stats[key].attempts += (update.correct || 0) + (update.incorrect || 0);
    }
    _set(KEYS.KEY_STATS, stats);
    return stats;
  }

  function getWeakKeys(minAttempts = 5, topN = 5) {
    const stats = getKeyStats();
    const keys = Object.entries(stats)
      .filter(([k, v]) => v.attempts >= minAttempts && /^[a-zA-Z]$/.test(k))
      .map(([k, v]) => ({
        key: k,
        accuracy: v.attempts > 0 ? Math.round((v.correct / v.attempts) * 100) : 100,
        attempts: v.attempts,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
    return keys.slice(0, topN);
  }

  /* ── Completed Lessons ──────────────────────────────────── */
  function getCompletedLessons() {
    return _get(KEYS.COMPLETED_LESSONS) || [];
  }

  function markLessonComplete(lessonId) {
    const lessons = getCompletedLessons();
    if (!lessons.includes(lessonId)) {
      lessons.push(lessonId);
      _set(KEYS.COMPLETED_LESSONS, lessons);
    }
  }

  /* ── Goals ──────────────────────────────────────────────── */
  function getGoals() {
    return _get(KEYS.GOALS) || { nextTarget: 16, milestone: 20 };
  }

  function updateGoals(stats) {
    const goals = getGoals();
    if (stats.currentWPM >= goals.nextTarget) {
      goals.nextTarget = Math.ceil(stats.currentWPM * 1.07); // +7%
    }
    if (stats.currentWPM >= goals.milestone) {
      goals.milestone = Math.ceil(stats.currentWPM * 1.2); // +20%
    }
    _set(KEYS.GOALS, goals);
    return goals;
  }

  /* ── Settings ───────────────────────────────────────────── */
  function getSettings() {
    return _get(KEYS.SETTINGS) || {
      soundEnabled: true,
      showKeyboard: true,
      difficulty: 'medium',
    };
  }

  function saveSettings(settings) {
    _set(KEYS.SETTINGS, settings);
  }

  /* ── Chart data helper ──────────────────────────────────── */
  function getWPMHistory(limit = 20) {
    const races = getRaceHistory().map(r => ({ wpm: r.wpm, timestamp: r.timestamp, type: 'race' }));
    const tests = getTestHistory().map(t => ({ wpm: t.wpm, timestamp: t.timestamp, type: 'test' }));
    return [...races, ...tests]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit);
  }

  /* ── Reset ──────────────────────────────────────────────── */
  function resetAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  return {
    getStats, saveStats, updateAfterSession,
    getRaceHistory, addRaceResult,
    getTestHistory, addTestResult,
    getPracticeSessions, addPracticeSession,
    getKeyStats, updateKeyStats, getWeakKeys,
    getCompletedLessons, markLessonComplete,
    getGoals, updateGoals,
    getSettings, saveSettings,
    getWPMHistory,
    resetAll,
  };
})();
