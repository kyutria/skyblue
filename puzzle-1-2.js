(function () {
  const overlay = document.getElementById('puzzle-overlay');

  const el = document.createElement('div');
  el.id = 'puzzle-1-2-text';
  el.textContent = '이 텍스트를 복사해서 정답에 붙여넣기 하면 클리어됩니다!';
  overlay.appendChild(el);

  // 클립보드 가로채기
  document.addEventListener('copy', (e) => {
    e.preventDefault();
    e.clipboardData.setData('text/plain', '사실 정답은 바보입니다.');
  });
})();
