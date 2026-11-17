(() => {
  function create(context) {
    const { state, $ } = context;

    function render() {
      $('autoNextCorrect').checked = state.settings.autoNextCorrect !== false;
    }

    function bind() {
      $('settingsBtn').addEventListener('click', () => {
        render();
        $('settingsModal').classList.remove('hidden');
        $('settingsModal').setAttribute('aria-hidden', 'false');
      });

      $('settingsClose').addEventListener('click', close);
      $('settingsDone').addEventListener('click', close);
      $('settingsModal').addEventListener('click', event => {
        if (event.target === $('settingsModal')) close();
      });

      $('autoNextCorrect').addEventListener('change', async event => {
        state.settings.autoNextCorrect = event.target.checked;
        await window.FlashcardStorage.saveSettings(state.settings);
        context.toast('Đã lưu cài đặt');
      });
    }

    function close() {
      $('settingsModal').classList.add('hidden');
      $('settingsModal').setAttribute('aria-hidden', 'true');
    }

    return { bind, render };
  }
  window.FlashcardSettingsModule = { create };
})();
