# Flashcard Chinese

## Chạy ứng dụng

```bash
npm install
npm start
```

## Cấu trúc

- `main.js`, `preload.js`: Electron main process và IPC an toàn.
- `src/core/`: state, storage, tiện ích dùng chung.
- `src/modules/flashcard/`: học bằng thẻ.
- `src/modules/quiz/`: trắc nghiệm và cài đặt trắc nghiệm.
- `src/modules/sentence/`: ghép câu.
- `src/modules/vocabulary/`: danh sách từ vựng.
- `src/modules/translation/`: dịch tự động sang tiếng Việt/tiếng Anh bằng Google Translate khi cột C/D trống.
- `src/styles/`: CSS chung và CSS theo module.

## Excel

Sheet đầu tiên: cột A = Hán, cột B = Pinyin, cột C = nghĩa tiếng Việt, cột D = English (tùy chọn). Nếu C hoặc D trống, ứng dụng sẽ thử dịch tương ứng sang tiếng Việt hoặc tiếng Anh bằng Google Translate (cần Internet). Sheet `Sentences` tùy chọn: cột A = câu tiếng Việt, cột B = câu tiếng Trung.

## Cài đặt trắc nghiệm

Nút `Cài đặt` ở thanh trên cùng cho phép bật/tắt tự động chuyển câu khi trả lời đúng. Mặc định bật; lựa chọn được lưu riêng trên thiết bị.

## Build

- Windows: `npm run dist` trên Windows.
- macOS: `npm run dist` trên máy Mac để tạo `.dmg` và `.zip`.
