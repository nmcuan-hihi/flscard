
(() => {
  function create(context) {
    const { state, $, save, updateStats } = context;

    // Chuẩn hóa chữ: bỏ dấu, chuyển chữ thường
    function normalize(str) {
      return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
    }

    // Kiểm tra độ tương đồng tương đối
    function fuzzyMatch(text, query) {
      const source = normalize(text);
      const search = normalize(query);

      if (!search) return true;
      if (source.includes(search)) return true;

      // Tách thành các từ để tìm kiếm linh hoạt
      const words = source.split(/[\s,./-]+/);

      return words.some(word => {
        if (word.includes(search)) return true;

        // Cho phép sai hoặc thiếu ký tự
        if (search.length <= 2) return false;

        const distance = levenshtein(word, search);
        const maxDistance =
          search.length >= 7 ? 2 :
          search.length >= 4 ? 1 : 0;

        return distance <= maxDistance;
      });
    }

    // Thuật toán đo khoảng cách ký tự
    function levenshtein(a, b) {
      const matrix = Array.from(
        { length: b.length + 1 },
        (_, i) => [i]
      );

      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] +
              (b[i - 1] === a[j - 1] ? 0 : 1)
          );
        }
      }

      return matrix[b.length][a.length];
    }

    function render() {
      const query = $('searchInput').value.trim();

      const filtered = state.words.filter(word =>
        fuzzyMatch(word.han, query) ||
        fuzzyMatch(word.pinyin, query) ||
        fuzzyMatch(word.meaning, query) ||
        fuzzyMatch(word.english, query)
      );

      $('vocabSubtitle').textContent =
        `${filtered.length} / ${state.words.length} từ vựng`;

      $('vocabBody').innerHTML = '';

      filtered.forEach((word, index) => {
        const row = document.createElement('tr');

        [
          index + 1,
          word.han,
          word.pinyin,
          word.meaning || '',
          word.english || ''
        ].forEach(value => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.appendChild(cell);
        });

        const statusCell = document.createElement('td');
        const badge = document.createElement('span');

        badge.className = `status${word.mastered ? ' done' : ''}`;
        badge.textContent = word.mastered
          ? 'Đã thuộc'
          : 'Cần ôn tập';

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        const actionCell = document.createElement('td');
        const toggle = document.createElement('button');

        toggle.className = 'table-action';
        toggle.textContent = word.mastered
          ? 'Bỏ đánh dấu'
          : 'Đánh dấu thuộc';

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
