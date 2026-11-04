/**
 * app.js — Main application controller for KeySprint
 * Manages views, navigation, typing test, and dashboard rendering.
 */

/* ══════════════════════════════════════════════════════════
   GLOBAL APP STATE
══════════════════════════════════════════════════════════ */
const App = (() => {
  let currentView = 'dashboard';
  let testSession = null;
  let testTimer = null;
  let testDuration = 60;
  let testTimeLeft = 60;
  let practiceAdaptiveSession = null;

  /* ── View Router ──────────────────────────────────────── */
  function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
      currentView = viewId;
    }
    // Update nav active state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const navMap = { dashboard: 'nav-dashboard', race: 'nav-race', practice: 'nav-practice', test: 'nav-test' };
    const navBtn = document.getElementById(navMap[viewId]);
    if (navBtn) navBtn.classList.add('active');
    window.scrollTo(0, 0);
  }

  /* ══════════════════════════════════════════════════════
     DASHBOARD
  ══════════════════════════════════════════════════════ */
  function renderDashboard() {
    const stats = Storage.getStats();
    const goals = Storage.getGoals();
    const weakKeys = Storage.getWeakKeys(5, 5);
    const history = Storage.getWPMHistory(20);
    const recommendation = AdaptiveLearning.getRecommendedLesson(stats);

    // Stats
    setText('dash-current-wpm', stats.currentWPM || 0);
    setText('dash-best-wpm', stats.bestWPM || 0);
    setText('dash-accuracy', (stats.averageAccuracy || 0) + '%');
    setText('dash-total-races', stats.totalRaces || 0);

    // Goals
    setText('dash-next-target', goals.nextTarget);
    setText('dash-milestone', goals.milestone);

    // Recommendation
    const recEl = document.getElementById('dash-recommendation');
    if (recEl) {
      recEl.innerHTML = `<strong>${recommendation.label}</strong><br><span>${recommendation.description}</span>`;
    }

    // Weak keys
    const weakEl = document.getElementById('dash-weak-keys');
    if (weakEl) {
      if (weakKeys.length > 0) {
        weakEl.innerHTML = weakKeys.map(k =>
          `<span class="key-chip bad" title="${k.accuracy}% accuracy">${k.key.toUpperCase()}<small>${k.accuracy}%</small></span>`
        ).join('');
      } else {
        weakEl.innerHTML = '<span class="muted">Keep typing to discover your weak keys!</span>';
      }
    }

    // Chart
    const canvas = document.getElementById('dash-chart');
    if (canvas) {
      Statistics.renderWPMChart(canvas, history);
    }

    // Recent history
    renderRecentHistory();
  }

  function renderRecentHistory() {
    const raceHist = Storage.getRaceHistory().slice(-5).reverse();
    const testHist = Storage.getTestHistory().slice(-5).reverse();
    const combined = [...raceHist.map(r => ({ ...r, type: 'race' })), ...testHist.map(t => ({ ...t, type: 'test' }))]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);

    const el = document.getElementById('dash-history');
    if (!el) return;

    if (combined.length === 0) {
      el.innerHTML = '<p class="muted center">No sessions yet. Start your first race!</p>';
      return;
    }

    el.innerHTML = combined.map(item => {
      const date = new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const icon = item.type === 'race' ? '🏎️' : '⏱️';
      const posText = item.position ? ` · #${item.position}` : '';
      return `<div class="history-row">
        <span class="history-icon">${icon}</span>
        <span class="history-info">${date}${posText}</span>
        <span class="history-wpm">${item.wpm} WPM</span>
        <span class="history-acc">${item.accuracy}%</span>
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════
     RACING GAME
  ══════════════════════════════════════════════════════ */
  let raceInputEnabled = false;

  function initRaceView() {
    const difficulty = document.getElementById('race-difficulty')?.value || 'medium';
    const passage = TypingEngine.getPassage('medium');

    // Reset UI
    setElem('race-countdown', '<div class="countdown-num">3</div>', 'innerHTML');
    document.getElementById('race-countdown').style.display = 'flex';
    document.getElementById('race-active').style.display = 'none';
    document.getElementById('race-results').style.display = 'none';

    Race.init({ difficulty, passage, callbacks: {
      onFrame: renderCarPositions,
      onBotFinish: (bot) => { /* bot finished — UI already updates via onFrame */ },
      onPlayerFinish: onRaceComplete,
    }});

    renderPassageDisplay(passage, '');
    renderCarTrack(Race.getCarPositions());

    Race.startCountdown(
      (count) => {
        const el = document.getElementById('race-countdown');
        if (el) el.innerHTML = `<div class="countdown-num">${count}</div>`;
      },
      () => {
        // GO!
        const cdEl = document.getElementById('race-countdown');
        if (cdEl) {
          cdEl.innerHTML = '<div class="countdown-num go">GO!</div>';
          setTimeout(() => { cdEl.style.display = 'none'; }, 700);
        }
        document.getElementById('race-active').style.display = 'block';
        raceInputEnabled = true;
        const input = document.getElementById('race-input');
        if (input) { input.disabled = false; input.focus(); }
      }
    );
  }

  function renderCarTrack(positions) {
    const track = document.getElementById('race-track');
    if (!track) return;

    const { player, bots } = positions;
    const cars = [
      { ...player, lane: 0 },
      { ...bots[0], lane: 1 },
      { ...bots[1], lane: 2 },
      { ...bots[2], lane: 3 },
    ];

    // Track width
    const trackWidth = track.clientWidth || track.offsetWidth || 600;
    const carWidth = 60;
    const minLeft = 10;
    const maxLeft = trackWidth - carWidth - 20;

    cars.forEach((car, idx) => {
      let carEl = track.querySelector(`.race-car[data-lane="${idx}"]`);
      if (!carEl) {
        carEl = document.createElement('div');
        carEl.className = 'race-car';
        carEl.setAttribute('data-lane', idx);
        carEl.innerHTML = buildCarSVG(car.color, car.name, idx === 0);
        track.appendChild(carEl);
      }
      const left = minLeft + car.progress * (maxLeft - minLeft);
      carEl.style.left = `${left}px`;
      carEl.style.top = `${idx * 70 + 15}px`;
      if (car.finished) carEl.classList.add('finished');
    });
  }

  function buildCarSVG(color, name, isPlayer) {
    const label = isPlayer ? 'You' : name;
    return `
      <div class="car-label">${label}</div>
      <svg width="58" height="28" viewBox="0 0 58 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <rect x="8" y="8" width="42" height="14" rx="5" fill="${color}"/>
        <!-- Roof -->
        <rect x="16" y="3" width="24" height="10" rx="4" fill="${color}" opacity="0.85"/>
        <!-- Windows -->
        <rect x="19" y="5" width="8" height="6" rx="2" fill="rgba(0,0,0,0.5)"/>
        <rect x="30" y="5" width="8" height="6" rx="2" fill="rgba(0,0,0,0.5)"/>
        <!-- Wheels -->
        <circle cx="16" cy="22" r="5" fill="#222"/>
        <circle cx="16" cy="22" r="2.5" fill="#555"/>
        <circle cx="42" cy="22" r="5" fill="#222"/>
        <circle cx="42" cy="22" r="2.5" fill="#555"/>
        <!-- Headlight -->
        <rect x="49" y="11" width="6" height="4" rx="2" fill="#fffde7" opacity="0.9"/>
        <!-- Taillight -->
        <rect x="3" y="11" width="5" height="4" rx="2" fill="#ff5252" opacity="0.9"/>
      </svg>`;
  }

  function renderCarPositions(positions) {
    renderCarTrack(positions);
    updateRaceStats();
  }

  function updateRaceStats() {
    const raceState = Race.getState();
    if (!raceState || !raceState.session) return;
    const session = raceState.session;
    const elapsed = TypingEngine.getElapsedMinutes(session);
    const correctChars = TypingEngine.countCorrectChars(session.text, session.typed);
    const wpm = TypingEngine.calcWPM(correctChars, elapsed);
    const accuracy = TypingEngine.calcAccuracy(session.typed.length, session.mistakes);

    setText('race-wpm', wpm);
    setText('race-accuracy', accuracy + '%');
    setText('race-mistakes', session.mistakes);

    // Progress bar
    const progress = TypingEngine.getProgress(session);
    const progressBar = document.getElementById('race-progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;
  }

  function handleRaceInput(e) {
    if (!raceInputEnabled) return;
    const val = e.target.value;
    const result = Race.processInput(val);
    if (!result) return;

    renderPassageDisplay(Race.getPassage(), val);
    updateRaceStats();

    if (result.finished) {
      raceInputEnabled = false;
    }
  }

  function renderPassageDisplay(text, typed) {
    const el = document.getElementById('race-passage');
    if (!el) return;
    const tokens = TypingEngine.getDiffTokens(text, typed);
    el.innerHTML = tokens.map(t => {
      const ch = t.char === ' ' ? '&nbsp;' : t.char;
      return `<span class="char ${t.status}">${ch}</span>`;
    }).join('');
  }

  function onRaceComplete(result) {
    raceInputEnabled = false;
    document.getElementById('race-active').style.display = 'none';

    // Persist
    Storage.updateKeyStats(result.keyUpdates);
    const updatedStats = Storage.updateAfterSession({ wpm: result.wpm, accuracy: result.accuracy, type: 'race', duration: result.duration });
    Storage.addRaceResult({ wpm: result.wpm, accuracy: result.accuracy, mistakes: result.mistakes, position: result.position });

    const summary = Statistics.buildSessionSummary({
      ...result,
      type: 'race',
      prevWPM: updatedStats.prevWPM,
      prevBest: updatedStats.prevBest,
    });

    // Show results
    document.getElementById('race-results').style.display = 'block';
    Statistics.renderResultsScreen('race-results', summary, {
      onRaceAgain: () => initRaceView(),
      onPracticeWeak: () => { showView('practice'); initAdaptivePractice(); },
      onDashboard: () => { showView('dashboard'); renderDashboard(); },
    });
  }

  /* ══════════════════════════════════════════════════════
     TYPING TEST
  ══════════════════════════════════════════════════════ */
  function getTestPassage(duration) {
    if (duration <= 30) {
      return `${TypingEngine.getPassage('medium')} ${TypingEngine.getPassage('easy')}`;
    } else {
      return `${TypingEngine.getPassage('medium')} ${TypingEngine.getPassage('hard')} ${TypingEngine.getPassage('easy')}`;
    }
  }

  function startTypingTest(duration) {
    testDuration = duration;
    testTimeLeft = duration;
    const passage = getTestPassage(duration);
    testSession = TypingEngine.createSession(passage);

    const input = document.getElementById('test-input');
    const display = document.getElementById('test-display');

    if (display) renderTestDisplay(TypingEngine.getDiffTokens(testSession.text, ''));
    if (input) { input.value = ''; input.disabled = false; input.focus(); }

    // Countdown display & classes
    setText('test-time', testDuration);
    const timerEl = document.getElementById('test-time');
    if (timerEl) timerEl.classList.remove('warning', 'urgent');

    setText('test-wpm', 0);
    setText('test-accuracy', '100%');
    setText('test-correct', 0);
    setText('test-incorrect', 0);

    document.getElementById('test-setup').style.display = 'none';
    document.getElementById('test-active').style.display = 'block';
    document.getElementById('test-results').style.display = 'none';

    // Timer starts on first keypress
    if (testTimer) {
      clearInterval(testTimer);
      testTimer = null;
    }
  }

  function handleTestInput(e) {
    const val = e.target.value;

    if (!testSession.active) {
      // Start timer on first keystroke
      testTimer = setInterval(tickTestTimer, 1000);
    }

    const result = TypingEngine.processInput(testSession, val);
    renderTestDisplay(TypingEngine.getDiffTokens(testSession.text, val));

    setText('test-wpm', result.wpm);
    setText('test-accuracy', result.accuracy + '%');
    setText('test-correct', result.correctChars);
    setText('test-incorrect', result.mistakes);

    if (result.finished) {
      clearInterval(testTimer);
      onTestComplete();
    }
  }

  function tickTestTimer() {
    testTimeLeft--;
    setText('test-time', testTimeLeft);
    // Visual urgency cues
    const timerEl = document.getElementById('test-time');
    if (timerEl) {
      timerEl.classList.toggle('warning', testTimeLeft <= 10 && testTimeLeft > 5);
      timerEl.classList.toggle('urgent', testTimeLeft <= 5);
    }
    if (testTimeLeft <= 0) {
      clearInterval(testTimer);
      onTestComplete();
    }
  }

  function renderTestDisplay(tokens) {
    const el = document.getElementById('test-display');
    if (!el) return;
    el.innerHTML = tokens.map(t => {
      const ch = t.char === ' ' ? '&nbsp;' : t.char;
      return `<span class="char ${t.status}">${ch}</span>`;
    }).join('');
  }

  function onTestComplete() {
    if (testTimer) {
      clearInterval(testTimer);
      testTimer = null;
    }

    const input = document.getElementById('test-input');
    if (input) input.disabled = true;

    const elapsed = testDuration - testTimeLeft;
    const correctChars = TypingEngine.countCorrectChars(testSession.text, testSession.typed);
    const durationMin = Math.max(elapsed, 1) / 60;
    const wpm = TypingEngine.calcWPM(correctChars, durationMin);
    const accuracy = TypingEngine.calcAccuracy(correctChars, testSession.mistakes);

    Storage.updateKeyStats(TypingEngine.buildKeyUpdates(testSession));
    const updatedStats = Storage.updateAfterSession({ wpm, accuracy, type: 'test', duration: elapsed });
    Storage.addTestResult({ wpm, accuracy, mistakes: testSession.mistakes, duration: elapsed });

    const summary = Statistics.buildSessionSummary({
      wpm,
      accuracy,
      mistakes: testSession.mistakes,
      duration: elapsed,
      type: 'test',
      prevWPM: updatedStats.prevWPM,
      prevBest: updatedStats.prevBest,
    });

    document.getElementById('test-active').style.display = 'none';
    document.getElementById('test-results').style.display = 'block';
    Statistics.renderResultsScreen('test-results', summary, {
      onRaceAgain: () => {
        document.getElementById('test-results').style.display = 'none';
        document.getElementById('test-setup').style.display = 'block';
      },
      onPracticeWeak: () => { showView('practice'); initAdaptivePractice(); },
      onDashboard: () => { showView('dashboard'); renderDashboard(); },
    });
  }

  /* ══════════════════════════════════════════════════════
     PRACTICE MODE
  ══════════════════════════════════════════════════════ */
  let practiceInputEnabled = false;

  function renderPracticeMenu() {
    const completedLessons = Storage.getCompletedLessons();
    ['beginner', 'intermediate', 'advanced'].forEach(level => {
      const container = document.getElementById(`practice-${level}`);
      if (!container) return;
      const lessons = Practice.LESSONS[level];
      container.innerHTML = lessons.map(l => {
        const done = completedLessons.includes(l.id);
        return `<div class="lesson-card ${done ? 'done' : ''}" data-id="${l.id}">
          <div class="lesson-icon">${done ? '✅' : getLevelIcon(level)}</div>
          <div class="lesson-info">
            <strong>${l.title}</strong>
            <span>${l.description}</span>
          </div>
          <button class="btn btn-sm btn-primary lesson-start-btn">Start</button>
        </div>`;
      }).join('');

      container.querySelectorAll('.lesson-start-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.closest('.lesson-card').dataset.id;
          startPracticeLesson(id);
        });
      });
    });
  }

  function getLevelIcon(level) {
    return { beginner: '🌱', intermediate: '🌿', advanced: '🌳' }[level] || '📝';
  }

  function startPracticeLesson(lessonId) {
    const result = Practice.startLesson(lessonId);
    if (!result) return;
    const { lesson } = result;

    document.getElementById('practice-menu').style.display = 'none';
    document.getElementById('practice-session').style.display = 'block';
    document.getElementById('practice-results').style.display = 'none';

    setText('practice-lesson-title', lesson.title);
    setText('practice-lesson-desc', lesson.description);
    renderPracticeDisplay(lesson.text, '');

    const input = document.getElementById('practice-input');
    if (input) { input.value = ''; input.disabled = false; input.focus(); }

    // Visual keyboard
    Practice.renderKeyboard('practice-keyboard', lesson.text[0] || null);

    setText('practice-wpm', 0);
    setText('practice-accuracy', '100%');
    setText('practice-mistakes', 0);

    const progressBar = document.getElementById('practice-progress-bar');
    if (progressBar) progressBar.style.width = '0%';

    practiceInputEnabled = true;
  }

  function initAdaptivePractice() {
    const weakKeys = Storage.getWeakKeys(5, 5);
    const text = AdaptiveLearning.generateWeakKeyPractice(weakKeys.map(k => k.key));

    const tempLesson = {
      id: 'adaptive',
      title: 'Adaptive Weak Key Drill',
      description: weakKeys.length > 0
        ? `Targeting: ${weakKeys.map(k => k.key.toUpperCase()).join(', ')}`
        : 'General practice — keep typing to unlock targeted drills!',
      text,
    };

    // Store adaptive session state on Practice object
    const session = TypingEngine.createSession(text);
    Practice._adaptiveSession = session;
    Practice._adaptiveLesson = tempLesson;
    Practice._adaptiveActive = true;

    // Show session UI
    document.getElementById('practice-menu').style.display = 'none';
    document.getElementById('practice-session').style.display = 'block';
    document.getElementById('practice-results').style.display = 'none';

    setText('practice-lesson-title', tempLesson.title);
    setText('practice-lesson-desc', tempLesson.description);
    renderPracticeDisplay(text, '');

    const input = document.getElementById('practice-input');
    if (input) { input.value = ''; input.disabled = false; input.focus(); }

    Practice.renderKeyboard('practice-keyboard', text[0] || null);

    setText('practice-wpm', 0);
    setText('practice-accuracy', '100%');
    setText('practice-mistakes', 0);

    const progressBar = document.getElementById('practice-progress-bar');
    if (progressBar) progressBar.style.width = '0%';

    practiceInputEnabled = true;
  }

  function handlePracticeInput(e) {
    if (!practiceInputEnabled) return;
    const val = e.target.value;

    let result, session, text;

    if (Practice._adaptiveActive) {
      session = Practice._adaptiveSession;
      text = Practice._adaptiveLesson.text;
      result = TypingEngine.processInput(session, val);
    } else {
      result = Practice.processInput(val);
      session = Practice.getSession();
      text = Practice.getCurrentLesson()?.text || '';
    }

    if (!result) return;

    renderPracticeDisplay(text, val);

    // Update keyboard to next target character
    const nextChar = val.length < text.length ? text[val.length] : null;
    Practice.renderKeyboard('practice-keyboard', nextChar);

    setText('practice-wpm', result.wpm);
    setText('practice-accuracy', result.accuracy + '%');
    setText('practice-mistakes', result.mistakes);

    const progress = TypingEngine.getProgress(session);
    const progressBar = document.getElementById('practice-progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;

    if (result.finished) {
      practiceInputEnabled = false;
      Practice._adaptiveActive = false;
      onPracticeComplete(result, session, text);
    }
  }

  function renderPracticeDisplay(text, typed) {
    const el = document.getElementById('practice-display');
    if (!el) return;
    const tokens = TypingEngine.getDiffTokens(text, typed);
    el.innerHTML = tokens.map(t => {
      const ch = t.char === ' ' ? '&nbsp;' : t.char;
      return `<span class="char ${t.status}">${ch}</span>`;
    }).join('');
  }

  function onPracticeComplete(result, session, text) {
    const correctChars = TypingEngine.countCorrectChars(text, session.typed);
    const duration = TypingEngine.getElapsedSeconds(session);
    const wpm = TypingEngine.calcWPM(correctChars, Math.max(duration, 1) / 60);
    const accuracy = TypingEngine.calcAccuracy(correctChars, session.mistakes);

    Storage.updateKeyStats(TypingEngine.buildKeyUpdates(session));
    const updatedStats = Storage.updateAfterSession({ wpm, accuracy, type: 'practice', duration });
    Storage.addPracticeSession({ wpm, accuracy, mistakes: session.mistakes });

    const lesson = Practice.getCurrentLesson() || Practice._adaptiveLesson;
    if (lesson && lesson.id !== 'adaptive') Storage.markLessonComplete(lesson.id);

    document.getElementById('practice-session').style.display = 'none';
    document.getElementById('practice-results').style.display = 'block';

    const summary = Statistics.buildSessionSummary({
      wpm,
      accuracy,
      mistakes: session.mistakes,
      duration,
      type: 'practice',
      prevWPM: updatedStats.prevWPM,
      prevBest: updatedStats.prevBest,
    });

    Statistics.renderResultsScreen('practice-results', summary, {
      onRaceAgain: () => {
        document.getElementById('practice-results').style.display = 'none';
        document.getElementById('practice-menu').style.display = 'block';
        renderPracticeMenu();
      },
      onPracticeWeak: () => initAdaptivePractice(),
      onDashboard: () => { showView('dashboard'); renderDashboard(); },
    });
  }

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setElem(id, value, prop = 'textContent') {
    const el = document.getElementById(id);
    if (el) el[prop] = value;
  }

  /* ══════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════ */
  function init() {
    // Nav buttons
    document.getElementById('nav-dashboard')?.addEventListener('click', () => { showView('dashboard'); renderDashboard(); });
    document.getElementById('nav-race')?.addEventListener('click', () => showView('race'));
    document.getElementById('nav-practice')?.addEventListener('click', () => { showView('practice'); renderPracticeMenu(); document.getElementById('practice-menu').style.display = 'block'; document.getElementById('practice-session').style.display = 'none'; document.getElementById('practice-results').style.display = 'none'; });
    document.getElementById('nav-test')?.addEventListener('click', () => { showView('test'); document.getElementById('test-setup').style.display = 'block'; document.getElementById('test-active').style.display = 'none'; document.getElementById('test-results').style.display = 'none'; });

    // Dashboard quick-action buttons
    document.getElementById('btn-start-race')?.addEventListener('click', () => { showView('race'); });
    document.getElementById('btn-practice')?.addEventListener('click', () => { showView('practice'); renderPracticeMenu(); document.getElementById('practice-menu').style.display = 'block'; document.getElementById('practice-session').style.display = 'none'; document.getElementById('practice-results').style.display = 'none'; });
    document.getElementById('btn-typing-test')?.addEventListener('click', () => { showView('test'); document.getElementById('test-setup').style.display = 'block'; document.getElementById('test-active').style.display = 'none'; document.getElementById('test-results').style.display = 'none'; });
    document.getElementById('btn-adaptive')?.addEventListener('click', () => { showView('practice'); initAdaptivePractice(); });

    // Race
    document.getElementById('btn-start-race-now')?.addEventListener('click', () => initRaceView());
    document.getElementById('race-input')?.addEventListener('input', handleRaceInput);
    document.getElementById('btn-restart-race')?.addEventListener('click', () => initRaceView());

    // Test
    document.getElementById('btn-test-30')?.addEventListener('click', () => startTypingTest(30));
    document.getElementById('btn-test-60')?.addEventListener('click', () => startTypingTest(60));
    document.getElementById('test-input')?.addEventListener('input', handleTestInput);

    // Practice
    document.getElementById('practice-input')?.addEventListener('input', handlePracticeInput);
    document.getElementById('btn-back-practice')?.addEventListener('click', () => {
      document.getElementById('practice-session').style.display = 'none';
      document.getElementById('practice-menu').style.display = 'block';
      Practice._adaptiveActive = false;
      practiceInputEnabled = false;
      renderPracticeMenu();
    });

    // Reset stats (dev)
    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
      if (confirm('Reset all your progress? This cannot be undone.')) {
        Storage.resetAll();
        renderDashboard();
      }
    });

    // Initial render
    renderDashboard();
  }

  return { init, showView, renderDashboard };
})();

document.addEventListener('DOMContentLoaded', App.init);
