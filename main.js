
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let mainWindow;

const dataFile = () => path.join(app.getPath('userData'), 'vocabulary.json');

function readSavedData() {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));

    // Tương thích dữ liệu phiên bản cũ
    if (Array.isArray(data)) {
      return { words: data, sentences: [] };
    }

    return {
      words: data.words || [],
      sentences: data.sentences || []
    };
  } catch {
    return { words: [], sentences: [] };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
  fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2), 'utf8');
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
    ['hán', 'han', 'hán tự', 'chinese', '汉字'].some(x => a.includes(x)) ||
    ['pinyin', 'phiên âm', '拼音'].some(x => b.includes(x))
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 850,
    minWidth: 950,
    minHeight: 680,
    backgroundColor: '#f5f7fb',
    title: 'Flashcard Chinese',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {

  ipcMain.handle('words:load', () => readSavedData());

  ipcMain.handle('words:save', (_event, data) => {
    return saveData(data);
  });

  ipcMain.handle('excel:import', async () => {

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn file Excel từ vựng',
      properties: ['openFile'],
      filters: [
        { name: 'Excel', extensions: ['xlsx', 'xls', 'xlsm'] }
      ]
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    try {
      const workbook = XLSX.readFile(result.filePaths[0]);

      // SHEET 1: VOCABULARY
      const vocabularySheet = workbook.Sheets[workbook.SheetNames[0]];

      const vocabularyRows = XLSX.utils.sheet_to_json(
        vocabularySheet,
        { header: 1, defval: '', raw: false }
      );

      const start = hasHeader(vocabularyRows) ? 1 : 0;

      const words = [];

      for (let i = start; i < vocabularyRows.length; i++) {
        const row = vocabularyRows[i];

        const han = clean(row[0]);
        const pinyin = clean(row[1]);
        const meaning = clean(row[2]);

        if (han && pinyin) {
          words.push({
            id: `word-${i}-${Date.now()}`,
            han,
            pinyin,
            meaning,
            mastered: false
          });
        }
      }

      if (!words.length) {
        return {
          error: 'Không tìm thấy từ vựng. Kiểm tra cột A và B.'
        };
      }

      // SHEET 2: SENTENCES
      const sentenceSheetName = workbook.SheetNames.find(
        name => name.toLowerCase() === 'sentences'
      );

      const sentences = [];

      if (sentenceSheetName) {
        const sentenceRows = XLSX.utils.sheet_to_json(
          workbook.Sheets[sentenceSheetName],
          { header: 1, defval: '', raw: false }
        );

        const firstA = clean(sentenceRows[0]?.[0]).toLowerCase();
        const firstB = clean(sentenceRows[0]?.[1]).toLowerCase();

        const sentenceHasHeader =
          ['tiếng việt', 'vietnamese', 'nghĩa', 'câu việt'].some(x => firstA.includes(x)) ||
          ['tiếng trung', 'chinese', 'hán', '汉语'].some(x => firstB.includes(x));

        for (let i = sentenceHasHeader ? 1 : 0; i < sentenceRows.length; i++) {
          const vi = clean(sentenceRows[i]?.[0]);
          const zh = clean(sentenceRows[i]?.[1]);

          if (vi && zh) {
            sentences.push({
              id: `sentence-${i}-${Date.now()}`,
              vi,
              zh
            });
          }
        }
      }

      const data = { words, sentences };
      saveData(data);

      return {
        words,
        sentences,
        wordCount: words.length,
        sentenceCount: sentences.length,
        fileName: path.basename(result.filePaths[0])
      };

    } catch (error) {
      return {
        error: 'Không đọc được file Excel: ' + error.message
      };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
