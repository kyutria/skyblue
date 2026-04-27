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

  // ── 그리기 모드 ────────────────────────────────────────────────────────────
  const canvas = document.getElementById('draw-canvas');
  const dctx = canvas.getContext('2d');
  canvas.width = 1200;
  canvas.height = 675;

  let drawTool = 'pen';
  let drawColor = '#1a1a1a';
  let drawSize = 6;
  let drawing = false;
  let drawX = 0, drawY = 0;
  const undoStack = [];

  function saveDrawState() {
    if (undoStack.length >= 20) undoStack.shift();
    undoStack.push(dctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function getDrawPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function applyToolStyle() {
    if (drawTool === 'eraser') {
      dctx.globalCompositeOperation = 'destination-out';
      dctx.strokeStyle = 'rgba(0,0,0,1)';
      dctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      dctx.globalCompositeOperation = 'source-over';
      dctx.strokeStyle = drawColor;
      dctx.fillStyle = drawColor;
    }
    dctx.lineWidth = drawSize;
    dctx.lineCap = 'round';
    dctx.lineJoin = 'round';
  }

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    saveDrawState();
    drawing = true;
    const pos = getDrawPos(e);
    drawX = pos.x;
    drawY = pos.y;
    applyToolStyle();
    dctx.beginPath();
    dctx.arc(pos.x, pos.y, drawSize / 2, 0, Math.PI * 2);
    dctx.fill();
    dctx.globalCompositeOperation = 'source-over';
  });

  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const pos = getDrawPos(e);
    applyToolStyle();
    dctx.beginPath();
    dctx.moveTo(drawX, drawY);
    dctx.lineTo(pos.x, pos.y);
    dctx.stroke();
    dctx.globalCompositeOperation = 'source-over';
    drawX = pos.x;
    drawY = pos.y;
  });

  canvas.addEventListener('mouseup', e => { e.stopPropagation(); drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });
  canvas.addEventListener('click', e => e.stopPropagation());

  document.getElementById('draw-toolbar').addEventListener('click', e => e.stopPropagation());

  const toolBtns = document.querySelectorAll('.draw-tool-btn');

  document.getElementById('tool-pen').addEventListener('click', () => {
    drawTool = 'pen';
    toolBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('tool-pen').classList.add('active');
  });

  document.getElementById('tool-eraser').addEventListener('click', () => {
    drawTool = 'eraser';
    toolBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('tool-eraser').classList.add('active');
  });

  document.getElementById('draw-undo').addEventListener('click', () => {
    if (undoStack.length) dctx.putImageData(undoStack.pop(), 0, 0);
  });

  document.getElementById('draw-clear').addEventListener('click', () => {
    saveDrawState();
    dctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  document.querySelectorAll('.draw-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      drawSize = parseInt(btn.dataset.size);
      document.querySelectorAll('.draw-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.draw-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      drawColor = btn.dataset.color;
      document.querySelectorAll('.draw-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (drawTool === 'eraser') {
        drawTool = 'pen';
        toolBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('tool-pen').classList.add('active');
      }
    });
  });
})();
