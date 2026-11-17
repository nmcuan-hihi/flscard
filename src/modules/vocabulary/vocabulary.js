(() => {
  function create(context) {
    const { state, $, save, updateStats } = context;

    function render() {
      const query = $('searchInput').value.trim().toLowerCase();
      const filtered = state.words.filter(word =>
        word.han.toLowerCase().includes(query) ||
        word.pinyin.toLowerCase().includes(query) ||
        (word.meaning || '').toLowerCase().includes(query) ||
        (word.english || '').toLowerCase().includes(query)
      );
      $('vocabSubtitle').textContent = `${filtered.length} / ${state.words.length} từ vựng`;
      $('vocabBody').innerHTML = '';

      filtered.forEach((word, index) => {
        const row = document.createElement('tr');
        [index + 1, word.han, word.pinyin, word.meaning || '', word.english || ''].forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `status${word.mastered ? ' done' : ''}`;
        badge.textContent = word.mastered ? 'Đã thuộc' : 'Cần ôn tập';
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionCell = document.createElement('td');
        const toggle = document.createElement('button');
        toggle.className = 'table-action';
        toggle.textContent = word.mastered ? 'Bỏ đánh dấu' : 'Đánh dấu thuộc';
        toggle.addEventListener('click', async () => {
          word.mastered = !word.mastered;
          await save();
          updateStats();
          render();
        });
        actionCell.appendChild(toggle);
        row.appendChild(actionCell);
        $('vocabBody').appendChild(row);
      });
    }

    function bind() {
      $('searchInput').addEventListener('input', render);
    }

    return { bind, render };
  }
  window.FlashcardVocabularyModule = { create };
})();
