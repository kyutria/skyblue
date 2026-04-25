(function () {
  const params = new URLSearchParams(window.location.search);
  const part = parseInt(params.get('part')) || 1;
  const stageNum = parseInt(params.get('stage')) || 1;

  const data = STAGES[part]?.[stageNum];
  if (!data) return;

  document.body.dataset.part = part;

  const sentences = data.story
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  let sentenceIndex = 0;
  let state = 'idle';
  let typeTimer = null;

  const storyPhase = document.getElementById('story-phase');
  const puzzlePhase = document.getElementById('puzzle-phase');
  const storyImg = document.getElementById('story-image');
  const puzzleImg = document.getElementById('puzzle-image');
  const textEl = document.getElementById('story-text');
  const hintEl = document.getElementById('hint');
  const bgm = document.getElementById('bgm');

  storyImg.src = data.storyImage;
  puzzleImg.src = data.puzzleImage;

  bgm.src = `assets/audio/bgm-${part}.mp3`;
  bgm.volume = 0.5;

  storyPhase.classList.add('active');
  typeSentence(sentences[0]);

  function typeSentence(text) {
    state = 'typing';
    textEl.textContent = '';
    hintEl.classList.remove('visible');
    let i = 0;

    typeTimer = setInterval(() => {
      textEl.textContent += text[i++];
      if (i >= text.length) {
        clearInterval(typeTimer);
        typeTimer = null;
        state = 'waiting';
        hintEl.classList.add('visible');
      }
    }, 50);
  }

  function skipTyping() {
    clearInterval(typeTimer);
    typeTimer = null;
    textEl.textContent = sentences[sentenceIndex];
    state = 'waiting';
    hintEl.classList.add('visible');
  }

  function showPuzzle() {
    state = 'puzzle';
    storyPhase.classList.remove('active');
    puzzlePhase.classList.add('active');
  }

  function advance() {
    bgm.play().catch(() => {});

    if (state === 'typing') {
      skipTyping();
      return;
    }

    if (state === 'waiting') {
      sentenceIndex++;
      if (sentenceIndex < sentences.length) {
        typeSentence(sentences[sentenceIndex]);
      } else {
        showPuzzle();
      }
    }
  }

  document.addEventListener('click', advance);
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      advance();
    }
  });
})();
