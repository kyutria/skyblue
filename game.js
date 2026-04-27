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

  function getBgmSrc(part, stage) {
    if (part === 1) return 'assets/audio/bgm-1.mp3';
    if (part === 2 && stage <= 4) return 'assets/audio/bgm-2.mp3';
    if (part === 2) return 'assets/audio/bgm-3.mp3';
    if (part === 3 && stage <= 8) return 'assets/audio/bgm-4.mp3';
    return 'assets/audio/bgm-5.mp3';
  }

  bgm.src = getBgmSrc(part, stageNum);
  bgm.volume = 0.5;
  bgm.loop = true;

  // 타이핑 효과음 (Web Audio API - 노이즈 기반 키보드 클릭)
  let audioCtx = null;
  let typingBuffer = null;

  function initTypingSound() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioCtx.sampleRate;
    const bufferSize = Math.floor(sampleRate * 0.045);
    typingBuffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = typingBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.006);
    }
  }

  function playTypingClick() {
    try {
      if (!audioCtx) initTypingSound();
      const source = audioCtx.createBufferSource();
      source.buffer = typingBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2800;
      filter.Q.value = 1.2;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(audioCtx.currentTime);
    } catch (e) {}
  }

  storyPhase.classList.add('active');
  typeSentence(sentences[0]);

  function typeSentence(text) {
    state = 'typing';
    textEl.textContent = '';
    hintEl.classList.remove('visible');
    let i = 0;

    typeTimer = setInterval(() => {
      const ch = text[i++];
      textEl.textContent += ch;
      if (ch.trim()) playTypingClick();
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
