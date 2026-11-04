/**
 * practice.js — Practice mode: lessons, visual keyboard, session management
 */

const Practice = (() => {
  /* ── Lesson Library ───────────────────────────────────── */
  const LESSONS = {
    beginner: [
      {
        id: 'b1', title: 'Home Row — Left Hand', level: 'beginner',
        description: 'Master the foundation: A S D F G',
        text: 'asdf fdsa asdf fdsa add fall sad glad ask dad gala flask sad flask glad',
        targetKeys: ['a', 's', 'd', 'f', 'g'],
      },
      {
        id: 'b2', title: 'Home Row — Right Hand', level: 'beginner',
        description: 'Master the other half: H J K L ;',
        text: 'hjkl lkjh hjkl lkjh hall jab kill hall lakh lad jab hall kill jab',
        targetKeys: ['h', 'j', 'k', 'l'],
      },
      {
        id: 'b3', title: 'Full Home Row', level: 'beginner',
        description: 'Both hands on home row',
        text: 'asdf hjkl glad hall flask jab sad kill ask lad fall desk salad flask',
        targetKeys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      },
      {
        id: 'b4', title: 'Simple Words', level: 'beginner',
        description: 'Common short words using home row',
        text: 'as had ask fad gal jab lad has sad all add dad lag gas fall hall ask',
        targetKeys: [],
      },
      {
        id: 'b5', title: 'Short Sentences', level: 'beginner',
        description: 'Your first full sentences with home row keys',
        text: 'dad had a glad flask. jab all lads. ask all gals. a sad lad had a salad.',
        targetKeys: [],
      },
    ],

    intermediate: [
      {
        id: 'i1', title: 'Upper Row — Left', level: 'intermediate',
        description: 'Q W E R T keys',
        text: 'qwer rewq qwer tree were queue write every tower were quite tower write',
        targetKeys: ['q', 'w', 'e', 'r', 't'],
      },
      {
        id: 'i2', title: 'Upper Row — Right', level: 'intermediate',
        description: 'Y U I O P keys',
        text: 'yuiop poiuy yuiop your input open point upon input your point open upon',
        targetKeys: ['y', 'u', 'i', 'o', 'p'],
      },
      {
        id: 'i3', title: 'Lower Row', level: 'intermediate',
        description: 'Z X C V B N M keys',
        text: 'zxcv vczx zxcv next move calm vibe zinc next calm move vibe zinc next',
        targetKeys: ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
      },
      {
        id: 'i4', title: 'Common Words', level: 'intermediate',
        description: 'Most frequent English words',
        text: 'the and for are but not you all can her was one our out day get has him his how man new now',
        targetKeys: [],
      },
      {
        id: 'i5', title: 'Sentences with Punctuation', level: 'intermediate',
        description: 'Full sentences including capitals and punctuation',
        text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How are you today?',
        targetKeys: [],
      },
      {
        id: 'i6', title: 'Numbers Row', level: 'intermediate',
        description: 'Practice 1 through 0 numbers',
        text: '1234 5678 90 12 34 56 78 90 123 456 789 0 1234567890 10 20 30 40 50',
        targetKeys: ['1','2','3','4','5','6','7','8','9','0'],
      },
    ],

    advanced: [
      {
        id: 'a1', title: 'Paragraph Typing', level: 'advanced',
        description: 'Full paragraph — maintain speed and accuracy',
        text: 'Learning to type efficiently opens many doors in a modern world. Focus on accuracy first, then gradually increase your speed. The best typists do not look at their keyboards.',
        targetKeys: [],
      },
      {
        id: 'a2', title: 'Numbers and Symbols', level: 'advanced',
        description: 'Mixed alphanumeric with symbols',
        text: 'Call 555-1234 today! Your order #48291 totals $129.99. Email us at help@keysprint.io for support.',
        targetKeys: [],
      },
      {
        id: 'a3', title: 'Speed Burst', level: 'advanced',
        description: 'High frequency words for maximum rhythm and pace',
        text: 'the and that have from they this with would make like time just know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us',
        targetKeys: [],
      },
      {
        id: 'a4', title: 'Long Passage', level: 'advanced',
        description: 'Sustained typing endurance test',
        text: 'The art of typing is not just about speed but also precision. Practice every day to build muscle memory and consistency over time. Speed comes naturally when your hands know where every key is. Start slow, stay accurate, and let your pace build over weeks of practice.',
        targetKeys: [],
      },
    ],
  };

  /* ── Visual Keyboard Layout ───────────────────────────── */
  const KEYBOARD_ROWS = [
    ['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
    ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
    ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
    ['Shift','z','x','c','v','b','n','m',',','.','/','Shift'],
    ['Space'],
  ];

  const FINGER_MAP = {
    '`':'left-pinky','1':'left-pinky','q':'left-pinky','a':'left-pinky','z':'left-pinky','~':'left-pinky','!':'left-pinky',
    '2':'left-ring','w':'left-ring','s':'left-ring','x':'left-ring','@':'left-ring',
    '3':'left-middle','e':'left-middle','d':'left-middle','c':'left-middle','#':'left-middle',
    '4':'left-index','r':'left-index','f':'left-index','v':'left-index','$':'left-index',
    '5':'left-index','t':'left-index','g':'left-index','b':'left-index','%':'left-index',
    '6':'right-index','y':'right-index','h':'right-index','n':'right-index','^':'right-index',
    '7':'right-index','u':'right-index','j':'right-index','m':'right-index','&':'right-index',
    '8':'right-middle','i':'right-middle','k':'right-middle',',':'right-middle','*':'right-middle','<':'right-middle',
    '9':'right-ring','o':'right-ring','l':'right-ring','.':'right-ring','(':'right-ring','>':'right-ring',
    '0':'right-pinky','p':'right-pinky',';':'right-pinky','/':'right-pinky',')':'right-pinky',':':'right-pinky','?':'right-pinky',
    '-':'right-pinky','=':'right-pinky',"'":'right-pinky','_':'right-pinky','+':'right-pinky','"':'right-pinky',
    '[':'right-pinky',']':'right-pinky','{':'right-pinky','}':'right-pinky','\\':'right-pinky','|':'right-pinky',
    ' ':'thumb',
  };

  const FINGER_NAMES = {
    'left-pinky':  'Left Pinky',
    'left-ring':   'Left Ring',
    'left-middle': 'Left Middle',
    'left-index':  'Left Index',
    'right-index': 'Right Index',
    'right-middle':'Right Middle',
    'right-ring':  'Right Ring',
    'right-pinky': 'Right Pinky',
    'thumb':       'Thumb (Spacebar)',
  };

  const FINGER_COLORS = {
    'left-pinky':  '#ff6b9d',
    'left-ring':   '#ff9d6b',
    'left-middle': '#ffd93d',
    'left-index':  '#6bff8e',
    'right-index': '#6bcfff',
    'right-middle':'#c3a0ff',
    'right-ring':  '#ff6b6b',
    'right-pinky': '#ff6b9d',
    'thumb':       '#a0a0a0',
  };

  function renderKeyboard(containerId, activeChar = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const activeKey = activeChar ? activeChar.toLowerCase() : null;
    const finger = activeKey ? (FINGER_MAP[activeKey] || FINGER_MAP[activeChar] || '') : '';
    const fingerName = finger ? (FINGER_NAMES[finger] || finger) : '';
    const fingerColor = finger ? (FINGER_COLORS[finger] || '#63d4ff') : '#63d4ff';
    const charDisplay = activeChar === ' ' ? 'Space' : (activeChar || 'None');

    let html = '';

    // Active key and finger guidance banner
    if (activeChar !== null) {
      html += `
        <div class="finger-guidance">
          <span>Target Key: <strong class="guidance-key">${charDisplay}</strong></span>
          ${fingerName ? `<span class="guidance-sep">•</span><span>Recommended Finger: <strong class="guidance-finger" style="color:${fingerColor};">${fingerName}</strong></span>` : ''}
        </div>
      `;
    }

    html += '<div class="visual-keyboard">';
    KEYBOARD_ROWS.forEach(row => {
      html += '<div class="key-row">';
      row.forEach(key => {
        const keyLower = key.toLowerCase();
        const isActive = (activeKey === ' ' && key === 'Space') || (activeKey && keyLower === activeKey);
        const keyFinger = FINGER_MAP[keyLower] || '';
        const color = keyFinger ? FINGER_COLORS[keyFinger] : '';
        const style = color ? `style="--finger-color:${color}"` : '';
        const activeClass = isActive ? 'key-active' : '';
        const fingerClass = keyFinger ? `finger-${keyFinger}` : '';
        const specialClass = ['Backspace','Tab','Caps','Enter','Shift','Space'].includes(key) ? 'key-special' : '';
        const spaceClass = key === 'Space' ? 'key-space' : '';
        html += `<div class="key ${activeClass} ${fingerClass} ${specialClass} ${spaceClass}" ${style} data-key="${key}">
          <span>${key === 'Space' ? '' : key}</span>
        </div>`;
      });
      html += '</div>';
    });
    html += '</div>';

    // Finger legend
    html += `<div class="finger-legend">`;
    Object.entries(FINGER_COLORS).forEach(([fKey, color]) => {
      if (fKey === 'thumb') return;
      const label = FINGER_NAMES[fKey] || fKey;
      const isCurrentFinger = fKey === finger;
      html += `<span class="legend-item ${isCurrentFinger ? 'active-legend' : ''}"><span class="legend-dot" style="background:${color}"></span>${label}</span>`;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  /* ── Session ──────────────────────────────────────────── */
  let currentLesson = null;
  let session = null;

  function startLesson(lessonId) {
    const allLessons = [...LESSONS.beginner, ...LESSONS.intermediate, ...LESSONS.advanced];
    currentLesson = allLessons.find(l => l.id === lessonId);
    if (!currentLesson) return null;
    session = TypingEngine.createSession(currentLesson.text);
    return { lesson: currentLesson, session };
  }

  function processInput(inputValue) {
    if (!session) return null;
    return TypingEngine.processInput(session, inputValue);
  }

  function getCurrentChar() {
    if (!session || !currentLesson) return null;
    return currentLesson.text[session.cursor] || null;
  }

  function getSession() { return session; }
  function getCurrentLesson() { return currentLesson; }

  function completeLesson() {
    if (!currentLesson || !session) return null;
    const correctChars = TypingEngine.countCorrectChars(session.text, session.typed);
    const duration = TypingEngine.getElapsedSeconds(session);
    const result = {
      lessonId: currentLesson.id,
      wpm: TypingEngine.calcWPM(correctChars, duration / 60),
      accuracy: TypingEngine.calcAccuracy(correctChars, session.mistakes),
      mistakes: session.mistakes,
      duration: Math.round(duration),
      keyUpdates: TypingEngine.buildKeyUpdates(session),
    };
    Storage.markLessonComplete(currentLesson.id);
    return result;
  }

  return {
    LESSONS,
    KEYBOARD_ROWS,
    FINGER_MAP,
    FINGER_NAMES,
    FINGER_COLORS,
    renderKeyboard,
    startLesson,
    processInput,
    getCurrentChar,
    getSession,
    getCurrentLesson,
    completeLesson,
  };
})();
