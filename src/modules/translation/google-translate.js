(() => {
  async function fillMissingTranslations(state) {
    const tasks = [];
    for (const word of state.words) {
      if (!String(word.meaning || '').trim() && word.han) tasks.push({ word, field: 'meaning', target: 'vi' });
      if (!String(word.english || '').trim() && word.han) tasks.push({ word, field: 'english', target: 'en' });
    }
    if (!tasks.length) return { translatedVi: 0, translatedEn: 0, failed: 0 };

    const cache = new Map();
    let translatedVi = 0;
    let translatedEn = 0;
    let failed = 0;

    async function translateTask(task) {
      const key = `${task.word.han}|${task.target}`;
      try {
        if (!cache.has(key)) {
          cache.set(key, (async () => {
            const result = await window.flashcardAPI.translateText(task.word.han, task.target);
            const text = String(result?.text || '').trim();
            if (!text) throw new Error(result?.error || 'Google Translate không trả về kết quả.');
            return text;
          })());
        }
        task.word[task.field] = await cache.get(key);
        if (task.field === 'meaning') translatedVi++;
        else translatedEn++;
      } catch {
        failed++;
      }
    }

    const batchSize = 3;
    for (let index = 0; index < tasks.length; index += batchSize) {
      const batch = tasks.slice(index, index + batchSize);
      await Promise.all(batch.map(translateTask));
      const completed = Math.min(index + batch.length, tasks.length);
      window.FlashcardUtils.toast(`Đang dịch tự động: ${completed}/${tasks.length}`);
    }

    return { translatedVi, translatedEn, failed };
  }

  window.FlashcardTranslation = { fillMissingTranslations };
})();
