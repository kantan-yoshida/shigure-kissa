/* ============================================================
   時雨喫茶 ─ 全画面の雨夜＋上の帯のネオン看板
   ・画面全体に雨を降らせ、空いた上下の黒帯を「雨の夜」にする
     （中央はシーン本体が覆うので、雨は帯の部分に見える）
   ・上の帯が十分あるとき（スマホ等）に「時雨喫茶」の看板を出す
   ============================================================ */
(() => {
  // ── 全画面の雨キャンバス（CSSの夜空グラデの上に雨だけ描く） ──
  const ac = document.createElement('canvas');
  ac.id = 'ambient';
  document.body.prepend(ac);
  const ax = ac.getContext('2d');

  // ── 上の帯の看板 ──
  const sign = document.createElement('div');
  sign.id = 'topsign';
  sign.innerHTML = '<span class="ts-name">時雨喫茶</span><span class="ts-sub">雨音とともに。</span>';
  document.body.appendChild(sign);

  const scene = document.getElementById('scene');
  const gate  = document.getElementById('gate');

  let W = 0, H = 0, drops = [];

  function mk(init){
    return {
      x: Math.random()*W,
      y: init ? Math.random()*H : -20,
      len: 7 + Math.random()*15,
      sp: 7 + Math.random()*7,
      a: 0.10 + Math.random()*0.22
    };
  }

  function resize(){
    W = ac.width  = window.innerWidth;
    H = ac.height = window.innerHeight;
    const n = Math.min(220, Math.round(W*H/4500));
    drops = [];
    for(let i=0;i<n;i++) drops.push(mk(true));
    placeSign();
  }

  // 看板を上の帯の中央に置く（帯が無い画面では隠す）
  function placeSign(){
    const r = scene.getBoundingClientRect();
    const topBand = r.top;                       // 上の黒帯の高さ
    const ready = gate.classList.contains('hidden');  // ゲートが消えた後だけ
    if(ready && topBand > 70){
      sign.style.top = (topBand/2) + 'px';
      sign.classList.add('show');
    } else {
      sign.classList.remove('show');
    }
  }

  function loop(){
    ax.clearRect(0,0,W,H);   // 透過 → CSSの夜空グラデが透ける
    ax.strokeStyle = '#aeb9c9';
    ax.lineWidth = 1;
    for(const d of drops){
      d.y += d.sp; d.x -= d.sp*0.25;
      if(d.y > H+12 || d.x < -12) Object.assign(d, mk(false));
      ax.globalAlpha = d.a;
      ax.beginPath();
      ax.moveTo(d.x, d.y);
      ax.lineTo(d.x - d.sp*0.25*0.6, d.y + d.len);
      ax.stroke();
    }
    ax.globalAlpha = 1;
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  // ゲートが消えた／向きが変わった等に追従して看板の表示を更新
  setInterval(placeSign, 400);

  resize();
  loop();
})();
