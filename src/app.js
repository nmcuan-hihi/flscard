
let words = [];
let sentences = [];

let view = 'flash';
let mode = 'han';
let cardIndex = 0;
let flipped = false;

let quizOrder = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizAnswered = false;
let quizFinished = false;

let sentenceOrder = [];
let sentenceIndex = 0;
let sentenceTokens = [];
let selectedTokens = [];
let sentenceChecked = false;

const $ = id => document.getElementById(id);

const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

async function persist() {
  await window.flashcardAPI.saveWords({ words, sentences });
  updateStats();
}

function updateStats() {
  const mastered = words.filter(w => w.mastered).length;

  $('totalStat').textContent = words.length;
  $('masteredStat').textContent = mastered;
  $('reviewStat').textContent = words.length - mastered;
  $('progressStat').textContent =
    words.length ? Math.round(mastered / words.length * 100) + '%' : '0%';

  $('emptyState').classList.toggle('hidden', words.length > 0);

  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle(
      'hidden',
      (el.id === 'sentenceView'
        ? sentences.length === 0 || view !== 'sentence'
        : words.length === 0 || el.id !== view + 'View')
    );
  });
}

// ========================================
// MENU
// ========================================

function setView(next) {
  view = next;

  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === next);
  });

  const titles = {
    flash: 'Flashcard',
    quiz: 'Trắc nghiệm',
    sentence: 'Ghép câu',
    vocab: 'Từ vựng'
  };

  $('pageTitle').textContent = titles[next];

  updateStats();

  if (next === 'flash') renderCard();
  if (next === 'quiz') {
    if (!quizOrder.length) startQuiz();
    else renderQuiz();
  }
  if (next === 'sentence') {
    if (!sentenceOrder.length) startSentence();
    else renderSentence();
  }
  if (next === 'vocab') renderVocab();
}

// ========================================
// FLASHCARD
// ========================================

function renderCard() {
  if (!words.length) return;

  cardIndex = (cardIndex + words.length) % words.length;

  const w = words[cardIndex];

  $('cardCount').textContent = `${cardIndex + 1} / ${words.length}`;
  $('cardKicker').textContent = mode === 'han' ? 'CHỮ HÁN' : 'PINYIN';

  $('cardFront').textContent = mode === 'han' ? w.han : w.pinyin;
  $('cardBack').textContent = mode === 'han' ? w.pinyin : w.han;

  $('cardBack').classList.toggle('hidden', !flipped);
  $('cardFront').classList.toggle('hidden', flipped);

  $('flipHint').textContent = flipped
    ? 'Nhấn để xem lại ↻'
    : 'Nhấn để lật thẻ ↻';

  $('cardHint').textContent = w.mastered
    ? '✓ ĐÃ THUỘC'
    : 'NHỚ TỪ NÀY?';
}

function flipCard() {
  if (!words.length) return;
  flipped = !flipped;
  renderCard();
}

async function markCard(mastered) {
  if (!words.length) return;

  words[cardIndex].mastered = mastered;

  await persist();

  toast(mastered ? 'Đã đánh dấu thuộc' : 'Đã chuyển vào ôn tập');

  cardIndex = (cardIndex + 1) % words.length;
  flipped = false;
  renderCard();
}

// ========================================
// QUIZ - 4 ĐÁP ÁN TÙY CHỈNH
// ========================================

function getQuizFields() {
  const mode = $('quizMode').value;

  const modes = {
    'han-pinyin': {
      question: 'han',
      answer: 'pinyin',
      label: 'Hán → Pinyin'
    },
    'pinyin-han': {
      question: 'pinyin',
      answer: 'han',
      label: 'Pinyin → Hán'
    },
    'han-vi': {
      question: 'han',
      answer: 'meaning',
      label: 'Hán → Nghĩa tiếng Việt'
    },
    'vi-han': {
      question: 'meaning',
      answer: 'han',
      label: 'Nghĩa tiếng Việt → Hán'
    },
    'pinyin-vi': {
      question: 'pinyin',
      answer: 'meaning',
      label: 'Pinyin → Nghĩa tiếng Việt'
    },
    'vi-pinyin': {
      question: 'meaning',
      answer: 'pinyin',
      label: 'Nghĩa tiếng Việt → Pinyin'
    }
  };

  return modes[mode];
}

