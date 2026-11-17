(() => {
  function create(context) {
    const { state, $, shuffle } = context;
    const quiz = state.quiz;

    function fields() {
      const modes = {
        'han-pinyin': { question: 'han', answer: 'pinyin', label: 'Hán → Pinyin' },
        'pinyin-han': { question: 'pinyin', answer: 'han', label: 'Pinyin → Hán' },
        'han-vi': { question: 'han', answer: 'meaning', label: 'Hán → Nghĩa tiếng Việt' },
        'vi-han': { question: 'meaning', answer: 'han', label: 'Nghĩa tiếng Việt → Hán' },
        'pinyin-vi': { question: 'pinyin', answer: 'meaning', label: 'Pinyin → Nghĩa tiếng Việt' },
        'vi-pinyin': { question: 'meaning', answer: 'pinyin', label: 'Nghĩa tiếng Việt → Pinyin' },
        'han-vi-pinyin': {
          question: 'han',
          answer: 'meaning',
          label: 'Hán → Việt (kèm Pinyin)',
          supplementary: 'pinyin'
        }
      };
      return modes[$('quizMode').value] || modes['han-pinyin'];
    }

    // Chọn một nguồn thống nhất cho cả câu hỏi và các đáp án nhiễu.
    function sourceWords() {
      const source = $('quizSource')?.value || 'all';
      if (source === 'unmastered') {
        return state.words.filter(word => word.mastered !== true);
      }
      return state.words;
    }

    function cancelAdvance() {
      if (quiz.advanceTimer) window.clearTimeout(quiz.advanceTimer);
      quiz.advanceTimer = null;
    }

    function start() {
      cancelAdvance();
      const config = fields();
      const pool = sourceWords();
      quiz.sourceWords = pool;
      const valid = pool.filter(word =>
        String(word[config.question] || '').trim() &&
        String(word[config.answer] || '').trim()
      );

      if (valid.length < 4) {
        $('quizQuestion').textContent = 'Chưa đủ dữ liệu';
        $('answers').innerHTML = '';
        $('quizFeedback').textContent =
          $('quizSource')?.value === 'unmastered'
            ? `Chỉ có ${valid.length} từ chưa thuộc đủ thông tin. Cần ít nhất 4 từ để tạo trắc nghiệm.`
            : 'Cần ít nhất 4 từ có đủ thông tin cho kiểu kiểm tra này.';
        $('quizNext').disabled = true;
        $('quizCount').textContent = 'CHƯA SẴN SÀNG';
        quiz.order = [];
        return;
      }

      const limit = $('quizLimit').value;
      const max = limit === 'all' ? valid.length : Math.min(Number(limit), valid.length);
      quiz.order = shuffle(valid).slice(0, max);
      quiz.index = 0;
      quiz.correct = 0;
      quiz.answered = false;
      quiz.finished = false;
      $('quizScore').textContent = '0';
      render();
    }

    function render() {
      if (!quiz.order.length) return;
      if (quiz.index >= quiz.order.length) {
        quiz.finished = true;
        $('quizCount').textContent = 'HOÀN THÀNH';
        $('quizPercent').textContent = '100%';
        $('quizBar').style.width = '100%';
        $('quizQuestion').textContent = '完成！';
        $('answers').innerHTML = '';
        const percent = Math.round(quiz.correct / quiz.order.length * 100);
        $('quizFeedback').textContent = `Kết quả: ${quiz.correct}/${quiz.order.length} câu đúng (${percent}%).`;
        $('quizNext').textContent = 'Làm lại';
        $('quizNext').disabled = false;
        return;
      }

      quiz.answered = false;
      quiz.finished = false;
      const config = fields();
      const correct = quiz.order[quiz.index];
      // Đáp án nhiễu lấy cùng nguồn đã chọn, không lấy từ nhóm còn lại.
      const pool = quiz.sourceWords || sourceWords();
      const candidates = pool.filter(word =>
        word.id !== correct.id && String(word[config.answer] || '').trim()
      );

      if (candidates.length < 3) {
        $('quizFeedback').textContent = 'Không đủ dữ liệu tạo 4 đáp án trong nguồn từ đã chọn.';
        $('quizNext').disabled = true;
        $('answers').innerHTML = '';
        return;
      }

      const options = shuffle([correct, ...shuffle(candidates).slice(0, 3)]);
      $('quizCount').textContent = `CÂU ${quiz.index + 1} / ${quiz.order.length}`;
      $('quizPercent').textContent = `${Math.round(quiz.index / quiz.order.length * 100)}%`;
      $('quizBar').style.width = `${quiz.index / quiz.order.length * 100}%`;
      $('quizDirection').textContent = config.label;
      $('quizQuestion').textContent = correct[config.question];
      $('quizFeedback').textContent = 'Chọn một đáp án bên dưới';
      $('quizFeedback').style.color = '#8592a4';
      $('quizNext').disabled = true;
      $('quizNext').textContent = 'Câu tiếp theo →';
      $('answers').innerHTML = '';

      options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'answer';
        button.dataset.wordId = option.id;

        const meaning = document.createElement('span');
        meaning.className = 'answer-meaning';
        meaning.textContent = option[config.answer];
        button.appendChild(meaning);

        if (config.supplementary) {
          const pinyin = document.createElement('span');
          pinyin.className = 'answer-pinyin';
          pinyin.textContent = option[config.supplementary] || '';
          button.appendChild(pinyin);
        }

        button.addEventListener('click', () => answer(button, option.id === correct.id, correct));
        $('answers').appendChild(button);
      });
    }

    function answer(button, isCorrect, correctWord) {
      if (quiz.answered) return;
      quiz.answered = true;
      cancelAdvance();

      document.querySelectorAll('.answer').forEach(element => {
        element.disabled = true;
        if (element.dataset.wordId === String(correctWord.id)) element.classList.add('correct');
      });

      const config = fields();
      if (isCorrect) {
        quiz.correct++;
        $('quizFeedback').textContent = '✓ Chính xác!';
        $('quizFeedback').style.color = '#168553';
        $('quizScore').textContent = quiz.correct;
        if (state.settings.autoNextCorrect !== false) {
          $('quizNext').disabled = true;
          quiz.advanceTimer = window.setTimeout(() => {
            quiz.advanceTimer = null;
            next();
          }, 700);
        } else {
          $('quizNext').disabled = false;
        }
      } else {
        button.classList.add('wrong');
        const extra = config.supplementary ? ` (${correctWord.pinyin || ''})` : '';
        $('quizFeedback').textContent = `✗ Chưa đúng. Đáp án: ${correctWord.meaning || correctWord[config.answer]}${extra}`;
        $('quizFeedback').style.color = '#c84d45';
        $('quizNext').disabled = false;
      }
    }

    function next() {
      if (quiz.finished) {
        start();
        return;
      }
      if (!quiz.answered) return;
      cancelAdvance();
      quiz.index++;
      render();
    }

    function bind() {
      $('quizMode').addEventListener('change', start);
      $('quizLimit').addEventListener('change', start);
      $('quizSource')?.addEventListener('change', start);
      $('quizRestart').addEventListener('click', start);
      $('quizNext').addEventListener('click', next);
    }

    return { bind, start, render };
  }

  window.FlashcardQuizModule = { create };
})();
