/**
 * adaptive-learning.js — Tracks per-key performance and generates targeted practice
 */

const AdaptiveLearning = (() => {
  /* ── Weak-Key Practice Generator ─────────────────────── */

  const LETTER_GROUPS = {
    homerow: 'asdfghjkl',
    upper: 'qwertyuiop',
    lower: 'zxcvbnm',
    all: 'abcdefghijklmnopqrstuvwxyz',
  };

  const COMMON_WORDS_BY_LETTER = {
    a: ['and', 'all', 'are', 'at', 'an', 'as', 'any', 'also', 'away', 'about', 'after', 'again', 'always'],
    b: ['but', 'by', 'be', 'been', 'back', 'big', 'best', 'build', 'both', 'body', 'begin', 'below'],
    c: ['can', 'come', 'could', 'cut', 'car', 'call', 'city', 'cold', 'clear', 'carry', 'catch', 'close'],
    d: ['do', 'down', 'did', 'day', 'door', 'dark', 'deep', 'door', 'drop', 'draw', 'during', 'drive'],
    e: ['end', 'even', 'each', 'eat', 'else', 'ever', 'early', 'earth', 'easy', 'every', 'enough', 'every'],
    f: ['for', 'from', 'find', 'few', 'face', 'far', 'fall', 'feel', 'full', 'fact', 'fast', 'first'],
    g: ['go', 'give', 'got', 'get', 'good', 'grow', 'great', 'green', 'ground', 'group', 'game', 'grab'],
    h: ['he', 'has', 'have', 'her', 'him', 'his', 'how', 'here', 'high', 'hand', 'hard', 'head'],
    i: ['in', 'it', 'is', 'if', 'into', 'its', 'idea', 'iron', 'inch', 'inside', 'image', 'issue'],
    j: ['just', 'job', 'join', 'joy', 'jump', 'judge', 'july', 'june', 'jar', 'jaw', 'jet', 'jog'],
    k: ['keep', 'key', 'kind', 'know', 'kick', 'kill', 'king', 'knit', 'keen', 'kept', 'kite', 'knot'],
    l: ['like', 'long', 'look', 'let', 'last', 'left', 'life', 'line', 'list', 'live', 'land', 'large'],
    m: ['make', 'more', 'most', 'my', 'may', 'move', 'mind', 'much', 'meet', 'miss', 'mean', 'month'],
    n: ['not', 'now', 'new', 'no', 'next', 'near', 'need', 'name', 'nice', 'node', 'note', 'north'],
    o: ['of', 'on', 'or', 'one', 'our', 'out', 'off', 'old', 'open', 'over', 'only', 'other'],
    p: ['put', 'part', 'past', 'path', 'pay', 'pick', 'plan', 'play', 'plus', 'poor', 'pull', 'push'],
    q: ['quick', 'quiet', 'quite', 'queen', 'quest', 'queue', 'quiz', 'query', 'quit', 'quota'],
    r: ['run', 'read', 'real', 'rest', 'rich', 'ride', 'rise', 'road', 'rock', 'room', 'root', 'rule'],
    s: ['she', 'say', 'see', 'set', 'sit', 'six', 'so', 'some', 'soon', 'sort', 'such', 'sure', 'send'],
    t: ['the', 'to', 'that', 'this', 'they', 'then', 'there', 'time', 'top', 'try', 'tell', 'take'],
    u: ['up', 'use', 'used', 'under', 'until', 'unit', 'upon', 'urban', 'usual', 'upper', 'undo'],
    v: ['very', 'view', 'vote', 'void', 'vast', 'vibe', 'vine', 'volt', 'value', 'valid', 'visit'],
    w: ['we', 'was', 'with', 'will', 'way', 'work', 'want', 'well', 'when', 'while', 'what', 'where'],
    x: ['box', 'fix', 'mix', 'six', 'tax', 'wax', 'flex', 'next', 'exit', 'exam', 'axis', 'extra'],
    y: ['you', 'yet', 'yes', 'your', 'year', 'young', 'yard', 'yarn', 'yell', 'yield', 'yawn'],
    z: ['zero', 'zone', 'zoom', 'zinc', 'zip', 'zeal', 'zest', 'zen', 'zebra', 'zipper', 'zig'],
  };

  /**
   * Generate a targeted practice text for the given weak keys.
   * @param {string[]} weakKeys - e.g. ['r', 't', 'p']
   * @param {number} length - target character count
   */
  function generateWeakKeyPractice(weakKeys, length = 150) {
    if (!weakKeys || weakKeys.length === 0) {
      return TypingEngine.getPassage('medium');
    }

    // Gather words containing the weak keys, weighted toward weakest
    const wordPool = [];
    weakKeys.forEach((k, idx) => {
      const char = String(k).toLowerCase();
      const weight = weakKeys.length - idx; // higher weight for weaker keys
      const words = COMMON_WORDS_BY_LETTER[char] || [];
      for (let w = 0; w < weight + 1; w++) {
        wordPool.push(...words);
      }
    });

    // Deduplicate and shuffle
    const unique = [...new Set(wordPool)];
    if (unique.length === 0) {
      return TypingEngine.getPassage('medium');
    }

    const shuffled = unique.sort(() => Math.random() - 0.5);

    // Build a sentence-like passage
    let result = '';
    let idx = 0;
    while (result.length < length) {
      result += shuffled[idx % shuffled.length] + ' ';
      idx++;
    }

    // Capitalise first letter, trim, add period
    result = result.trim();
    result = result.charAt(0).toUpperCase() + result.slice(1) + '.';

    return result;
  }

  /**
   * Determine which practice lesson to recommend next based on performance.
   */
  function getRecommendedLesson(stats) {
    const weakKeys = Storage.getWeakKeys(4, 4);
    if (weakKeys.length >= 1) {
      const keyList = weakKeys.map(k => k.key.toUpperCase()).join(', ');
      return {
        type: 'adaptive',
        label: `Weak Key Drill: ${keyList}`,
        description: `Your accuracy on ${keyList} has room for improvement. Complete this drill to level up!`,
        weakKeys: weakKeys.map(k => k.key),
      };
    }

    const wpm = stats.currentWPM || 0;
    if (wpm < 20) {
      return { type: 'beginner', label: 'Beginner Practice', description: 'Master home-row muscle memory to build a solid foundation.' };
    } else if (wpm < 40) {
      return { type: 'intermediate', label: 'Intermediate Practice', description: 'Expand to upper/lower rows and common vocabulary.' };
    } else {
      return { type: 'advanced', label: 'Advanced Practice', description: 'Challenge yourself with long passages and complex punctuation.' };
    }
  }

  /**
   * Calculate key accuracy map from raw stats.
   */
  function getKeyAccuracyMap() {
    const rawStats = Storage.getKeyStats();
    const map = {};
    for (const [key, data] of Object.entries(rawStats)) {
      if (data.attempts > 0) {
        map[key] = Math.round((data.correct / data.attempts) * 100);
      }
    }
    return map;
  }

  return {
    generateWeakKeyPractice,
    getRecommendedLesson,
    getKeyAccuracyMap,
    COMMON_WORDS_BY_LETTER,
    LETTER_GROUPS,
  };
})();
