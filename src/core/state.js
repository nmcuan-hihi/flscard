(() => {
  window.FlashcardState = {
    words: [],
    sentences: [],
    view: 'flash',
    settings: { autoNextCorrect: true },
    flashcard: { mode: 'han', index: 0, flipped: false },
    quiz: {
      order: [], index: 0, correct: 0, answered: false,
      finished: false, advanceTimer: null
    },
    sentence: {
      order: [], index: 0, tokens: [], selected: [],
      checked: false, bank: []
    }
  };
})();