function startQuiz() {
  const config = getQuizFields();

  const validWords = words.filter(w =>
    w[config.question] && w[config.answer]
  );

  if (validWords.length < 4) {
    $('quizQuestion').textContent = 'Chưa đủ dữ liệu';
    $('answers').innerHTML = '';
    $('quizFeedback').textContent =
      'Cần ít nhất 4 từ có đầy đủ thông tin cho kiểu kiểm tra này.';
    $('quizNext').disabled = true;
    $('quizCount').textContent = 'CHƯA SẴN SÀNG';
    quizOrder = [];
    return;
  }

  const limit = $('quizLimit').value;
  const max = limit === 'all'
    ? validWords.length
    : Math.min(Number(limit), validWords.length);

  quizOrder = shuffle(validWords).slice(0, max);

  quizIndex = 0;
  quizCorrect = 0;
  quizAnswered = false;
  quizFinished = false;

  $('quizScore').textContent = '0';
  $('quizNext').textContent = 'Câu tiếp theo →';

  renderQuiz();
}

function renderQuiz() {
  if (!quizOrder.length) return;

  if (quizIndex >= quizOrder.length) {
    quizFinished = true;

    $('quizCount').textContent = 'HOÀN THÀNH';
    $('quizPercent').textContent = '100%';
    $('quizBar').style.width = '100%';

    $('quizQuestion').textContent = '完成！';
    $('answers').innerHTML = '';

    const percent = Math.round(quizCorrect / quizOrder.length * 100);

    $('quizFeedback').textContent =
      `Kết quả: ${quizCorrect}/${quizOrder.length} câu đúng (${percent}%).`;

    $('quizNext').textContent = 'Làm lại';
    $('quizNext').disabled = false;

    return;
  }

  quizAnswered = false;
  quizFinished = false;

  const config = getQuizFields();
  const correct = quizOrder[quizIndex];

  const candidates = words.filter(w =>
    w.id !== correct.id &&
    w[config.answer]
  );

  if (candidates.length < 3) {
    $('quizFeedback').textContent = 'Không đủ dữ liệu tạo 4 đáp án.';
    return;
  }

  const options = shuffle([
    correct,
    ...shuffle(candidates).slice(0, 3)
  ]);

  $('quizCount').textContent =
    `CÂU ${quizIndex + 1} / ${quizOrder.length}`;

  $('quizPercent').textContent =
    Math.round(quizIndex / quizOrder.length * 100) + '%';

  $('quizBar').style.width =
    `${quizIndex / quizOrder.length * 100}%`;

  $('quizDirection').textContent = config.label;

  $('quizQuestion').textContent = correct[config.question];

  $('quizFeedback').textContent = 'Chọn một đáp án bên dưới';
  $('quizFeedback').style.color = '#8592a4';

  $('quizNext').disabled = true;
  $('quizNext').textContent = 'Câu tiếp theo →';

  $('answers').innerHTML = '';

  options.forEach(option => {
    const button = document.createElement('button');

    button.className = 'answer';
    button.textContent = option[config.answer];

    button.addEventListener('click', () => {
      answerQuiz(button, option.id === correct.id, correct[config.answer]);
    });

    $('answers').appendChild(button);
  });
}

function answerQuiz(button, isCorrect, correctAnswer) {
  if (quizAnswered) return;

  quizAnswered = true;

  document.querySelectorAll('.answer').forEach(el => {
    el.disabled = true;

    if (el.textContent === correctAnswer) {
      el.classList.add('correct');
    }
  });

  if (isCorrect) {
    quizCorrect++;

    $('quizFeedback').textContent = '✓ Chính xác!';
    $('quizFeedback').style.color = '#168553';

  } else {
    button.classList.add('wrong');

    $('quizFeedback').textContent =
      `✗ Chưa đúng. Đáp án: ${correctAnswer}`;

    $('quizFeedback').style.color = '#c84d45';
  }

  $('quizScore').textContent = quizCorrect;
  $('quizNext').disabled = false;
}

function nextQuiz() {
  if (quizFinished) {
    startQuiz();
    return;
  }

  if (!quizAnswered) return;

  quizIndex++;
  renderQuiz();
}

// ========================================
// SENTENCE BUILDER
// ========================================

