
(() => {
  function create(context) {
    const { state, $, toast, save, updateStats } = context;
    const data = state.flashcard;

    const modes = {
      han: 'HÁN TỰ',
      pinyin: 'PINYIN',
      meaning: 'TIẾNG VIỆT'
    };

    function getField(mode, word) {
      if (mode === 'han') return word.han || '';
      if (mode === 'pinyin') return word.pinyin || '';
      return word.meaning || '';
    }

    function renderBack(word) {
      const back = $('cardBack');
      back.replaceChildren();

      // Thứ tự hiển thị cố định: Việt → Hán → Pinyin
      const fields = [
        { mode: 'meaning', className: 'back-meaning' },
        { mode: 'han', className: 'back-han' },
        { mode: 'pinyin', className: 'back-pinyin' }
      ];

      fields.forEach(field => {
        // Không hiển thị lại nội dung đã chọn ở mặt trước
        if (field.mode === data.mode) return;

        const value = getField(field.mode, word);
        if (!value) return;

        const item = document.createElement('div');
        item.className = `card-back-item ${field.className}`;
        item.textContent = field.mode === 'pinyin'
          ? `/${value}/`
          : value;

        back.appendChild(item);
      });
    }

    function render() {
      if (!state.words.length) return;

      data.index = (data.index + state.words.length) % state.words.length;
      const word = state.words[data.index];

      $('cardCount').textContent =
        `${data.index + 1} / ${state.words.length}`;

      $('cardKicker').textContent = modes[data.mode] || modes.han;
      $('cardFront').textContent = getField(data.mode, word);

      renderBack(word);

      $('cardBack').classList.toggle('hidden', !data.flipped);
      $('cardFront').classList.toggle('hidden', data.flipped);

      $('flipHint').textContent = data.flipped
        ? 'Nhấn để xem lại ↻'
        : 'Nhấn để lật thẻ ↻';

      $('cardHint').textContent = word.mastered
        ? '✓ ĐÃ THUỘC'
        : 'NHỚ TỪ NÀY?';

      document.querySelectorAll('.mode').forEach(button => {
        button.classList.toggle(
          'active',
          button.dataset.mode === data.mode
        );
      });
    }

    function flip() {
      if (!state.words.length) return;
      data.flipped = !data.flipped;
      render();
    }

    async function mark(mastered) {
      if (!state.words.length) return;

      state.words[data.index].mastered = mastered;
      await save();
      updateStats();

      toast(mastered ? 'Đã đánh dấu thuộc' : 'Đã chuyển vào ôn tập');

      data.index = (data.index + 1) % state.words.length;
      data.flipped = false;
      render();
    }

    function bind() {
      document.querySelectorAll('.mode').forEach(button => {
        button.addEventListener('click', () => {
          const mode = button.dataset.mode;

          if (!modes[mode]) return;

          data.mode = mode;
          data.flipped = false;
          render();
        });
      });

      $('flashCard').addEventListener('click', flip);

      $('flashCard').addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          flip();
        }
      });

      $('prevBtn').addEventListener('click', () => {
        data.index--;
        data.flipped = false;
        render();
      });

      $('nextBtn').addEventListener('click', () => {
        data.index++;
        data.flipped = false;
        render();
      });

      $('knownBtn').addEventListener('click', () => mark(true));
      $('unknownBtn').addEventListener('click', () => mark(false));

      $('shuffleBtn').addEventListener('click', () => {
        if (!state.words.length) return;

        state.words = context.shuffle(state.words);
        data.index = 0;
        data.flipped = false;

        save();
        render();
        toast('Đã xáo trộn từ vựng');
      });
    }

    return { bind, render };
  }

  window.FlashcardModule = { create };
})();
