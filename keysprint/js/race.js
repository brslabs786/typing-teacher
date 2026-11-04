/**
 * race.js — Racing game logic: bots, countdown, car animation, race state
 */

const Race = (() => {
  /* ── Bot Speed Profiles ───────────────────────────────── */
  const BOT_PROFILES = {
    easy:   [{ name: 'Tortoise', wpm: 18, variance: 4 }, { name: 'Stumbler', wpm: 22, variance: 5 }, { name: 'Pecker',   wpm: 26, variance: 5 }],
    medium: [{ name: 'Dasher',   wpm: 35, variance: 6 }, { name: 'Skipper',  wpm: 42, variance: 7 }, { name: 'Blazer',   wpm: 50, variance: 8 }],
    hard:   [{ name: 'Ninja',    wpm: 60, variance: 8 }, { name: 'Flash',   wpm: 72, variance: 9 }, { name: 'Legend',   wpm: 85, variance: 10 }],
  };

  const BOT_COLORS = ['#ff6b6b', '#ffd93d', '#c3fc5a'];
  const PLAYER_COLOR = '#63d4ff';

  /* ── State ───────────────────────────────────────────── */
  let state = null;
  let animFrameId = null;
  let countdownInterval = null;
  let raceRunId = 0;
  let callbacks = {};
  let passage = '';

  /* ── Initialise a race ───────────────────────────────── */
  function init(options = {}) {
    // Clear any previous running timers/loops
    raceRunId++;
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    stopAnimation();

    const difficulty = options.difficulty || 'medium';
    passage = options.passage || TypingEngine.getPassage('medium');
    const bots = BOT_PROFILES[difficulty].map((profile, idx) => ({
      ...profile,
      color: BOT_COLORS[idx],
      progress: 0,
      charsDone: 0,
      finished: false,
      finishTime: null,
      currentWPM: Math.max(10, profile.wpm + (Math.random() - 0.5) * profile.variance * 2),
    }));

    state = {
      passage,
      session: TypingEngine.createSession(passage),
      bots,
      difficulty,
      playerProgress: 0,
      playerFinished: false,
      playerFinishTime: null,
      raceStartTime: null,
      raceFinished: false,
      countingDown: false,
      countdown: 3,
      started: false,
      positions: [], // order of finishers
      playerPosition: null,
    };

    callbacks = options.callbacks || {};
    return state;
  }

  /* ── Countdown ───────────────────────────────────────── */
  function startCountdown(onTick, onGo) {
    if (!state) return;
    state.countingDown = true;
    let count = 3;
    onTick(count);

    const currentRun = raceRunId;
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      if (raceRunId !== currentRun) {
        clearInterval(countdownInterval);
        return;
      }

      count--;
      if (count > 0) {
        onTick(count);
      } else {
        clearInterval(countdownInterval);
        countdownInterval = null;
        if (!state) return;
        state.countingDown = false;
        state.started = true;
        state.raceStartTime = Date.now();
        onGo();
        startBotSimulation(currentRun);
        startAnimationLoop();
      }
    }, 1000);
  }

  /* ── Bot Simulation ──────────────────────────────────── */
  function startBotSimulation(runId) {
    if (!state) return;
    const totalChars = state.passage.length;

    state.bots.forEach(bot => {
      const charsPerMs = (bot.currentWPM * 5) / (60 * 1000);
      const baseInterval = 1 / charsPerMs; // ms per char

      function typeNextChar() {
        if (raceRunId !== runId || !state || !state.started || bot.finished || state.raceFinished) return;

        // Realistic typing variance
        const variance = (Math.random() - 0.5) * baseInterval * 0.5;
        const delay = Math.max(15, baseInterval + variance);

        setTimeout(() => {
          if (raceRunId !== runId || !state || !state.started || state.raceFinished || bot.finished) return;

          bot.charsDone = Math.min(bot.charsDone + 1, totalChars);
          bot.progress = bot.charsDone / totalChars;

          if (bot.charsDone >= totalChars && !bot.finished) {
            bot.finished = true;
            bot.finishTime = Date.now() - state.raceStartTime;
            state.positions.push({ type: 'bot', name: bot.name, time: bot.finishTime });
            callbacks.onBotFinish && callbacks.onBotFinish(bot);
          } else {
            typeNextChar();
          }
        }, delay);
      }

      typeNextChar();
    });
  }

  /* ── Animation Loop ──────────────────────────────────── */
  function startAnimationLoop() {
    function loop() {
      if (!state || !state.started) return;
      callbacks.onFrame && callbacks.onFrame(getCarPositions());
      if (!state.raceFinished) {
        animFrameId = requestAnimationFrame(loop);
      }
    }
    animFrameId = requestAnimationFrame(loop);
  }

  function stopAnimation() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  /* ── Car Positions ───────────────────────────────────── */
  function getCarPositions() {
    if (!state) return { player: { progress: 0, color: PLAYER_COLOR, name: 'You', finished: false }, bots: [] };
    return {
      player: { progress: state.playerProgress, color: PLAYER_COLOR, name: 'You', finished: state.playerFinished },
      bots: state.bots.map(b => ({ progress: b.progress, color: b.color, name: b.name, finished: b.finished })),
    };
  }

  /* ── Process typing input ────────────────────────────── */
  function processInput(inputValue) {
    if (!state || !state.started || state.playerFinished) return null;

    const result = TypingEngine.processInput(state.session, inputValue);
    state.playerProgress = TypingEngine.getProgress(state.session) / 100;

    if (result.finished && !state.playerFinished) {
      state.playerFinished = true;
      state.playerFinishTime = Date.now() - state.raceStartTime;
      state.positions.push({ type: 'player', time: state.playerFinishTime });
      state.positions.sort((a, b) => a.time - b.time);
      state.playerPosition = state.positions.findIndex(p => p.type === 'player') + 1;

      // End race
      state.raceFinished = true;
      stopAnimation();
      callbacks.onPlayerFinish && callbacks.onPlayerFinish(getFinalResult());
    }

    return result;
  }

  /* ── Force end (timeout or manual stop) ─────────────────*/
  function endRace() {
    if (!state || state.raceFinished) return null;
    state.raceFinished = true;
    stopAnimation();

    const botsAhead = state.bots.filter(b => b.progress > state.playerProgress).length;
    state.playerPosition = botsAhead + 1;

    return getFinalResult();
  }

  /* ── Final Result ────────────────────────────────────── */
  function getFinalResult() {
    const session = state.session;
    const elapsed = TypingEngine.getElapsedSeconds(session);
    const correctChars = TypingEngine.countCorrectChars(session.text, session.typed);
    const wpm = TypingEngine.calcWPM(correctChars, elapsed / 60);
    const accuracy = TypingEngine.calcAccuracy(correctChars, session.mistakes);

    return {
      wpm,
      accuracy,
      mistakes: session.mistakes,
      duration: Math.round(elapsed),
      position: state.playerPosition || 1,
      passage: state.passage,
      keyUpdates: TypingEngine.buildKeyUpdates(session),
    };
  }

  /* ── Getters ─────────────────────────────────────────── */
  function getState() { return state; }
  function getPassage() { return passage; }

  return {
    init,
    startCountdown,
    processInput,
    endRace,
    getState,
    getPassage,
    getCarPositions,
    stopAnimation,
    BOT_PROFILES,
    PLAYER_COLOR,
    BOT_COLORS,
  };
})();