function normalizeChinese(text) {
  return String(text || '')
    .replace(/[\s，。！？、,.!?；;：:"'“”‘’（）()]/g, '');
}

// Tách câu theo từ vựng đã import
function tokenizeSentence(sentence) {
  const text = normalizeChinese(sentence);

  const dictionary = [...words]
    .filter(w => w.han)
    .sort((a, b) => b.han.length - a.han.length);

  const tokens = [];
  let position = 0;

  while (position < text.length) {
    let matched = null;

    for (const word of dictionary) {
      if (text.startsWith(word.han, position)) {
        matched = word;
        break;
      }
    }

    if (matched) {
      tokens.push({
        id: `token-${tokens.length}`,
        han: matched.han,
        pinyin: matched.pinyin || ''
      });

      position += matched.han.length;

    } else {
      const char = text[position];

      const charWord = dictionary.find(w => w.han === char);

      tokens.push({
        id: `token-${tokens.length}`,
        han: char,
        pinyin: charWord?.pinyin || ''
      });

      position++;
    }
  }

  return tokens;
}

function startSentence() {
  if (!sentences.length) {
    $('sentenceVietnamese').textContent = 'Chưa có câu tiếng Việt';
    $('wordBank').innerHTML = '';
    $('selectedWords').innerHTML = '';
    $('sentenceFeedback').textContent =
      'Hãy import sheet Sentences trong file Excel.';
    sentenceOrder = [];
    return;
  }

  sentenceOrder = shuffle(sentences.map((_, i) => i));
  sentenceIndex = 0;

  loadSentence();
}

function loadSentence() {
  if (!sentenceOrder.length) return;

  const current = sentences[sentenceOrder[sentenceIndex]];

  sentenceTokens = tokenizeSentence(current.zh);
  selectedTokens = [];
  sentenceChecked = false;

  // Lấy thêm từ gây nhiễu
  const used = new Set(sentenceTokens.map(t => t.han));

  const distractors = shuffle(
    words.filter(w => !used.has(w.han))
  ).slice(0, Math.min(4, words.length));

  let bank = sentenceTokens.map((t, i) => ({
    ...t,
    bankId: `bank-${i}`
  }));

  distractors.forEach((w, i) => {
    bank.push({
      id: `extra-${i}`,
      bankId: `extra-${i}`,
      han: w.han,
      pinyin: w.pinyin
    });
  });

  sentenceBank = shuffle(bank);

  $('sentenceVietnamese').textContent = current.vi;

  $('sentenceCount').textContent =
    `${sentenceIndex + 1} / ${sentenceOrder.length}`;

  $('sentenceFeedback').textContent = '';
  $('sentenceFeedback').style.color = '';

  renderSentence();
}

let sentenceBank = [];

function renderSentence() {
  // Khu vực các từ đã chọn
  $('selectedWords').innerHTML = '';

  if (!selectedTokens.length) {
    const placeholder = document.createElement('span');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Nhấn các từ bên dưới để ghép câu...';
    $('selectedWords').appendChild(placeholder);
  }

  selectedTokens.forEach((token, index) => {
    const tile = createWordTile(token, () => {
      if (sentenceChecked) return;

      selectedTokens.splice(index, 1);
      renderSentence();
    }, 'selected-tile');

    $('selectedWords').appendChild(tile);
  });

  // Khu vực từ có thể chọn
  $('wordBank').innerHTML = '';

  sentenceBank.forEach(token => {
    const alreadySelected = selectedTokens.some(
      t => t.bankId === token.bankId
    );

    const tile = createWordTile(token, () => {
      if (sentenceChecked || alreadySelected) return;

      selectedTokens.push(token);
      renderSentence();
    }, alreadySelected ? 'bank-tile used' : 'bank-tile');

    $('wordBank').appendChild(tile);
  });
}

function createWordTile(token, onClick, className) {
  const button = document.createElement('button');

  button.className = `word-tile ${className}`;

  const han = document.createElement('span');
  han.className = 'tile-han';
  han.textContent = token.han;

  const pinyin = document.createElement('span');
  pinyin.className = 'tile-pinyin';
  pinyin.textContent = token.pinyin || '—';

  button.appendChild(han);
  button.appendChild(pinyin);

  button.addEventListener('click', onClick);

  return button;
}

function checkSentence() {
  if (!sentences.length || sentenceChecked) return;

  if (!selectedTokens.length) {
    $('sentenceFeedback').textContent = 'Bạn chưa chọn từ nào.';
    return;
  }

  const current = sentences[sentenceOrder[sentenceIndex]];

  const answer = selectedTokens.map(t => t.han).join('');
  const correct = normalizeChinese(current.zh);

  sentenceChecked = true;

  if (answer === correct) {
    $('sentenceFeedback').textContent = '✓ Chính xác! Bạn đã ghép đúng câu.';
    $('sentenceFeedback').style.color = '#168553';
  } else {
    $('sentenceFeedback').textContent =
      `✗ Chưa đúng. Câu đúng: ${current.zh}`;
    $('sentenceFeedback').style.color = '#c84d45';
  }

  renderSentence();
}

function nextSentence() {
  if (!sentenceOrder.length) return;

  sentenceIndex++;

  if (sentenceIndex >= sentenceOrder.length) {
    $('sentenceFeedback').textContent =
      'Bạn đã hoàn thành toàn bộ câu! Nhấn Câu mới để luyện lại.';
    sentenceIndex = 0;
    sentenceOrder = shuffle(sentences.map((_, i) => i));
  }

  loadSentence();
}

function undoSentence() {
  if (sentenceChecked) return;
  selectedTokens.pop();
  renderSentence();
}

function clearSentence() {
  if (sentenceChecked) return;
  selectedTokens = [];
  renderSentence();
}

// ========================================
// VOCABULARY
// ========================================

function renderVocab() {
  const q = $('searchInput').value.trim().toLowerCase();

  const filtered = words.filter(w =>
    w.han.toLowerCase().includes(q) ||
    w.pinyin.toLowerCase().includes(q) ||
    (w.meaning || '').toLowerCase().includes(q)
  );

  $('vocabSubtitle').textContent =
    `${filtered.length} / ${words.length} từ vựng`;

  $('vocabBody').innerHTML = '';

  filtered.forEach((w, idx) => {
    const tr = document.createElement('tr');

    const values = [
      idx + 1,
      w.han,
      w.pinyin,
      w.meaning || ''
    ];

    values.forEach((value, i) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });

    const status = document.createElement('td');

    const badge = document.createElement('span');
    badge.className = 'status' + (w.mastered ? ' done' : '');
    badge.textContent = w.mastered ? 'Đã thuộc' : 'Cần ôn tập';

    status.appendChild(badge);
    tr.appendChild(status);

    const action = document.createElement('td');
    const toggle = document.createElement('button');

    toggle.className = 'table-action';
    toggle.textContent = w.mastered ? 'Bỏ đánh dấu' : 'Đánh dấu thuộc';

    toggle.addEventListener('click', async () => {
      w.mastered = !w.mastered;
      await persist();
      renderVocab();
    });

    action.appendChild(toggle);
    tr.appendChild(action);

    $('vocabBody').appendChild(tr);
  });
}

// ========================================
// IMPORT EXCEL
// ========================================

async function importExcel() {
  const result = await window.flashcardAPI.importExcel();

  if (result.canceled) return;

  if (result.error) {
    toast(result.error);
    return;
  }

  words = result.words;
  sentences = result.sentences || [];

  cardIndex = 0;
  flipped = false;

  quizOrder = [];
  sentenceOrder = [];

  updateStats();
  renderCard();
  renderVocab();

  toast(
    `Đã nhập ${result.wordCount} từ và ${result.sentenceCount} câu.`
  );
}

// ========================================
// EVENTS
// ========================================

document.querySelectorAll('.nav-item').forEach(b => {
  b.addEventListener('click', () => setView(b.dataset.view));
});

document.querySelectorAll('.mode').forEach(b => {
  b.addEventListener('click', () => {
    mode = b.dataset.mode;

    document.querySelectorAll('.mode').forEach(x => {
      x.classList.toggle('active', x === b);
    });

    flipped = false;
    renderCard();
  });
});

$('importBtn').addEventListener('click', importExcel);
$('emptyImportBtn').addEventListener('click', importExcel);

$('flashCard').addEventListener('click', flipCard);

$('flashCard').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') flipCard();
});

