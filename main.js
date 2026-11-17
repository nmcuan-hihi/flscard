const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let mainWindow;

const userFile = name => path.join(app.getPath('userData'), name);
const dataFile = () => userFile('vocabulary.json');
const settingsFile = () => userFile('settings.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function readSavedData() {
  const data = readJson(dataFile(), { words: [], sentences: [] });
  if (Array.isArray(data)) return { words: data, sentences: [] };
  return { words: data.words || [], sentences: data.sentences || [] };
}

function saveData(data) {
  fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
  fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2), 'utf8');
  return true;
}

function readSettings() {
  const settings = readJson(settingsFile(), { autoNextCorrect: true });
  return { autoNextCorrect: settings.autoNextCorrect !== false };
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify({
    autoNextCorrect: settings?.autoNextCorrect !== false
  }, null, 2), 'utf8');
  return true;
}

function clean(value) {
  return String(value ?? '').trim();
}

function hasHeader(rows) {
  if (!rows.length) return false;
  const a = clean(rows[0][0]).toLowerCase();
  const b = clean(rows[0][1]).toLowerCase();
  return (
    ['hán', 'han', 'hán tự', 'chinese', '汉字'].some(value => a.includes(value)) ||
    ['pinyin', 'phiên âm', '拼音'].some(value => b.includes(value))
  );
}

async function translateWithGoogle(text, target = 'vi') {
  const source = clean(text);
  if (!source) return '';
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'zh-CN');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', source);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 FlashcardChinese/1.0' },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Google Translate HTTP ${response.status}`);
  const payload = await response.json();
  const translated = Array.isArray(payload?.[0])
    ? payload[0].map(part => part?.[0] || '').join('').trim()
    : '';
  if (!translated) throw new Error('Google Translate không trả về nội dung.');
  return translated;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#f5f7fb',
    title: 'Flashcard Chinese',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('words:load', () => readSavedData());
  ipcMain.handle('words:save', (_event, data) => saveData(data));
  ipcMain.handle('settings:load', () => readSettings());
  ipcMain.handle('settings:save', (_event, settings) => saveSettings(settings));
  ipcMain.handle('translate:google', async (_event, text, target) => {
    try {
      return { text: await translateWithGoogle(text, target || 'vi') };
    } catch (error) {
      return { text: '', error: error.message };
    }
  });

  ipcMain.handle('excel:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn file Excel từ vựng',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'xlsm'] }]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };

    try {
      const workbook = XLSX.readFile(result.filePaths[0]);
      const vocabularySheet = workbook.Sheets[workbook.SheetNames[0]];
      const vocabularyRows = XLSX.utils.sheet_to_json(vocabularySheet, {
        header: 1, defval: '', raw: false
      });
      const start = hasHeader(vocabularyRows) ? 1 : 0;
      const words = [];

      for (let index = start; index < vocabularyRows.length; index++) {
        const row = vocabularyRows[index];
        const han = clean(row[0]);
        const pinyin = clean(row[1]);
        const meaning = clean(row[2]);
        const english = clean(row[3]);
        if (han && pinyin) {
          words.push({
            id: `word-${index}-${Date.now()}-${words.length}`,
            han,
            pinyin,
            meaning,
            english,
            mastered: false
          });
        }
      }

      if (!words.length) return { error: 'Không tìm thấy từ vựng. Kiểm tra cột A (Hán) và B (Pinyin).' };

      const sentenceSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'sentences');
      const sentences = [];
      if (sentenceSheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sentenceSheetName], {
          header: 1, defval: '', raw: false
        });
        const firstA = clean(rows[0]?.[0]).toLowerCase();
        const firstB = clean(rows[0]?.[1]).toLowerCase();
        const sentenceHasHeader =
          ['tiếng việt', 'vietnamese', 'nghĩa', 'câu việt'].some(value => firstA.includes(value)) ||
          ['tiếng trung', 'chinese', 'hán', '汉语'].some(value => firstB.includes(value));

        for (let index = sentenceHasHeader ? 1 : 0; index < rows.length; index++) {
          const vi = clean(rows[index]?.[0]);
          const zh = clean(rows[index]?.[1]);
          if (vi && zh) sentences.push({ id: `sentence-${index}-${Date.now()}`, vi, zh });
        }
      }

      saveData({ words, sentences });
      return {
        words, sentences,
        wordCount: words.length,
        sentenceCount: sentences.length,
        missingMeaningCount: words.filter(word => !word.meaning).length,
        missingEnglishCount: words.filter(word => !word.english).length,
        fileName: path.basename(result.filePaths[0])
      };
    } catch (error) {
      return { error: 'Không đọc được file Excel: ' + error.message };
    }
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
