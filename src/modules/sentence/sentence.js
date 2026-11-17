(() => {
  function create(context) {
    const { state, $, shuffle } = context;
    const sentence = state.sentence;

    function normalize(text) {
      return String(text || '').replace(/[\s，。！？、,.!?；;：:"'“”‘’（）()]/g, '');
    }

    function tokenize(text) {
      const source = normalize(text);
      const dictionary = [...state.words].filter(word => word.han).sort((a, b) => b.han.length - a.han.length);
      const tokens = [];
      let position = 0;
      while (position < source.length) {
        const match = dictionary.find(word => source.startsWith(word.han, position));
        if (match) {
          tokens.push({ id: `token-${tokens.length}`, han: match.han, pinyin: match.pinyin || '' });
          position += match.han.length;
        } else {
          const char = source[position];
          const charWord = dictionary.find(word => word.han === char);
          tokens.push({ id: `token-${tokens.length}`, han: char, pinyin: charWord?.pinyin || '' });
          position++;
        }
      }
      return tokens;
    }

    function start() {
      if (!state.sentences.length) {
        $('sentenceVietnamese').textContent = 'Chưa có câu tiếng Việt';
        $('wordBank').innerHTML = '';
        $('selectedWords').innerHTML = '';
        $('sentenceFeedback').textContent = 'Hãy import sheet Sentences trong file Excel.';
        sentence.order = [];
        return;
      }
      sentence.order = shuffle(state.sentences.map((_, index) => index));
      sentence.index = 0;
      load();
    }

    function load() {
      if (!sentence.order.length) return;
      const current = state.sentences[sentence.order[sentence.index]];
      sentence.tokens = tokenize(current.zh);
      sentence.selected = [];
      sentence.checked = false;
      const used = new Set(sentence.tokens.map(token => token.han));
      const distractors = shuffle(state.words.filter(word => !used.has(word.han))).slice(0, Math.min(4, state.words.length));
      const bank = sentence.tokens.map((token, index) => ({ ...token, bankId: `bank-${index}` }));
      distractors.forEach((word, index) => bank.push({
        id: `extra-${index}`, bankId: `extra-${index}`, han: word.han, pinyin: word.pinyin
      }));
      sentence.bank = shuffle(bank);
      $('sentenceVietnamese').textContent = current.vi;
      $('sentenceCount').textContent = `${sentence.index + 1} / ${sentence.order.length}`;
      $('sentenceFeedback').textContent = '';
      $('sentenceFeedback').style.color = '';
      render();
    }

    function tile(token, onClick, className) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `word-tile ${className}`;
      const han = document.createElement('span');
      han.className = 'tile-han';
      han.textContent = token.han;
      const pinyin = document.createElement('span');
      pinyin.className = 'tile-pinyin';
      pinyin.textContent = token.pinyin || '—';
      button.append(han, pinyin);
      button.addEventListener('click', onClick);
      return button;
    }

    function render() {
      $('selectedWords').innerHTML = '';
      if (!sentence.selected.length) {
        const placeholder = document.createElement('span');
        placeholder.className = 'placeholder';
        placeholder.textContent = 'Nhấn các từ bên dưới để ghép câu...';
        $('selectedWords').appendChild(placeholder);
      }
      sentence.selected.forEach((token, index) => {
        $('selectedWords').appendChild(tile(token, () => {
          if (sentence.checked) return;
          sentence.selected.splice(index, 1);
          render();
        }, 'selected-tile'));
      });

      $('wordBank').innerHTML = '';
      sentence.bank.forEach(token => {
        const used = sentence.selected.some(item => item.bankId === token.bankId);
        $('wordBank').appendChild(tile(token, () => {
          if (sentence.checked || used) return;
          sentence.selected.push(token);
          render();
        }, used ? 'bank-tile used' : 'bank-tile'));
      });
    }

    function check() {
      if (!state.sentences.length || sentence.checked) return;
      if (!sentence.selected.length) {
        $('sentenceFeedback').textContent = 'Bạn chưa chọn từ nào.';
        return;
      }
      const current = state.sentences[sentence.order[sentence.index]];
      const answer = sentence.selected.map(token => token.han).join('');
      const correct = normalize(current.zh);
      sentence.checked = true;
      if (answer === correct) {
        $('sentenceFeedback').textContent = '✓ Chính xác! Bạn đã ghép đúng câu.';
        $('sentenceFeedback').style.color = '#168553';
      } else {
        $('sentenceFeedback').textContent = `✗ Chưa đúng. Câu đúng: ${current.zh}`;
        $('sentenceFeedback').style.color = '#c84d45';
      }
      render();
    }

    function next() {
      if (!sentence.order.length) return;
      sentence.index++;
      if (sentence.index >= sentence.order.length) {
        $('sentenceFeedback').textContent = 'Bạn đã hoàn thành toàn bộ câu! Bắt đầu vòng luyện mới.';
        sentence.index = 0;
        sentence.order = shuffle(state.sentences.map((_, index) => index));
      }
      load();
    }

    function undo() {
      if (sentence.checked) return;
      sentence.selected.pop();
      render();
    }

    function clear() {
      if (sentence.checked) return;
      sentence.selected = [];
      render();
    }

    function bind() {
      $('sentenceRestart').addEventListener('click', start);
      $('sentenceNext').addEventListener('click', next);
      $('sentenceCheck').addEventListener('click', check);
      $('sentenceUndo').addEventListener('click', undo);
      $('sentenceClear').addEventListener('click', clear);
    }

    return { bind, start, render };
  }
  window.FlashcardSentenceModule = { create };
})();