$('prevBtn').addEventListener('click', () => {
  cardIndex--;
  flipped = false;
  renderCard();
});

$('nextBtn').addEventListener('click', () => {
  cardIndex++;
  flipped = false;
  renderCard();
});

$('knownBtn').addEventListener('click', () => markCard(true));
$('unknownBtn').addEventListener('click', () => markCard(false));

$('shuffleBtn').addEventListener('click', () => {
  if (!words.length) return;

  words = shuffle(words);
  cardIndex = 0;
  flipped = false;

  persist();
  renderCard();

  toast('Đã xáo trộn từ vựng');
});

// Quiz
$('quizMode').addEventListener('change', startQuiz);
$('quizLimit').addEventListener('change', startQuiz);
$('quizRestart').addEventListener('click', startQuiz);
$('quizNext').addEventListener('click', nextQuiz);

// Sentence
$('sentenceRestart').addEventListener('click', startSentence);
$('sentenceNext').addEventListener('click', nextSentence);
$('sentenceCheck').addEventListener('click', checkSentence);
$('sentenceUndo').addEventListener('click', undoSentence);
$('sentenceClear').addEventListener('click', clearSentence);

// Search
$('searchInput').addEventListener('input', renderVocab);

// ========================================
// INITIALIZE
// ========================================

(async function init() {
  const saved = await window.flashcardAPI.loadWords();

  words = saved.words || [];
  sentences = saved.sentences || [];

  updateStats();
  renderCard();
  renderVocab();
})();
