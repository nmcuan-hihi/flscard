(() => {
  const state = window.FlashcardState;
  const utils = window.FlashcardUtils;
  const context = {
    state,
    $: utils.$,
    shuffle: utils.shuffle,
    toast: utils.toast,
    save: () => utils.saveWords(state),
    updateStats: () => utils.updateStats(state)
  };

  const flashcard = window.FlashcardModule.create(context);
  const quiz = window.FlashcardQuizModule.create(context);
  const settings = window.FlashcardSettingsModule.create(context);
  const sentence = window.FlashcardSentenceModule.create(context);
  const vocabulary = window.FlashcardVocabularyModule.create(context);

  function setView(next) {
    state.view = next;
    document.querySelectorAll('.nav-item').forEach(button => {
      button.classList.toggle('active', button.dataset.view === next);
    });
    const titles = { flash: 'Flashcard', quiz: 'Trắc nghiệm', sentence: 'Ghép câu', vocab: 'Từ vựng' };
    utils.$('pageTitle').textContent = titles[next] || 'Flashcard';
    utils.updateStats(state);

    if (next === 'flash') flashcard.render();
    if (next === 'quiz') {
      if (!state.quiz.order.length) quiz.start();
      else quiz.render();
    }
    if (next === 'sentence') {
      if (!state.sentence.order.length) sentence.start();
      else sentence.render();
    }
    if (next === 'vocab') vocabulary.render();
  }

  async function importExcel() {
    const result = await window.flashcardAPI.importExcel();
    if (result.canceled) return;
    if (result.error) {
      utils.toast(result.error);
      return;
    }

    state.words = result.words || [];
    state.sentences = result.sentences || [];
    state.flashcard.index = 0;
    state.flashcard.flipped = false;
    state.quiz.order = [];
    state.sentence.order = [];

    utils.updateStats(state);
    flashcard.render();
    vocabulary.render();

    const missingCount = state.words.reduce((count, word) => count + (!String(word.meaning || '').trim() ? 1 : 0) + (!String(word.english || '').trim() ? 1 : 0), 0);
    if (missingCount) {
      utils.toast(`Đã nhập ${result.wordCount} từ. Đang tự dịch các nghĩa Việt/Anh còn trống...`);
      const translation = await window.FlashcardTranslation.fillMissingTranslations(state);
      await utils.saveWords(state);
      vocabulary.render();
      utils.updateStats(state);
      if (translation.failed) {
        utils.toast(`Đã dịch ${translation.translatedVi} nghĩa Việt, ${translation.translatedEn} nghĩa Anh; còn ${translation.failed} mục chưa dịch được. Kiểm tra Internet rồi import lại để thử.`);
      } else {
        utils.toast(`Đã nhập ${result.wordCount} từ; dịch Việt ${translation.translatedVi}, Anh ${translation.translatedEn}; ${result.sentenceCount} câu.`);
      }
    } else {
      await utils.saveWords(state);
      utils.toast(`Đã nhập ${result.wordCount} từ và ${result.sentenceCount} câu.`);
    }

    if (state.view === 'quiz') quiz.start();
    if (state.view === 'sentence') sentence.start();
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => setView(button.dataset.view));
    });
    utils.$('importBtn').addEventListener('click', importExcel);
    utils.$('emptyImportBtn').addEventListener('click', importExcel);
  }

  async function init() {
    bindNavigation();
    flashcard.bind();
    quiz.bind();
    settings.bind();
    sentence.bind();
    vocabulary.bind();

    const [saved, savedSettings] = await Promise.all([
      window.FlashcardStorage.loadData(),
      window.FlashcardStorage.loadSettings()
    ]);

    state.words = saved?.words || [];
    state.sentences = saved?.sentences || [];
    state.settings = {
      autoNextCorrect: savedSettings?.autoNextCorrect !== false
    };

    utils.updateStats(state);
    flashcard.render();
    vocabulary.render();
    settings.render();
  }

  init().catch(error => {
    console.error(error);
    utils.toast(`Không thể khởi động ứng dụng: ${error.message}`);
  });
})();
