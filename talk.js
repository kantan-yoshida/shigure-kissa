/* ============================================================
   時雨喫茶 ─ キャラをクリックで吹き出し
   ・ウサギ → Advice Slip API（人生の助言）
   ・クマ   → 引用API dummyjson（本の一節を読む体）
   ・ネコ   → 料理API TheMealDB（本日のまかない）
   通信に失敗したら、日本語の手書きセリフへフォールバック。
   ============================================================ */
(() => {
  const cv = document.getElementById('scene');

  // 店内キャラの当たり判定（内部解像度 320x200 基準）
  const HITS = [
    { id:'rabbit', x:124, y:108, w:30, h:42 },
    { id:'bear',   x:26,  y:112, w:44, h:40 },
    { id:'cat',    x:232, y:94,  w:32, h:34 },
  ];
  const NAMES = { rabbit:'ウサギ', bear:'クマ', cat:'マスター' };

  // 手書きの保険セリフ（オフライン／通信失敗時）
  const LOCAL = {
    rabbit:[
      'ふと、こんな言葉が浮かんだ。\n「珈琲が冷めるより早く、雨はやまない。」',
      '雨の夜は、気持ちが少し素直になるね。',
      'カップの湯気を眺めていると、時間を忘れる。',
    ],
    bear:[
      '本にこう書いてある。\n「良い物語は、二度目の雨で深くなる。」',
      'この章、何度読んでも好きなんだ。',
      'しおりを挟んで、続きはまた今度。',
    ],
  };

  // マスター（ネコ）── 時雨喫茶を紹介する語り
  const MASTER = [
    'ようこそ、時雨喫茶へ。\n雨の日だけ、そっと開く店です。',
    'この店はね、雨が降ると\nふっと灯りがともるんだ。',
    '傘の雫を払って、ゆっくりどうぞ。\n珈琲は、おかわり自由だよ。',
    '雨音が、いちばんのごちそう。\n何も話さなくていい時間を、君に。',
    'ここへ来られるのは雨の日だけ。\nだからこそ、一期一会さ。',
    'マスターのネコです。\n今日も、いい雨だね。',
    '窓の外の雨を肴に、一杯どうぞ。\n夜は、まだ長い。',
  ];

  let bubble = null, dock = null, hideTimer = null, reqId = 0;

  function ensureBubble(){
    if(bubble) return bubble;
    bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = '<span class="who"></span><span class="msg"></span><span class="tail"></span>';
    document.body.appendChild(bubble);
    return bubble;
  }

  // 内部座標 → 画面座標
  function toScreen(ix, iy){
    const r = cv.getBoundingClientRect();
    return { x: r.left + (ix/320)*r.width, y: r.top + (iy/200)*r.height };
  }

  // クリック位置 → ヒットしたキャラ
  function hitTest(ev){
    const r = cv.getBoundingClientRect();
    const ix = ((ev.clientX - r.left)/r.width)  * 320;
    const iy = ((ev.clientY - r.top )/r.height) * 200;
    for(const h of HITS)
      if(ix>=h.x && ix<=h.x+h.w && iy>=h.y && iy<=h.y+h.h) return h;
    return null;
  }

  function ensureDock(){
    if(dock) return dock;
    dock = document.createElement('div');
    dock.className = 'dock';
    dock.innerHTML = '<span class="who"></span><span class="msg"></span>';
    dock.addEventListener('click', hideBubble);
    document.body.appendChild(dock);
    return dock;
  }

  // 黒帯が十分あれば下のセリフ欄に、無ければキャラ頭上の吹き出しに出す
  function showBubble(h, who, text, loading){
    const r = cv.getBoundingClientRect();
    const band = window.innerHeight - r.bottom;   // 下の黒帯の高さ
    if(band > 70){ hideFloat(); showDock(who, text, loading, r, band); }
    else         { hideDock();  showFloat(h, who, text, loading, r); }
    clearTimeout(hideTimer);
    if(!loading) hideTimer = setTimeout(hideBubble, 8000);
  }

  // ① キャラ頭上の吹き出し（PCなど黒帯が無い画面）
  function showFloat(h, who, text, loading, r){
    const b = ensureBubble();
    b.querySelector('.who').textContent = who;
    b.querySelector('.msg').textContent = text;
    b.classList.toggle('loading', !!loading);

    const px = r.left + ((h.x + h.w/2)/320)*r.width;
    const py = r.top  + ((h.y - 3)/200)*r.height;
    b.style.left = '0px'; b.style.top = '0px';
    const w = b.offsetWidth, margin = 8;
    const left = Math.max(margin, Math.min(px - w/2, window.innerWidth - w - margin));
    b.style.left = left + 'px';
    b.style.top  = py + 'px';
    const tail = b.querySelector('.tail');
    tail.style.left = Math.max(14, Math.min(px - left, w - 14)) + 'px';

    requestAnimationFrame(()=> b.classList.add('show'));
  }

  // ② 下の黒帯に出すセリフ欄（スマホなど縦長画面）
  function showDock(who, text, loading, r, band){
    const d = ensureDock();
    d.querySelector('.who').textContent = who;
    d.querySelector('.msg').textContent = text;
    d.classList.toggle('loading', !!loading);
    d.style.top = '0px';
    const dh = d.offsetHeight;
    let top = r.bottom + Math.max(8, (band - dh)/2);   // 黒帯の中央あたり
    top = Math.min(top, window.innerHeight - dh - 8);
    d.style.top = top + 'px';
    requestAnimationFrame(()=> d.classList.add('show'));
  }

  function hideFloat(){ if(bubble) bubble.classList.remove('show'); }
  function hideDock(){  if(dock)   dock.classList.remove('show'); }
  function hideBubble(){ hideFloat(); hideDock(); }

  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

  // 遅い／落ちているAPIで待たされないよう 5秒で打ち切る
  async function getJSON(url, opt){
    const c = new AbortController();
    const to = setTimeout(()=> c.abort(), 5000);
    try { return await (await fetch(url, {...opt, signal:c.signal})).json(); }
    finally { clearTimeout(to); }
  }

  // HTMLエンティティを戻す（翻訳結果に &#39; 等が混じるため）
  function decodeEntities(s){
    const ta = document.createElement('textarea'); ta.innerHTML = s; return ta.value;
  }

  // 英語 → 日本語（MyMemory・無料/キー不要/CORS可・匿名）
  async function toJa(text){
    const url = 'https://api.mymemory.translated.net/get?langpair=en|ja&q=' + encodeURIComponent(text);
    const j = await getJSON(url);
    const out = j && j.responseData && j.responseData.translatedText;
    if(!out || /MYMEMORY WARNING|QUOTA|INVALID|PLEASE/i.test(out)) throw new Error('translate-failed');
    return decodeEntities(out);
  }

  async function fetchLine(id){
    if(id==='rabbit'){
      const j  = await getJSON('https://api.adviceslip.com/advice', {cache:'no-store'});
      const ja = await toJa(j.slip.advice);
      return 'ふと、こんな言葉が浮かんだ。\n「' + ja + '」';
    }
    if(id==='bear'){
      const j  = await getJSON('https://dummyjson.com/quotes/random');
      const ja = await toJa(j.quote);
      return '本にこう書いてある。\n「' + ja + '」\n── ' + j.author;  // 著者名は原語のまま
    }
  }

  async function speak(h){
    const who = NAMES[h.id];
    // マスター（ネコ）は時雨喫茶の紹介を即表示（API不要）
    if(h.id==='cat'){ ++reqId; showBubble(h, who, pick(MASTER), false); return; }
    showBubble(h, who, '…', true);
    const id = ++reqId;
    let line = null;
    try { line = await fetchLine(h.id); } catch(e){ /* 通信失敗 */ }
    if(id !== reqId) return;             // もっと新しいクリックに置き換わった
    if(!line) line = pick(LOCAL[h.id]);  // 保険
    showBubble(h, who, line, false);
  }

  function inside(){
    return window.ShigureScene && window.ShigureScene.currentView() === 'int';
  }

  cv.addEventListener('click', ev=>{
    if(!inside()) return;
    const h = hitTest(ev);
    if(h) speak(h); else hideBubble();
  });
  cv.addEventListener('mousemove', ev=>{
    if(!inside()){ cv.style.cursor=''; return; }
    cv.style.cursor = hitTest(ev) ? 'pointer' : 'default';
  });
  window.addEventListener('resize', hideBubble);
})();
