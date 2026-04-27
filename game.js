(function () {
  const params   = new URLSearchParams(window.location.search);
  const isEnding = params.get('ending') === '1';
  const part     = parseInt(params.get('part')) || 1;
  const stageNum = parseInt(params.get('stage')) || 1;

  // 공통 DOM 참조
  const storyPhase = document.getElementById('story-phase');
  const puzzlePhase = document.getElementById('puzzle-phase');
  const storyImg   = document.getElementById('story-image');
  const puzzleImg  = document.getElementById('puzzle-image');
  const bgm        = document.getElementById('bgm');

  // ── 엔딩 / 일반 스테이지 분기 ───────────────────────────────────────────────
  if (isEnding) {
    document.body.dataset.part = 'ending';
    puzzleImg.src = 'assets/images/puzzle/ending-puzzle.png';
    bgm.src       = 'assets/audio/bgm-ending.mp3';
    bgm.volume    = 0.5;
    bgm.loop      = true;
    puzzlePhase.classList.add('active');
    // 첫 인터랙션 시 BGM 재생
    document.addEventListener('click',   () => bgm.play().catch(() => {}), { once: true });
    document.addEventListener('keydown', () => bgm.play().catch(() => {}), { once: true });

  } else {
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

    const textEl = document.getElementById('story-text');
    const hintEl = document.getElementById('hint');

    storyImg.src = data.storyImage;
    puzzleImg.src = data.puzzleImage;

    function getBgmSrc(part, stage) {
      if (part === 1) return 'assets/audio/bgm-1.mp3';
      if (part === 2 && stage <= 4) return 'assets/audio/bgm-2.mp3';
      if (part === 2) return 'assets/audio/bgm-3.mp3';
      if (part === 3 && stage <= 8) return 'assets/audio/bgm-4.mp3';
      return 'assets/audio/bgm-5.mp3';
    }

    bgm.src    = getBgmSrc(part, stageNum);
    bgm.volume = 0.5;
    bgm.loop   = true;

    // 타이핑 효과음 (Web Audio API)
    let audioCtx = null;
    let typingBuffer = null;

    function initTypingSound() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioCtx.sampleRate;
      const bufferSize = Math.floor(sampleRate * 0.045);
      typingBuffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
      const d = typingBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.exp(-t / 0.006);
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
      if (data.puzzleType === 'interactive' && data.puzzleScript) {
        const s = document.createElement('script');
        s.src = data.puzzleScript;
        document.body.appendChild(s);
      }
    }

    function advance() {
      bgm.play().catch(() => {});
      if (state === 'typing') { skipTyping(); return; }
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
      if (document.activeElement === document.getElementById('draw-text-input')) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
    });
  }

  // ── 음소거 버튼 (공통) ────────────────────────────────────────────────────────
  const muteBtn = document.getElementById('bgm-mute');
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    bgm.muted = !bgm.muted;
    muteBtn.classList.toggle('muted', bgm.muted);
  });

  // ── 그리기 모드 (공통) ────────────────────────────────────────────────────────
  const canvas = document.getElementById('draw-canvas');
  const dctx   = canvas.getContext('2d');
  canvas.width  = 1200;
  canvas.height = 675;

  let drawTool  = 'pen';
  let drawColor = '#1a1a1a';
  let drawSize  = 6;
  let drawing   = false;
  let drawX = 0, drawY = 0;
  let shiftStart = null, shiftSnap = null;
  let textPos = null;
  const undoStack = [];
  const redoStack = [];

  function saveDrawState() {
    if (undoStack.length >= 20) undoStack.shift();
    undoStack.push(dctx.getImageData(0, 0, canvas.width, canvas.height));
    redoStack.length = 0;
  }

  function getDrawPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  function applyToolStyle() {
    if (drawTool === 'eraser') {
      dctx.globalCompositeOperation = 'destination-out';
      dctx.strokeStyle = 'rgba(0,0,0,1)';
      dctx.fillStyle   = 'rgba(0,0,0,1)';
    } else {
      dctx.globalCompositeOperation = 'source-over';
      dctx.strokeStyle = drawColor;
      dctx.fillStyle   = drawColor;
    }
    dctx.lineWidth  = drawSize;
    dctx.lineCap    = 'round';
    dctx.lineJoin   = 'round';
  }

  canvas.addEventListener('mousedown', e => {
    if (drawTool === 'text') return;
    e.preventDefault();
    e.stopPropagation();
    drawing = true;
    const pos = getDrawPos(e);
    drawX = pos.x; drawY = pos.y;
    if (e.shiftKey) {
      saveDrawState();
      shiftStart = { x: pos.x, y: pos.y };
      shiftSnap  = dctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      saveDrawState();
      shiftStart = null; shiftSnap = null;
      applyToolStyle();
      dctx.beginPath();
      dctx.arc(pos.x, pos.y, drawSize / 2, 0, Math.PI * 2);
      dctx.fill();
      dctx.globalCompositeOperation = 'source-over';
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (!drawing) return;
    const pos = getDrawPos(e);
    if (shiftStart) {
      dctx.putImageData(shiftSnap, 0, 0);
      applyToolStyle();
      dctx.beginPath();
      dctx.moveTo(shiftStart.x, shiftStart.y);
      dctx.lineTo(pos.x, pos.y);
      dctx.stroke();
      dctx.globalCompositeOperation = 'source-over';
    } else {
      applyToolStyle();
      dctx.beginPath();
      dctx.moveTo(drawX, drawY);
      dctx.lineTo(pos.x, pos.y);
      dctx.stroke();
      dctx.globalCompositeOperation = 'source-over';
      drawX = pos.x; drawY = pos.y;
    }
  });

  canvas.addEventListener('mouseup', e => {
    e.stopPropagation();
    if (drawing && shiftStart) {
      const pos = getDrawPos(e);
      dctx.putImageData(shiftSnap, 0, 0);
      applyToolStyle();
      dctx.beginPath();
      dctx.moveTo(shiftStart.x, shiftStart.y);
      dctx.lineTo(pos.x, pos.y);
      dctx.stroke();
      dctx.globalCompositeOperation = 'source-over';
    }
    drawing = false; shiftStart = null; shiftSnap = null;
  });

  canvas.addEventListener('mouseleave', () => {
    drawing = false; shiftStart = null; shiftSnap = null;
  });

  canvas.addEventListener('click', e => {
    e.stopPropagation();
    if (drawTool !== 'text') return;
    const pos   = getDrawPos(e);
    const gRect = document.getElementById('game').getBoundingClientRect();
    textPos = pos;
    textWrap.style.display   = 'block';
    textWrap.style.left      = (e.clientX - gRect.left) + 'px';
    textWrap.style.top       = (e.clientY - gRect.top)  + 'px';
    textInput.style.color    = drawColor;
    textInput.style.fontSize = (drawSize * 2 + 12) + 'px';
    textInput.style.width    = '4px';
    textInput.value = '';
    textInput.focus();
  });

  const textWrap  = document.getElementById('draw-text-wrap');
  const textInput = document.getElementById('draw-text-input');

  function commitText() {
    const text = textInput.value.trim();
    if (text && textPos) {
      saveDrawState();
      dctx.globalCompositeOperation = 'source-over';
      dctx.fillStyle    = drawColor;
      dctx.font         = `${drawSize * 2 + 12}px 'Gowun Batang', serif`;
      dctx.textBaseline = 'top';
      dctx.fillText(text, textPos.x, textPos.y);
    }
    textInput.value = '';
    textWrap.style.display = 'none';
    textPos = null;
  }

  textInput.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter')  { e.preventDefault(); commitText(); }
    if (e.key === 'Escape') { textInput.value = ''; textWrap.style.display = 'none'; textPos = null; }
  });
  textInput.addEventListener('input', () => {
    textInput.style.width = Math.max(4, textInput.scrollWidth) + 'px';
  });
  textInput.addEventListener('blur', commitText);
  textWrap.addEventListener('click', e => e.stopPropagation());

  const toolbar   = document.getElementById('draw-toolbar');
  const toggleBtn = document.getElementById('draw-toggle');

  toolbar.addEventListener('click', e => e.stopPropagation());
  toggleBtn.addEventListener('click', e => {
    e.stopPropagation();
    toolbar.style.display       = 'flex';
    toggleBtn.style.display     = 'none';
    canvas.style.pointerEvents  = 'auto';
    canvas.style.opacity        = '1';
  });
  document.getElementById('draw-close').addEventListener('click', () => {
    toolbar.style.display      = 'none';
    toggleBtn.style.display    = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity       = '0';
  });

  const handle = document.getElementById('draw-handle');
  let dragging = false, dragOX = 0, dragOY = 0;

  handle.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    dragging = true;
    const tRect = toolbar.getBoundingClientRect();
    const gRect = document.getElementById('game').getBoundingClientRect();
    toolbar.style.left      = (tRect.left - gRect.left) + 'px';
    toolbar.style.top       = (tRect.top  - gRect.top)  + 'px';
    toolbar.style.bottom    = 'auto';
    toolbar.style.transform = 'none';
    dragOX = e.clientX - tRect.left;
    dragOY = e.clientY - tRect.top;
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const gRect = document.getElementById('game').getBoundingClientRect();
    const tRect = toolbar.getBoundingClientRect();
    toolbar.style.left = Math.max(0, Math.min(e.clientX - gRect.left - dragOX, 1200 - tRect.width))  + 'px';
    toolbar.style.top  = Math.max(0, Math.min(e.clientY - gRect.top  - dragOY, 675  - tRect.height)) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  const toolBtns = document.querySelectorAll('.draw-tool-btn');

  function setTool(tool) {
    drawTool = tool;
    canvas.style.cursor = tool === 'text' ? 'text' : 'crosshair';
    toolBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('tool-' + tool).classList.add('active');
  }

  document.getElementById('tool-pen').addEventListener('click',    () => setTool('pen'));
  document.getElementById('tool-eraser').addEventListener('click', () => setTool('eraser'));
  document.getElementById('tool-text').addEventListener('click',   () => setTool('text'));

  document.getElementById('draw-undo').addEventListener('click', () => {
    if (undoStack.length) {
      redoStack.push(dctx.getImageData(0, 0, canvas.width, canvas.height));
      dctx.putImageData(undoStack.pop(), 0, 0);
    }
  });
  document.getElementById('draw-redo').addEventListener('click', () => {
    if (redoStack.length) {
      undoStack.push(dctx.getImageData(0, 0, canvas.width, canvas.height));
      dctx.putImageData(redoStack.pop(), 0, 0);
    }
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
