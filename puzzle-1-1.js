(function () {
  const overlay = document.getElementById('puzzle-overlay');

  const today = new Date();
  const month = today.getMonth() + 1; // 오
  const day   = today.getDate();      // 늘
  const n     = month + day + 10;     // 오 - n + 늘 = -10

  const card = document.createElement('div');
  card.id = 'puzzle-1-1-card';

  const lines = [
    `<span class="eq-char">신</span><span class="eq-op">−</span><span class="eq-char">정</span><span class="eq-eq">=</span><span class="eq-num">0</span>`,
    `<span class="eq-char">광</span><span class="eq-op">+</span><span class="eq-char">복</span><span class="eq-eq">=</span><span class="eq-num">23</span>`,
    `<span class="eq-char">개</span><span class="eq-op">×</span><span class="eq-char">천</span><span class="eq-eq">=</span><span class="eq-num">30</span>`,
    `<span class="eq-char">오</span><span class="eq-op">−</span><span class="eq-num">${n}</span><span class="eq-op">+</span><span class="eq-char">늘</span><span class="eq-eq">=</span><span class="eq-unknown">?</span>`,
  ];

  lines.forEach(html => {
    const div = document.createElement('div');
    div.className = 'eq-line';
    div.innerHTML = html;
    card.appendChild(div);
  });

  overlay.appendChild(card);
})();
