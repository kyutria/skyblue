(function () {
  const overlay = document.getElementById('puzzle-overlay');

  const el = document.createElement('div');
  el.id = 'puzzle-1-2-text';
  el.textContent = '이 텍스트를 복사해서 정답에 붙여넣기 하면 클리어됩니다!';
  overlay.appendChild(el);

  // CSS transform → left/top 절대값으로 전환 (첫 드래그 시 1회)
  let positionFixed = false;
  function fixPosition() {
    if (positionFixed) return;
    positionFixed = true;
    const rect  = el.getBoundingClientRect();
    const oRect = overlay.getBoundingClientRect();
    el.style.transform = 'none';
    el.style.left = (rect.left - oRect.left) + 'px';
    el.style.top  = (rect.top  - oRect.top)  + 'px';
  }

  // 드래그
  const DRAG_THRESHOLD = 5;
  let dragging = false;
  let startX, startY, startLeft, startTop;

  el.addEventListener('mousedown', (e) => {
    fixPosition();
    startX    = e.clientX;
    startY    = e.clientY;
    startLeft = el.offsetLeft;
    startTop  = el.offsetTop;
    dragging  = false;

    const onMove = (e) => {
      if (!dragging && (Math.abs(e.clientX - startX) > DRAG_THRESHOLD || Math.abs(e.clientY - startY) > DRAG_THRESHOLD)) {
        dragging = true;
        el.style.userSelect = 'none';
        el.style.cursor = 'grabbing';
      }
      if (dragging) {
        const oRect  = overlay.getBoundingClientRect();
        const newLeft = Math.max(0, Math.min(startLeft + e.clientX - startX, oRect.width  - el.offsetWidth));
        const newTop  = Math.max(0, Math.min(startTop  + e.clientY - startY, oRect.height - el.offsetHeight));
        el.style.left = newLeft + 'px';
        el.style.top  = newTop  + 'px';
      }
    };

    const onUp = () => {
      if (dragging) {
        el.style.userSelect = '';
        el.style.cursor = 'grab';
      }
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // 클립보드 가로채기
  document.addEventListener('copy', (e) => {
    e.preventDefault();
    e.clipboardData.setData('text/plain', '사실 정답은 바보입니다.');
  });
})();
