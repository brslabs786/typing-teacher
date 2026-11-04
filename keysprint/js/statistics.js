/**
 * statistics.js — WPM chart, session summaries, and progress display
 */

const Statistics = (() => {
  /* ── Mini WPM Sparkline Chart ─────────────────────────── */
  function renderWPMChart(canvasEl, data) {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    const W = rect.width || 600;
    const H = rect.height || 160;

    canvasEl.width = W * dpr;
    canvasEl.height = H * dpr;
    ctx.scale(dpr, dpr);

    if (!data || data.length < 2) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#64748b';
      ctx.font = '13px "Inter", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Complete 2 or more sessions to see your progress chart', W / 2, H / 2);
      return;
    }

    const pad = { top: 20, right: 25, bottom: 25, left: 40 };
    const values = data.map(d => d.wpm);
    const maxVal = Math.max(...values, 10);
    const minVal = Math.max(0, Math.min(...values, 0));

    const scaleX = i => pad.left + (i / (data.length - 1)) * (W - pad.left - pad.right);
    const scaleY = v => H - pad.bottom - ((v - minVal) / Math.max(1, maxVal - minVal)) * (H - pad.top - pad.bottom);

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Grid lines & labels
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (g / 4) * (H - pad.top - pad.bottom);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      const label = Math.round(maxVal - (g / 4) * (maxVal - minVal));
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(label, pad.left - 8, y + 3);
    }

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    gradient.addColorStop(0, 'rgba(2, 132, 199, 0.18)');
    gradient.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(values[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(scaleX(i), scaleY(values[i]));
    }
    ctx.lineTo(scaleX(data.length - 1), H - pad.bottom);
    ctx.lineTo(scaleX(0), H - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(values[0]));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(scaleX(i), scaleY(values[i]));
    }
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    for (let i = 0; i < data.length; i++) {
      ctx.beginPath();
      ctx.arc(scaleX(i), scaleY(values[i]), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /* ── Session Summary Builder ──────────────────────────── */
  function buildSessionSummary({ wpm, accuracy, mistakes, duration, type, position, prevWPM = 0, prevBest = 0 }) {
    const stats = Storage.getStats();
    const goals = Storage.getGoals();
    const isNewBest = wpm > prevBest;
    const delta = prevWPM > 0 ? (wpm - prevWPM) : 0;
    const recommendation = AdaptiveLearning.getRecommendedLesson(stats);

    return {
      wpm,
      accuracy,
      mistakes,
      duration: Math.round(duration),
      type,
      position: position || null,
      prevWPM,
      prevBest,
      newBest: isNewBest,
      nextTarget: goals.nextTarget,
      milestone: goals.milestone,
      improvement: delta,
      recommendation,
    };
  }

  /* ── Weak Key Summary ─────────────────────────────────── */
  function getWeakKeySummary() {
    const weakKeys = Storage.getWeakKeys(4, 5);
    if (!weakKeys || weakKeys.length === 0) return null;
    return weakKeys.map(k => ({
      key: k.key,
      accuracy: k.accuracy,
      label: k.key.toUpperCase(),
    }));
  }

  /* ── Render results screen ────────────────────────────── */
  function renderResultsScreen(containerId, summary, callbacks = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
      wpm, accuracy, mistakes, duration, type, position,
      prevWPM, prevBest, newBest, nextTarget, milestone,
      improvement, recommendation,
    } = summary;

    const weakKeys = getWeakKeySummary();

    // Heading based on type
    let title = '🏁 Race Complete!';
    let restartBtnText = '🏎️ Race Again';
    if (type === 'test') {
      title = '⏱️ Speed Test Complete!';
      restartBtnText = '⏱️ Test Again';
    } else if (type === 'practice') {
      title = '📚 Practice Session Complete!';
      restartBtnText = '📚 Another Lesson';
    }

    // Position display for race
    let positionBadge = '';
    if (position !== null && type === 'race') {
      const medals = { 1: '🥇 1st Place — Winner!', 2: '🥈 2nd Place', 3: '🥉 3rd Place', 4: '4th Place' };
      const medalText = medals[position] || `#${position} Place`;
      positionBadge = `<div class="result-position-badge pos-${position}">${medalText}</div>`;
    }

    const newBestBadge = newBest ? '<div class="badge badge-gold">🏆 New Personal Best!</div>' : '';

    // Improvement badge
    let improvementHtml = '';
    if (prevWPM > 0) {
      if (improvement > 0) {
        improvementHtml = `<span class="trend-pill trend-up">▲ +${improvement} WPM Improvement</span>`;
      } else if (improvement < 0) {
        improvementHtml = `<span class="trend-pill trend-down">▼ ${improvement} WPM from last session</span>`;
      } else {
        improvementHtml = `<span class="trend-pill trend-neutral">▬ Same speed as last session</span>`;
      }
    } else {
      improvementHtml = `<span class="trend-pill trend-neutral">🎯 Baseline session recorded</span>`;
    }

    // Weak keys chips
    const weakKeyHtml = weakKeys
      ? `<div class="weak-keys-summary">
          <h4>⚠️ Weakest Keys Identified</h4>
          <div class="weak-key-chips">
            ${weakKeys.map(k => `<span class="key-chip bad" title="${k.accuracy}% accuracy">${k.label}<small>${k.accuracy}%</small></span>`).join('')}
          </div>
        </div>`
      : `<div class="weak-keys-summary">
          <h4>💡 Accuracy Note</h4>
          <p class="muted" style="font-size:0.85rem;margin:0;">Keep typing to build up enough key statistics for adaptive drills.</p>
        </div>`;

    // Recommendation card
    const recHtml = recommendation
      ? `<div class="result-recommendation">
          <div class="rec-title">Next Recommended Practice</div>
          <strong>${recommendation.label}</strong>
          <p>${recommendation.description}</p>
        </div>`
      : '';

    container.innerHTML = `
      <div class="results-card">
        <div class="results-header">
          <h2>${title}</h2>
          ${positionBadge}
          ${newBestBadge}
        </div>

        <div class="results-stats">
          <div class="result-stat">
            <span class="stat-value">${wpm}</span>
            <span class="stat-label">WPM</span>
          </div>
          <div class="result-stat">
            <span class="stat-value">${accuracy}%</span>
            <span class="stat-label">Accuracy</span>
          </div>
          <div class="result-stat">
            <span class="stat-value">${mistakes}</span>
            <span class="stat-label">Mistakes</span>
          </div>
          <div class="result-stat">
            <span class="stat-value">${duration}s</span>
            <span class="stat-label">Duration</span>
          </div>
        </div>

        <!-- Previous vs Current Comparison -->
        <div class="results-comparison">
          <div class="comp-item">
            <span class="comp-label">Previous Speed</span>
            <span class="comp-val">${prevWPM > 0 ? prevWPM + ' WPM' : '—'}</span>
          </div>
          <div class="comp-item">
            <span class="comp-label">Current Speed</span>
            <span class="comp-val accent">${wpm} WPM</span>
          </div>
          <div class="comp-item">
            <span class="comp-label">Trend</span>
            ${improvementHtml}
          </div>
        </div>

        <!-- Goals -->
        <div class="results-progress">
          <div class="progress-item">
            <span>Personal Best</span>
            <strong>${Math.max(prevBest, wpm)} WPM</strong>
          </div>
          <div class="progress-item">
            <span>Next Target</span>
            <strong>${nextTarget} WPM</strong>
          </div>
          <div class="progress-item">
            <span>Milestone</span>
            <strong>${milestone} WPM</strong>
          </div>
        </div>

        ${weakKeyHtml}
        ${recHtml}

        <div class="results-actions">
          <button class="btn btn-primary" id="btn-race-again">${restartBtnText}</button>
          <button class="btn btn-secondary" id="btn-practice-weak">🎯 Practice Weak Keys</button>
          <button class="btn btn-outline" id="btn-dashboard">🏠 Return to Dashboard</button>
        </div>
      </div>`;

    if (callbacks.onRaceAgain) {
      document.getElementById('btn-race-again')?.addEventListener('click', callbacks.onRaceAgain);
    }
    if (callbacks.onPracticeWeak) {
      document.getElementById('btn-practice-weak')?.addEventListener('click', callbacks.onPracticeWeak);
    }
    if (callbacks.onDashboard) {
      document.getElementById('btn-dashboard')?.addEventListener('click', callbacks.onDashboard);
    }
  }

  return {
    renderWPMChart,
    buildSessionSummary,
    getWeakKeySummary,
    renderResultsScreen,
  };
})();
