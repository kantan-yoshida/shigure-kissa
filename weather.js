/* ============================================================
   時雨喫茶 ─ 入店ゲート（雨の日だけ開く）
   Open-Meteo（APIキー不要）で現在地の天気を取得し、
   雨・霧雨・にわか雨・雷雨なら入店、それ以外は「また雨の日に」。
   ============================================================ */
(() => {
  const gate   = document.getElementById('gate');
  const status = document.getElementById('gate-status');
  const closed = document.getElementById('closed');
  const welcome= document.getElementById('welcome');
  const checkBtn = document.getElementById('check-btn');
  const peekBtn  = document.getElementById('peek-btn');
  const retryBtn = document.getElementById('retry-btn');

  // WMO weather code → 雨判定
  // 51-57 霧雨 / 61-67 雨 / 80-82 にわか雨 / 95-99 雷雨
  const RAIN_CODES = new Set([
    51,53,55,56,57, 61,63,65,66,67, 80,81,82, 95,96,99
  ]);
  const RAIN_LABEL = {
    51:'霧雨',53:'霧雨',55:'霧雨',56:'氷霧雨',57:'氷霧雨',
    61:'小雨',63:'雨',65:'本降りの雨',66:'みぞれ',67:'みぞれ',
    80:'にわか雨',81:'にわか雨',82:'激しいにわか雨',
    95:'雷雨',96:'雷雨',99:'激しい雷雨'
  };

  function setStatus(msg, cls){
    status.textContent = msg;
    status.className = 'gate-status' + (cls? ' '+cls : '');
  }

  async function checkSky(){
    checkBtn.disabled = true;
    setStatus('空を見上げています…');

    let coords;
    try {
      coords = await getPosition();
    } catch(e){
      setStatus('位置情報が得られませんでした。デモでのぞいてみてください。');
      checkBtn.disabled = false;
      return;
    }

    try {
      const { latitude, longitude } = coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,precipitation,is_day`;
      const res = await fetch(url);
      const data = await res.json();
      const code = data?.current?.weather_code;
      const precip = data?.current?.precipitation ?? 0;

      const raining = RAIN_CODES.has(code) || precip > 0.05;
      if (raining){
        const label = RAIN_LABEL[code] || '雨';
        setStatus(`いま、${label}。── どうぞ、お入りください。`, 'rain');
        setTimeout(openCafe, 1100);
      } else {
        setStatus('空は乾いています。本日は晴れのよう。', 'clear');
        setTimeout(showClosed, 1100);
      }
    } catch(e){
      setStatus('空模様を確かめられませんでした。デモでのぞいてみてください。');
      checkBtn.disabled = false;
    }
  }

  function getPosition(){
    return new Promise((resolve, reject)=>{
      if(!navigator.geolocation) return reject();
      navigator.geolocation.getCurrentPosition(
        p => resolve(p.coords),
        err => reject(err),
        { timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  // ── 入店 ──────────────────────────────────
  function openCafe(){
    gate.classList.add('fade');
    closed.classList.add('hidden');
    if(window.ShigureScene) window.ShigureScene.enter();
    setTimeout(()=>{ gate.classList.add('hidden'); }, 1500);
    setTimeout(()=>{
      welcome.classList.remove('hidden');
      requestAnimationFrame(()=>welcome.classList.add('show'));
    }, 2600);
    // しばらくして挨拶を消す
    setTimeout(()=> welcome.classList.remove('show'), 8000);
  }

  function showClosed(){
    closed.classList.remove('hidden');
  }

  // ── イベント ──────────────────────────────
  checkBtn.addEventListener('click', checkSky);
  peekBtn .addEventListener('click', openCafe);   // デモ入店
  retryBtn.addEventListener('click', ()=>{
    closed.classList.add('hidden');
    setStatus('もう一度、空を見上げてみましょう。');
    checkBtn.disabled = false;
  });

  // 初期メッセージ
  setStatus('傘をたたんで、ボタンを押してください。');
})();
