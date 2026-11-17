(() => {
  window.FlashcardStorage = {
    loadData: () => window.flashcardAPI.loadWords(),
    saveData: data => window.flashcardAPI.saveWords(data),
    loadSettings: () => window.flashcardAPI.loadSettings(),
    saveSettings: settings => window.flashcardAPI.saveSettings(settings)
  };
})();
