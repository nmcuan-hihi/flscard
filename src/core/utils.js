(() => {
  const $ = id => document.getElementById(id);

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function toast(message) {
    const element = $('toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    window.setTimeout(() => element.classList.remove('show'), 2800);
  }

  async function saveWords(state) {
    await window.flashcardAPI.saveWords({
      words: state.words,
      sentences: state.sentences
    });
  }

  function updateStats(state) {
    const mastered = state.words.filter(word => word.mastered).length;
    $('totalStat').textContent = state.words.length;
    $('masteredStat').textContent = mastered;
    $('reviewStat').textContent = state.words.length - mastered;
    $('progressStat').textContent = state.words.length
      ? `${Math.round(mastered / state.words.length * 100)}%`
      : '0%';

    $('emptyState').classList.toggle('hidden', state.words.length > 0);

    document.querySelectorAll('.view').forEach(element => {
      const isSentence = element.id === 'sentenceView';
      const shouldHide = isSentence
        ? state.view !== 'sentence'
        : state.words.length === 0 || element.id !== `${state.view}View`;
      element.classList.toggle('hidden', shouldHide);
    });
  }

  window.FlashcardUtils = { $, shuffle, toast, saveWords, updateStats };
})();
