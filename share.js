/* ============================================================
   時雨喫茶 ─ セリフの共有
   ・shareText : テキストで共有（Web Share / クリップボード）
   ・shareCard : セリフを雨夜の背景にのせた画像カードを生成して共有/保存
   ============================================================ */
(() => {
  const SITE = location.origin + location.pathname;

  // ── トースト ──
  let toastEl, toastT;
  function toast(msg){
    if(!toastEl){ toastEl = document.createElement('div'); toastEl.id = 'sh-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(()=> toastEl.classList.remove('show'), 2200);
  }

  // 「…」の中身を取り出す（無ければ全文を一行に）
  function core(line){
    const m = line.match(/[「『]([^」』]+)[」』]/);
    return m ? m[1] : line.replace(/\n+/g, ' ').trim();
  }

  function composeText(line, who){
    return `${line.replace(/\s+$/,'')}\n\n― 時雨喫茶（${who}）\n${SITE}`;
  }

  // ── テキスト共有 ──
  async function shareText(line, who){
    const text = composeText(line, who);
    if(navigator.share){
      try { await navigator.share({ title:'時雨喫茶', text }); return; }
      catch(e){ if(e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast('コピーしました'); }
    catch(e){ toast('コピーできませんでした'); }
  }

  // ── 画像カード共有 ──
  async function shareCard(line, who){
    toast('画像をつくっています…');
    const blob = await makeCard(line, who);
    const file = new File([blob], 'shigure-kissa.png', { type:'image/png' });
    if(navigator.canShare && navigator.canShare({ files:[file] })){
      try { await navigator.share({ files:[file], title:'時雨喫茶' }); return; }
      catch(e){ if(e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'shigure-kissa.png'; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
    toast('画像を保存しました');
  }

  function makeCard(line, who){
    return new Promise(resolve=>{
      const S = 1080;
      const c = document.createElement('canvas'); c.width = S; c.height = S;
      const x = c.getContext('2d');

      // 背景：雨の夜空
      const g = x.createLinearGradient(0,0,0,S);
      g.addColorStop(0,'#0c1024'); g.addColorStop(.55,'#12162a'); g.addColorStop(1,'#070810');
      x.fillStyle = g; x.fillRect(0,0,S,S);
      x.fillStyle = '#0b0d15'; x.fillRect(0, S*0.8, S, S*0.2);
      x.fillStyle = 'rgba(255,184,103,0.10)'; x.fillRect(S*0.5-90, S*0.8, 180, S*0.2);

      // 雨
      x.strokeStyle = 'rgba(174,185,201,0.26)'; x.lineWidth = 2;
      for(let i=0;i<130;i++){
        const rx = Math.random()*S, ry = Math.random()*S, l = 14+Math.random()*28;
        x.beginPath(); x.moveTo(rx,ry); x.lineTo(rx - l*0.3, ry + l); x.stroke();
      }

      const draw = ()=>{
        // 飾りの引用符
        x.fillStyle = 'rgba(255,184,103,0.85)';
        x.font = '160px "Shippori Mincho", serif';
        x.textAlign = 'left'; x.textBaseline = 'alphabetic';
        x.fillText('“', 96, 260);

        // 本文
        const quote = core(line);
        const fs = quote.length > 56 ? 46 : quote.length > 30 ? 58 : 70;
        x.fillStyle = '#f4ecd8';
        x.font = `${fs}px "Shippori Mincho", serif`;
        wrap(x, quote, 110, 360, S - 220, fs * 1.6);

        // 話者
        x.fillStyle = '#ffb867';
        x.font = '34px "DotGothic16", sans-serif';
        x.fillText(`― ${who}`, 112, S - 210);

        // 店名・URL
        x.fillStyle = '#bdf0ff';
        x.font = '46px "DotGothic16", sans-serif';
        x.fillText('時雨喫茶', 112, S - 130);
        x.fillStyle = 'rgba(233,228,216,0.6)';
        x.font = '26px "DotGothic16", sans-serif';
        x.fillText('雨の日だけ開く、夜の喫茶店', 112, S - 90);

        c.toBlob(b=> resolve(b), 'image/png');
      };

      if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
      else draw();
    });
  }

  // 日本語の折り返し（文字単位）
  function wrap(ctx, text, x0, y0, maxW, lh){
    let line = '', y = y0;
    for(const ch of [...text]){
      if(ch === '\n'){ ctx.fillText(line, x0, y); line = ''; y += lh; continue; }
      const t = line + ch;
      if(ctx.measureText(t).width > maxW && line){ ctx.fillText(line, x0, y); line = ch; y += lh; }
      else line = t;
    }
    if(line) ctx.fillText(line, x0, y);
  }

  window.ShigureShare = { shareText, shareCard };
})();
