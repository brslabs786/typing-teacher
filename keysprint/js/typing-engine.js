/**
 * typing-engine.js — Core typing validation and WPM/accuracy engine
 */

const TypingEngine = (() => {
  /* ── Passage Library ───────────────────────────────────── */
  const PASSAGES = {
    easy: [
      "The quick brown fox jumps over the lazy dog near the old farm.",
      "She sells sea shells by the sea shore and the shore sells shells.",
      "A big black bear sat on a big black rug by the fire.",
      "Pack my box with five dozen liquor jugs for the long trip.",
      "How much wood would a woodchuck chuck if it could chuck wood.",
      "Peter Piper picked a peck of pickled peppers from the garden.",
    ],
    medium: [
      "The art of typing is not just about speed but also precision. Practice every day to build muscle memory and consistency over time.",
      "Learning to type efficiently opens many doors in a modern world. Focus on accuracy first, then gradually increase your speed.",
      "Computers have changed the way we communicate. Typing quickly and accurately is now one of the most valuable skills you can develop.",
      "The best typists do not look at their keyboards. They trust their fingers and focus entirely on the text in front of them.",
      "Speed comes naturally when your hands know where every key is. Start slow, stay accurate, and let your pace build over weeks of practice.",
    ],
    hard: [
      "Efficiency in typing requires a combination of muscle memory, rhythm, and mental focus. The fingers must glide across the keyboard without conscious effort, responding to each character as naturally as breathing.",
      "Modern software development demands not only logical thinking but also the ability to translate thoughts into code rapidly. A skilled programmer who types at 80 WPM can iterate ideas far faster than one at 40 WPM.",
      "The QWERTY keyboard layout was originally designed to slow typists down and prevent mechanical jams. Ironically, it became the universal standard that billions of people use today without question.",
      "Professional transcriptionists routinely achieve speeds above 100 words per minute with accuracy exceeding 98 percent. Reaching such levels requires years of daily practice and a deep commitment to the craft.",
    ],
    numbers: [
      "Call 555-1234 or visit us at 42 Oak Street, Building 7, Suite 300. Hours: 9am to 5pm Monday through Friday.",
      "Order #48291 total: $129.99. Ship to: 7 Maple Ave, Apt 3B. Expected delivery: 3 to 5 business days.",
      "Password must be 8 to 16 characters with at least 1 number and 1 symbol like @, #, or !.",
    ],
    homerow: [
      "add all dad fall flask glad jag kafkaesque sad dad fall flask glad",
      "flask salad glass shall lass lads flag glad sad jag has half",
      "alas fads gash hall jabs kafka lads mash nada oafs pads quad",
      "as had ask dash flag gal half jab lake lad sal flask glad",
    ],
    common_words: [
      "the and for are but not you all can her was one our out",
      "day get has him his how man new now old see two way who",
      "any came give got hand high keep last long make most much must",
      "name next only open over same side such take that them then time",
    ],
  };

  function getPassage(type = 'medium') {
    const list = PASSAGES[type] || PASSAGES.medium;
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ── Session State ─────────────────────────────────────── */
  function createSession(text) {
    return {
      text,
      typed: '',
      cursor: 0,
      startTime: null,
      endTime: null,
      mistakes: 0,
      keyErrors: {}, // key → count of wrong presses
      keyCorrect: {}, // key → count of correct presses
      active: false,
    };
  }

  /* ── Character-level counting ──────────────────────────── */
  function countCorrectChars(text, typed) {
    let count = 0;
    const limit = Math.min(text.length, typed.length);
    for (let i = 0; i < limit; i++) {
      if (typed[i] === text[i]) {
        count++;
      }
    }
    return count;
  }

  /* ── Core Input Handler ────────────────────────────────── */
  /**
   * Process input string from textarea.
   * Allows backspace correction.
   * Only the exact wrong letters are marked red, correct letters are green.
   */
  function processInput(session, inputValue) {
    if (!session.active) {
      session.active = true;
      session.startTime = Date.now();
    }

    const target = session.text;
    const typed = inputValue;

    // Detect backspace/deletion: user corrected input
    if (typed.length < session.typed.length) {
      session.typed = typed;
      session.cursor = typed.length;
      return buildResult(session, false);
    }

    // New characters added
    const prevLen = session.typed.length;
    for (let i = prevLen; i < typed.length; i++) {
      if (i < target.length) {
        const expected = target[i];
        const actual = typed[i];
        if (actual === expected) {
          const key = expected.toLowerCase();
          session.keyCorrect[key] = (session.keyCorrect[key] || 0) + 1;
        } else {
          session.mistakes += 1;
          const expectedKey = expected.toLowerCase();
          session.keyErrors[expectedKey] = (session.keyErrors[expectedKey] || 0) + 1;
        }
      }
    }

    session.typed = typed;
    session.cursor = typed.length;

    const finished = typed.length >= target.length;

    if (finished && !session.endTime) {
      session.endTime = Date.now();
    }

    return buildResult(session, finished);
  }

  function buildResult(session, finished) {
    const elapsed = getElapsedMinutes(session);
    const correctChars = countCorrectChars(session.text, session.typed);
    const wpm = calcWPM(correctChars, elapsed);
    const accuracy = calcAccuracy(correctChars, session.mistakes, session.typed.length);

    return {
      finished,
      wpm,
      accuracy,
      correctChars,
      mistakes: session.mistakes,
      elapsed,
    };
  }

  /* ── Character-level diff ──────────────────────────────── */
  /**
   * Returns array of { char, status: 'correct'|'incorrect'|'pending'|'active' }
   * If a letter is wrong, only THAT letter is marked 'incorrect' (red).
   * Characters ahead that match are marked 'correct' (green).
   */
  function getDiffTokens(text, typed) {
    return text.split('').map((char, i) => {
      if (i < typed.length) {
        return { char, status: typed[i] === char ? 'correct' : 'incorrect' };
      } else if (i === typed.length) {
        return { char, status: 'active' };
      } else {
        return { char, status: 'pending' };
      }
    });
  }

  /* ── Calculations ──────────────────────────────────────── */
  function calcWPM(correctChars, elapsedMinutes) {
    if (elapsedMinutes <= 0 || correctChars <= 0) return 0;
    return Math.round((correctChars / 5) / elapsedMinutes);
  }

  function calcAccuracy(correctChars, mistakes, totalTyped) {
    const total = totalTyped || (correctChars + mistakes);
    if (total <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((correctChars / total) * 100)));
  }

  function getElapsedMinutes(session) {
    if (!session.startTime) return 0;
    const end = session.endTime || Date.now();
    return Math.max(0.001, (end - session.startTime) / 60000);
  }

  function getElapsedSeconds(session) {
    return getElapsedMinutes(session) * 60;
  }

  /* ── Key stats builder ─────────────────────────────────── */
  function buildKeyUpdates(session) {
    const updates = {};
    for (const [key, count] of Object.entries(session.keyCorrect)) {
      updates[key] = updates[key] || { correct: 0, incorrect: 0 };
      updates[key].correct += count;
    }
    for (const [key, count] of Object.entries(session.keyErrors)) {
      updates[key] = updates[key] || { correct: 0, incorrect: 0 };
      updates[key].incorrect += count;
    }
    return updates;
  }

  /* ── Progress percentage ───────────────────────────────── */
  function getProgress(session) {
    if (!session.text.length) return 0;
    const correct = countCorrectChars(session.text, session.typed);
    return Math.min(100, Math.round((correct / session.text.length) * 100));
  }

  return {
    getPassage,
    createSession,
    processInput,
    getDiffTokens,
    calcWPM,
    calcAccuracy,
    countCorrectChars,
    getElapsedMinutes,
    getElapsedSeconds,
    buildKeyUpdates,
    getProgress,
    PASSAGES,
  };
})();
