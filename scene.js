/* ============================================================
   時雨喫茶 ─ ドット絵シーン描画エンジン
   320 x 200 の内部解像度に矩形でピクセルアートを描き、
   CSS で拡大して鮮明なドット絵にする。
   ============================================================ */
(() => {
  const cv = document.getElementById('scene');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height;

  // ── パレット ───────────────────────────────
  const C = {
    sky0:'#0c1024', sky1:'#171c33', sky2:'#23223a',
    bgB:'#10131f', bgB2:'#161a2b', bgWin:'#3a3550',
    wood:'#3b2a22', wood2:'#4a3528', wood3:'#5a4030', plank:'#2c1f19',
    roof:'#241c2c', roof2:'#312640',
    warm:'#ffb867', warmHi:'#ffd9a0', warmDk:'#c97f3a',
    glow:'#ffe2b0',
    glassDk:'#2a1d12',
    street:'#11131c', streetWet:'#181b27',
    rain:'#9fb0c8',
    rabbit:'#f3ede2', rabbitDk:'#cfc6b6',
    bear:'#8a5a3b', bearDk:'#6c4329',
    cat:'#e7943f', catDk:'#bf6f24',
    cup:'#caa06a', book:'#efe2c4',
    shiba:'#e0a85a', shibaDk:'#b97f37', coat:'#ffe14d', coatDk:'#d8b81f',
    catC:'#54657a', catCDk:'#3c4a5c',
    umbR:'#c44e57', umbB:'#5f7fb0', noren:'#243a52',
    chalk:'#e9e4d8', board:'#1c241f', boardFrame:'#4a3528',
    lantern:'#d8584e', lanternHi:'#ff8a6a',
  };

  // ── 矩形ヘルパ ─────────────────────────────
  const R = (x,y,w,h,c) => { ctx.fillStyle = c; ctx.fillRect(x|0,y|0,w|0,h|0); };
  const dot = (x,y,c) => R(x,y,1,1,c);

  // ── 雨 ────────────────────────────────────
  const drops = [];
  for (let i=0;i<150;i++) drops.push(newDrop(true));
  function newDrop(init){
    return {
      x:Math.random()*W,
      y:init?Math.random()*H:-4,
      len:2+Math.random()*4,
      sp:2.4+Math.random()*2.6,
      a:0.18+Math.random()*0.4
    };
  }
  const ripples = [];

  // ── 状態 ──────────────────────────────────
  let entered=false;     // 入店演出が始まったか
  let ef=0;              // 入店からの経過フレーム
  let view='ext';        // 'ext'=外観 / 'int'=店内
  let door=0;            // ドア開度 0..1
  let shibaIn=0;         // 柴犬が中へ消える 0..1
  let catLeave=0;        // 退店ネコの位置 0..1
  let raf=null, t0=null;

  // ── 公開API ───────────────────────────────
  window.ShigureScene = {
    start(){ if(!raf){ t0=performance.now(); loop(performance.now()); } },
    enter(){ entered=true; },
    currentView(){ return view; }   // 'ext' / 'int'
  };

  // ============================================================
  //  メインループ
  // ============================================================
  function loop(now){
    const t = now - t0;
    update();
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  function update(){
    // 雨
    for(const d of drops){
      d.y += d.sp; d.x -= d.sp*0.35;
      if(d.y>H-46+Math.random()*40){
        if(Math.random()<0.25) ripples.push({x:d.x,y:152+Math.random()*44,r:0,max:3+Math.random()*4});
        Object.assign(d,newDrop(false));
      }
      if(d.x<-4) d.x=W;
    }
    // 波紋
    for(let i=ripples.length-1;i>=0;i--){
      const r=ripples[i]; r.r+=0.25;
      if(r.r>r.max) ripples.splice(i,1);
    }
    // 演出進行
    if(entered){
      ef++;
      door = Math.min(1, door+0.014);
      if(door>0.5) shibaIn = Math.min(1, shibaIn+0.012);
      if(ef>=100) view='int';   // 暖色に包まれた頃に店内へ切替
    }
    catLeave = Math.min(1, catLeave + 0.0018);
  }

  function draw(t){
    if(view==='ext') drawExterior(t);
    else             drawInterior(t);
    // 入店の暖色トランジション（ドアの光に包まれる）
    const cv = coverAlpha();
    if(cv>0){
      ctx.fillStyle = `rgba(255,206,140,${cv*0.96})`;
      ctx.fillRect(0,0,W,H);
    }
  }

  // 外観 → 店内 の白飛び（暖色）量
  function coverAlpha(){
    if(!entered) return 0;
    if(ef<78)  return 0;
    if(ef<104) return (ef-78)/26;        // 0 → 1
    if(ef<150) return 1-(ef-104)/46;     // 1 → 0
    return 0;
  }

  function drawExterior(t){
    drawSky();
    drawBackBuildings(t);
    drawStreet(t);
    drawCafe(t);
    drawCharacters(t);
    drawRain();
  }

  // ── 空 ────────────────────────────────────
  function drawSky(){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,C.sky0); g.addColorStop(0.5,C.sky1); g.addColorStop(1,C.sky2);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // 遠くのにじむ灯り
    softGlow(40,38,18,'rgba(120,140,200,.10)');
    softGlow(280,30,22,'rgba(120,140,200,.08)');
  }

  // ── 背景の横丁ビル ─────────────────────────
  function drawBackBuildings(t){
    const set=[
      [0,96,40,60,C.bgB],[34,84,28,72,C.bgB2],[256,90,30,66,C.bgB2],
      [284,80,36,76,C.bgB],[20,108,18,48,C.bgB2]
    ];
    for(const[x,y,w,h,c] of set){ R(x,y,w,h,c);
      // ぽつぽつ灯る窓
      for(let wy=y+6;wy<y+h-6;wy+=10)
        for(let wx=x+4;wx<x+w-4;wx+=8)
          if(((wx*7+wy*3)%5)===0) R(wx,wy,2,3, ((wx+wy)%3? '#caa86a':C.bgWin));
    }
    // ぼやけた電線
    R(0,72,W,1,'rgba(0,0,0,.4)');
  }

  // ── 濡れた路面 ─────────────────────────────
  function drawStreet(t){
    R(0,150,W,50,C.street);
    R(0,150,W,3,'#1d2130');
    // しっとりした横の質感
    for(let y=154;y<200;y+=2) R(0,y,W,1, (y%4? C.street:C.streetWet));

    // 暖色＆ネオンの映り込み（窓・ドア・提灯）
    const reflect=[
      [114,C.warm,.16],[160,C.warm,.18],[206,C.warm,.20],
      [96,C.lanternHi,.12],[210,C.lanternHi,.12],[148,'#7fe7ff',.10]
    ];
    for(const[x,col,a] of reflect){
      const wob = Math.sin(t/420 + x)*1.4;
      const grd=ctx.createLinearGradient(0,152,0,198);
      grd.addColorStop(0, rgba(col,a)); grd.addColorStop(1, rgba(col,0));
      ctx.fillStyle=grd;
      ctx.fillRect((x-3+wob)|0,152,6,46);
    }
    // 波紋
    for(const r of ripples){
      ctx.strokeStyle='rgba(180,200,230,.18)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(r.x,r.y,r.r,r.r*0.4,0,0,Math.PI*2); ctx.stroke();
    }
  }

  // ── 喫茶店本体 ─────────────────────────────
  function drawCafe(t){
    // 軒先の屋根（張り出し）
    R(82,48,154,4,C.roof2);
    for(let i=0;i<10;i++) R(82+i*16,52,14,4, i%2?C.roof:C.roof2);
    R(82,56,154,2,'#1a1422');

    // 建物本体（木造）
    R(90,58,140,92,C.wood);
    // 板目
    for(let x=92;x<228;x+=10) R(x,58,1,92,C.plank);
    R(90,58,140,2,C.wood3);
    R(90,146,140,4,C.wood2);   // 土台
    // 柱
    R(90,58,3,92,C.wood3); R(227,58,3,92,C.wood3);

    // ネオン看板「深夜喫茶」
    drawNeon(t);

    // 窓A：コーヒーを飲むウサギ
    drawWindow(98,86,34,32,t);
    drawRabbit(108,112,t);

    // 窓B：本を読むクマ／料理するネコ
    drawWindow(140,86,46,32,t);
    drawBear(150,113,t);
    drawCat(172,112,t);

    // のれん
    drawNoren(194,90);

    // ドア
    drawDoor(196,94,26,56,t);

    // 提灯（左・右）
    drawLantern(95,60,t,0.0);
    drawLantern(214,58,t,1.3);

    // 黒板（雨音とともに。）
    drawChalkboard(62,124);
  }

  function drawNeon(t){
    const flick = 0.82 + 0.18*Math.abs(Math.sin(t/130)+0.4*Math.sin(t/57));
    // 看板の板
    R(112,60,72,14,'#0c0f1a'); R(112,60,72,1,'#27314a'); R(112,73,72,1,'#05070d');
    ctx.save();
    ctx.font='10px "DotGothic16", monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(127,231,255,'+(0.9*flick)+')';
    ctx.shadowBlur=8;
    ctx.fillStyle='rgba(190,245,255,'+flick+')';
    ctx.fillText('時雨喫茶',148,68);
    ctx.shadowBlur=0;
    ctx.restore();
  }

  // 窓（暖色の店内＋ガラス）
  function drawWindow(x,y,w,h,t){
    // 内部の暖かい光
    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,'#5a3d22'); g.addColorStop(.5,'#7a5026'); g.addColorStop(1,'#3a2613');
    ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
    softGlow(x+w/2,y+h/2,w*0.7,'rgba(255,184,103,.22)');
    // カウンター
    R(x,y+h-6,w,6,'#43301d'); R(x,y+h-6,w,1,'#5a4028');
  }
  function windowFrame(x,y,w,h){
    ctx.fillStyle=C.wood3;
    ctx.fillRect(x-2,y-2,w+4,2); ctx.fillRect(x-2,y+h,w+4,2);
    ctx.fillRect(x-2,y-2,2,h+4); ctx.fillRect(x+w,y-2,2,h+4);
    // 桟
    R(x,y+(h>>1),w,1,'rgba(40,28,20,.7)');
    R(x+(w>>1),y,1,h,'rgba(40,28,20,.7)');
    // ガラスの艶
    ctx.fillStyle='rgba(200,225,255,.05)';
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w*0.4,y); ctx.lineTo(x,y+h*0.4); ctx.fill();
  }

  // ── ウサギ（コーヒーを飲む） ──────────────────
  function drawRabbit(cx,baseY,t){
    const sip = Math.max(0, Math.sin(t/900));        // 0..1 持ち上げ
    const lift = (sip>0.6)? -2:0;
    // 体
    R(cx,baseY-8,8,8,C.rabbit);
    R(cx,baseY-8,8,2,C.rabbit);
    // 頭
    R(cx+1,baseY-15,7,7,C.rabbit);
    R(cx,baseY-15,2,7,C.rabbitDk);
    // 耳
    R(cx+2,baseY-21,2,6,C.rabbit); R(cx+5,baseY-21,2,6,C.rabbit);
    R(cx+2,baseY-21,1,6,C.rabbitDk);
    // 目
    dot(cx+3,baseY-12,'#2a211b'); dot(cx+6,baseY-12,'#2a211b');
    // ほっぺ
    dot(cx+2,baseY-11,'#e8a' ); dot(cx+7,baseY-11,'#e8a');
    // カップ（顔の前へ持ち上がる）
    R(cx+3,baseY-9+lift,4,3,C.cup);
    R(cx+3,baseY-9+lift,4,1,C.warmHi);
    // 湯気
    const s = (t/200)%6;
    dot(cx+5, baseY-12+lift-s, 'rgba(255,240,210,.5)');
    // 上書きで窓枠
    windowFrame(98,86,34,32);
  }

  // ── クマ（本を読む） ───────────────────────
  function drawBear(cx,baseY,t){
    const bob = Math.round(Math.sin(t/700));
    const page = (Math.floor(t/1700)%2);  // ページめくり
    // 体
    R(cx,baseY-9,9,9,C.bear);
    // 頭
    R(cx+1,baseY-16+bob,8,7,C.bear);
    R(cx+1,baseY-16+bob,8,2,C.bearDk);
    // 耳
    R(cx,baseY-18+bob,3,3,C.bear); R(cx+7,baseY-18+bob,3,3,C.bear);
    R(cx+1,baseY-17+bob,1,1,C.bearDk); R(cx+8,baseY-17+bob,1,1,C.bearDk);
    // 鼻・目
    dot(cx+3,baseY-12+bob,'#2a211b'); dot(cx+6,baseY-12+bob,'#2a211b');
    R(cx+4,baseY-11+bob,2,1,'#2a211b');
    // 本（開いた）
    R(cx-1,baseY-4,11,4,C.book);
    R(cx+4,baseY-4,1,4,C.bearDk);            // 綴じ目
    if(page) R(cx+0,baseY-3,4,1,'rgba(0,0,0,.15)');
    else     R(cx+6,baseY-3,3,1,'rgba(0,0,0,.15)');
  }

  // ── ネコ（料理する） ───────────────────────
  function drawCat(cx,baseY,t){
    const stir = Math.sin(t/260);
    // コンロ＆鍋
    R(cx,baseY-3,9,3,'#2c2530');               // コンロ
    R(cx+1,baseY-6,7,3,'#54606e');             // 鍋
    R(cx+1,baseY-6,7,1,'#7a8794');
    // 火
    if((t/180|0)%2) { dot(cx+2,baseY-2,'#ff8a3a'); dot(cx+5,baseY-2,'#ffd23a'); }
    else            { dot(cx+3,baseY-2,'#ffd23a'); dot(cx+6,baseY-2,'#ff8a3a'); }
    // 湯気
    const s=(t/160)%7;
    dot(cx+4,baseY-9-s,'rgba(255,245,225,.5)');
    dot(cx+5,baseY-11-(s+3)%7,'rgba(255,245,225,.35)');
    // 体
    R(cx+9,baseY-9,8,9,C.cat);
    R(cx+9,baseY-9,8,2,C.catDk);
    // 頭
    R(cx+10,baseY-15,7,6,C.cat);
    // 耳
    R(cx+10,baseY-17,2,2,C.cat); R(cx+15,baseY-17,2,2,C.cat);
    // 目
    dot(cx+12,baseY-12,'#2a211b'); dot(cx+15,baseY-12,'#2a211b');
    // しっぽ
    R(cx+17,baseY-8+Math.round(stir),2,5,C.catDk);
    // かき混ぜる腕
    R(cx+7,baseY-7+Math.round(stir),3,2,C.cat);
  }

  function drawNoren(x,y){
    R(x,y,28,3,C.noren);
    for(let i=0;i<4;i++) R(x+1+i*7,y+3,5,5, i%2?'#1c2c40':C.noren);
  }

  // ── ドア ──────────────────────────────────
  function drawDoor(x,y,w,h,t){
    // 枠
    R(x-2,y-2,w+4,h+4,C.wood3);
    if(door<0.02){
      // 閉じたドア
      R(x,y,w,h,C.wood2);
      for(let i=0;i<3;i++) R(x+3+i*7,y+4,1,h-8,C.plank);
      R(x+w-7,y+h/2,2,2,'#caa86a');     // 取っ手
      // 小窓
      R(x+5,y+6,w-10,8,'#7a5026'); R(x+5,y+6,w-10,1,'#a06a30');
    } else {
      // 開いたドア：店内の光が漏れる
      const open = door*(w-3);
      // あふれる光
      const g=ctx.createLinearGradient(x,y,x,y+h);
      g.addColorStop(0,'#ffcf8a'); g.addColorStop(1,'#a4631f');
      ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
      softGlow(x+w/2,y+h/2,w,'rgba(255,190,110,.35)');
      // 路面へ伸びる光のビーム
      ctx.fillStyle='rgba(255,196,120,.18)';
      ctx.beginPath();
      ctx.moveTo(x,y+h); ctx.lineTo(x+w,y+h);
      ctx.lineTo(x+w+10,200); ctx.lineTo(x-10,200); ctx.fill();
      // 開いた扉板（左へ）
      R(x-2,y,3+ (w-open-3),h,C.wood);
      R(x,y, (w-open), h, C.wood2);
      R(x+(w-open)-1,y,1,h,'#caa86a');
    }
  }

  // ── 提灯（ランタン） ──────────────────────
  function drawLantern(x,y,t,ph){
    const sway = Math.round(Math.sin(t/900+ph)*1);
    const fl = 0.8+0.2*Math.sin(t/120+ph);
    x+=sway;
    R(x+3,y-4,1,4,'#1a1422');          // 吊り紐
    softGlow(x+4,y+5,9,'rgba(255,150,90,'+(0.5*fl)+')');
    R(x+1,y,7,2,'#2a1a16');            // 上枠
    R(x,y+2,9,7,C.lantern);           // 本体
    R(x,y+2,9,1,C.lanternHi);
    R(x+4,y+2,1,7,'rgba(120,30,25,.6)');
    R(x+1,y+9,7,2,'#2a1a16');          // 下枠
    // ほのかな漢字風の点
    dot(x+3,y+5,'#5a0f0a'); dot(x+5,y+5,'#5a0f0a');
  }

  // ── 黒板「雨音とともに。」 ───────────────────
  function drawChalkboard(x,y){
    // A型の脚
    R(x+2,y+18,2,8,C.boardFrame); R(x+16,y+18,2,8,C.boardFrame);
    R(x-1,y-1,22,20,C.boardFrame);   // 枠
    R(x+1,y+1,18,16,C.board);        // 盤面
    ctx.save();
    ctx.font='6px "DotGothic16", monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(233,228,216,.92)';
    ctx.fillText('雨音と',x+10,y+6);
    ctx.fillText('ともに。',x+10,y+13);
    ctx.restore();
  }

  // ============================================================
  //  人物（柴犬・退店ネコ）
  // ============================================================
  function drawCharacters(t){
    // 退店するネコ（傘を開いて右へ）
    if(catLeave<1) drawLeavingCat(t);
    // 雨合羽の柴犬（ドアの前）
    if(shibaIn<1) drawShiba(t);
  }

  // ── 柴犬：雨合羽＋傘でドアを開けようとする ──────
  function drawShiba(t){
    const bx=178, by=150;
    const fade = 1-shibaIn;
    const stepIn = shibaIn* -2;       // 中へ吸い込まれる微移動
    ctx.globalAlpha = fade;
    const x = bx + stepIn;
    const bob = Math.round(Math.sin(t/500));

    // 傘（合羽の上にさす）
    const ux=x-3, uy=by-30+bob;
    R(ux,uy+4,16,1,C.umbRdk||'#8e353c');
    ctx.fillStyle=C.umbR;
    ctx.beginPath(); ctx.moveTo(ux-2,uy+5); ctx.lineTo(ux+18,uy+5); ctx.lineTo(ux+8,uy-1); ctx.fill();
    R(ux+1,uy+5,1,2,C.umbR); R(ux+15,uy+5,1,2,C.umbR);
    R(ux+8,uy+5,1,8,'#3a2c20');        // 柄
    // 合羽の体（黄色）
    R(x,by-16+bob,9,12,C.coat);
    R(x,by-16+bob,9,2,C.coatDk);
    R(x,by-5,3,4,C.shibaDk); R(x+6,by-5,3,4,C.shibaDk);  // 足
    // フード＋顔
    R(x+1,by-22+bob,8,7,C.coat);       // フード
    R(x+2,by-20+bob,6,5,C.shiba);      // 顔
    R(x+2,by-20+bob,6,1,C.shibaDk);
    dot(x+3,by-18+bob,'#2a211b'); dot(x+6,by-18+bob,'#2a211b'); // 目
    R(x+4,by-16+bob,2,1,'#2a211b');    // 鼻
    dot(x+2,by-17+bob,'#fff7ee'); dot(x+7,by-17+bob,'#fff7ee'); // 眉まろ
    // ドアへ伸ばす前足
    R(x+8,by-12+bob,3,2,C.coat);
    ctx.globalAlpha=1;
  }

  // ── 退店ネコ：傘を開きながら右へ ─────────────
  function drawLeavingCat(t){
    const x = 226 + catLeave*70;      // 右へ歩いて消える
    const by=150;
    const bob = Math.round(Math.sin((t)/300));
    const open = Math.min(1, catLeave*3);  // 傘の開き
    // 傘
    const ux=x, uy=by-26+bob;
    R(ux+5,uy+3,1,9,'#2a2230');         // 柄
    ctx.fillStyle=C.umbB;
    const uw = 4+open*9;
    ctx.beginPath();
    ctx.moveTo(ux+5-uw,uy+4); ctx.lineTo(ux+5+uw,uy+4); ctx.lineTo(ux+5,uy-2+ (1-open)*5); ctx.fill();
    if(open>0.6){ R((ux+5-uw)|0,uy+4,1,2,C.umbB); R((ux+5+uw-1)|0,uy+4,1,2,C.umbB); }
    // 体
    R(x+2,by-13+bob,8,9,C.catC);
    R(x+2,by-13+bob,8,2,C.catCDk);
    R(x+2,by-4,3,4,C.catCDk); R(x+7,by-4,3,4,C.catCDk);
    // 頭
    R(x+3,by-19+bob,6,6,C.catC);
    R(x+3,by-21+bob,2,2,C.catC); R(x+7,by-21+bob,2,2,C.catC); // 耳
    dot(x+5,by-16+bob,'#0e1a26'); dot(x+8,by-16+bob,'#0e1a26'); // 目
    // しっぽ
    R(x+1,by-9+bob,2,5,C.catCDk);
  }

  // ============================================================
  //  雨・エフェクト
  // ============================================================
  function drawRain(){
    ctx.lineWidth=1;
    for(const d of drops){
      ctx.strokeStyle = rgba(C.rain,d.a);
      ctx.beginPath();
      ctx.moveTo(d.x,d.y);
      ctx.lineTo(d.x-d.sp*0.35*d.len, d.y+d.len);
      ctx.stroke();
    }
  }

  // ============================================================
  //  店内（入店後の景色）
  // ============================================================
  function drawInterior(t){
    // 壁（暖かい木）
    const wg=ctx.createLinearGradient(0,0,0,150);
    wg.addColorStop(0,'#241811'); wg.addColorStop(.3,'#46311f'); wg.addColorStop(1,'#5a3d22');
    ctx.fillStyle=wg; ctx.fillRect(0,0,W,150);
    // 天井・梁
    R(0,0,W,22,'#1d140d');
    for(let x=0;x<W;x+=26) R(x,0,2,22,'#120b07');
    R(0,22,W,2,'#140d08');
    // 壁の縦板
    for(let x=6;x<W;x+=14) R(x,24,1,124,'rgba(28,17,11,.5)');
    R(0,146,W,4,'#33220f');   // 幅木

    // 床
    drawFloorInt();

    // 窓（外は雨）
    intWindow(18,32,58,52,t);
    intWindow(244,30,58,46,t);

    // 棚（右上）・品書き
    shelves(202,42);
    menuSign(112,38);

    // 主光源（ペンダント照明）
    pendant(t,70,-4);
    pendant(t,250,-2);
    pendant(t,160,2);

    // 客たち
    bearChair(34,150,t);     // クマ：読書
    rabbitTable(132,150,t);  // ウサギ：珈琲
    kitchen(150,t);          // 厨房カウンター＋ネコ：料理

    // 暖色の空気
    ctx.fillStyle='rgba(255,170,90,.05)'; ctx.fillRect(0,0,W,200);
    softGlow(160,76,150,'rgba(255,190,110,.08)');
  }

  function drawFloorInt(){
    const fg=ctx.createLinearGradient(0,150,0,200);
    fg.addColorStop(0,'#3a2818'); fg.addColorStop(1,'#211610');
    ctx.fillStyle=fg; ctx.fillRect(0,150,W,50);
    R(0,150,W,1,'#6a4a2c');
    for(let y=159;y<200;y+=8) R(0,y,W,1,'rgba(18,11,7,.5)');     // 板の継ぎ目
    for(let i=-3;i<=3;i++){                                       // 軽い遠近
      ctx.strokeStyle='rgba(18,11,7,.35)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(160+i*9,150); ctx.lineTo(160+i*42,200); ctx.stroke();
    }
    softGlow(160,152,120,'rgba(255,180,100,.10)');
  }

  function pendant(t,x,yoff){
    const fl=0.85+0.15*Math.sin(t/200+x);
    const sy=26+yoff;
    R(x,0,1,sy+2,'#120b07');                       // コード
    R(x-6,sy,12,2,'#221810');                       // 笠の口
    ctx.fillStyle='#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(x-7,sy+9); ctx.lineTo(x+7,sy+9); ctx.lineTo(x+4,sy+2); ctx.lineTo(x-4,sy+2); ctx.fill();
    R(x-1,sy+9,2,2,'#fff2cf');                       // 電球
    softGlow(x,sy+11,28,`rgba(255,200,120,${0.5*fl})`);
  }

  function intWindow(x,y,w,h,t){
    R(x-3,y-3,w+6,h+6,'#281a10'); R(x-2,y-2,w+4,h+4,'#3a2818');   // 枠
    const ng=ctx.createLinearGradient(0,y,0,y+h);
    ng.addColorStop(0,'#0c1024'); ng.addColorStop(1,'#1a2236');
    ctx.fillStyle=ng; ctx.fillRect(x,y,w,h);
    softGlow(x+w*0.7,y+h*0.45,10,'rgba(255,150,90,.22)');         // 外の灯り
    dot(x+8,y+10,'rgba(200,210,240,.5)');
    windowRain(x,y,w,h,t);
    R(x,(y+h/2)|0,w,1,'#281a10'); R((x+w/2)|0,y,1,h,'#281a10');   // 桟
    ctx.fillStyle='rgba(200,225,255,.06)';                        // ガラスの艶
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+w*0.4,y); ctx.lineTo(x,y+h*0.45); ctx.fill();
  }

  function windowRain(x,y,w,h,t){
    ctx.save();
    ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    ctx.strokeStyle='rgba(160,180,210,.35)'; ctx.lineWidth=1;
    for(let i=0;i<16;i++){
      const seed=i*53.7;
      const yy=y+(((t*0.05)+seed*7)%(h+10))-5;
      const xx=x+((seed*13)%w);
      ctx.beginPath(); ctx.moveTo(xx,yy); ctx.lineTo(xx-2,yy+5); ctx.stroke();
    }
    // ガラスを伝う雫
    for(let i=0;i<3;i++){
      const xx=x+8+i*((w-12)/2);
      const yy=y+(((t*0.02)+i*40)%(h-6));
      dot(xx,yy,'rgba(190,210,240,.6)'); dot(xx,yy+1,'rgba(190,210,240,.4)');
    }
    ctx.restore();
  }

  function shelves(x,y){
    for(let r=0;r<2;r++){
      const sy=y+r*16;
      R(x,sy+10,84,2,'#281a10');                                   // 棚板
      softGlow(x+42,sy+6,28,'rgba(255,180,100,.06)');
      for(let i=0;i<6;i++){
        const bx=x+6+i*13, c=['#7a5026','#9a6a30','#5a3d22','#caa06a'][(i+r)%4];
        const hh=6+(i%3)*2;
        R(bx,sy+10-hh,4,hh,c); R(bx+1,sy+10-hh,1,hh,'rgba(255,220,170,.3)');
      }
    }
  }

  function menuSign(x,y){
    R(x-2,y-2,40,24,'#281a10'); R(x,y,36,20,'#1c241f');
    ctx.save();
    ctx.font='7px "DotGothic16", monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(233,228,216,.9)';
    ctx.fillText('本日の',x+18,y+7); ctx.fillText('珈琲',x+18,y+15);
    ctx.restore();
  }

  // ── クマ：肘掛け椅子で読書 ──────────────────
  function bearChair(cx,by,t){
    const bob=Math.round(Math.sin(t/700));
    // 肘掛け椅子
    R(cx-2,by-30,26,30,'#5a2f2a'); R(cx-2,by-30,26,3,'#6e3a34');
    R(cx-5,by-18,5,18,'#4a2622'); R(cx+21,by-18,5,18,'#4a2622');
    R(cx-5,by-2,31,2,'#311816');
    // 体
    R(cx+4,by-22,14,16,C.bear); R(cx+4,by-22,14,2,C.bearDk);
    // 頭
    R(cx+5,by-32+bob,12,11,C.bear); R(cx+5,by-32+bob,12,2,C.bearDk);
    R(cx+4,by-34+bob,4,4,C.bear); R(cx+14,by-34+bob,4,4,C.bear);   // 耳
    R(cx+5,by-33+bob,1,1,C.bearDk); R(cx+15,by-33+bob,1,1,C.bearDk);
    dot(cx+8,by-27+bob,'#2a211b'); dot(cx+13,by-27+bob,'#2a211b'); // 目
    R(cx+10,by-25+bob,2,1,'#2a211b');                              // 鼻
    // 本
    R(cx+2,by-15,18,9,C.book); R(cx+11,by-15,1,9,C.bearDk);
    R(cx+4,by-13,5,1,'rgba(0,0,0,.15)'); R(cx+13,by-13,4,1,'rgba(0,0,0,.15)');
    R(cx+4,by-10,4,1,'rgba(0,0,0,.12)'); R(cx+13,by-10,3,1,'rgba(0,0,0,.12)');
    // 卓上ランプ
    R(cx+30,by-9,6,9,'#3a2718'); R(cx+32,by-13,2,4,'#ffd9a0');
    softGlow(cx+33,by-11,15,'rgba(255,190,110,.3)');
  }

  // ── ウサギ：椅子で珈琲 ──────────────────────
  function rabbitTable(cx,by,t){
    const sip=Math.max(0,Math.sin(t/1100));
    const lift=sip>0.6?-3:0;
    // 丸テーブル
    R(cx+13,by-13,22,3,'#4a3320'); R(cx+13,by-13,22,1,'#6a4a2c');
    R(cx+22,by-10,3,10,'#3a2718');
    R(cx+20,by-15,6,1,'#caa06a');                                  // 受け皿
    const s=(t/180)%6; dot(cx+23,by-19-s,'rgba(255,240,210,.5)');  // 湯気
    R(cx+22,by-18,4,3,C.cup); R(cx+22,by-18,4,1,C.warmHi);
    // 椅子の背
    R(cx-3,by-26,4,24,'#4a2622');
    // 体
    R(cx,by-20,12,14,C.rabbit); R(cx,by-20,4,14,C.rabbitDk);
    // 頭
    R(cx+1,by-30,10,10,C.rabbit); R(cx,by-30,3,10,C.rabbitDk);
    R(cx+2,by-38,3,9,C.rabbit); R(cx+6,by-38,3,9,C.rabbit);        // 耳
    R(cx+2,by-38,1,9,C.rabbitDk);
    dot(cx+4,by-25,'#2a211b'); dot(cx+8,by-25,'#2a211b');          // 目
    dot(cx+3,by-23,'#e8a0a8'); dot(cx+9,by-23,'#e8a0a8');          // ほっぺ
    // 持ち上げる腕＋カップ
    R(cx+8,by-16+lift,5,3,C.rabbit);
    R(cx+9,by-19+lift,4,4,C.cup); R(cx+9,by-19+lift,4,1,C.warmHi);
  }

  // ── 厨房カウンター＋ネコ（料理） ─────────────
  function kitchen(by,t){
    const cx0=176, cw=128;
    // ネコ（カウンター奥で料理。下半身はカウンターで隠れる）
    catCook(238,by-26,t);
    // カウンター天板
    R(cx0,by-26,cw,4,'#5a3d22'); R(cx0,by-26,cw,1,'#7a5630');
    // 前面
    const pg=ctx.createLinearGradient(0,by-22,0,by);
    pg.addColorStop(0,'#3a2718'); pg.addColorStop(1,'#211610');
    ctx.fillStyle=pg; ctx.fillRect(cx0,by-22,cw,22);
    for(let px=cx0+8;px<cx0+cw;px+=14) R(px,by-22,1,22,'rgba(18,11,7,.5)');
    // サイフォン珈琲
    R(cx0+12,by-33,6,7,'#caa06a'); R(cx0+13,by-31,4,4,'#6a3018');
    softGlow(cx0+15,by-30,8,'rgba(255,150,90,.2)');
    // カウンターの小皿
    R(cx0+30,by-28,7,2,'#d8cdb6');
  }

  function catCook(cx,wy,t){
    const stir=Math.sin(t/240);
    R(cx,wy-14,14,14,C.cat); R(cx,wy-14,14,2,C.catDk);             // 体
    R(cx+2,wy-9,10,9,'#e9e4d8'); R(cx+2,wy-9,10,1,'#fff');         // 前掛け
    R(cx+2,wy-24,11,11,C.cat); R(cx+2,wy-24,11,2,C.catDk);         // 頭
    R(cx+1,wy-27,4,4,C.cat); R(cx+10,wy-27,4,4,C.cat);             // 耳
    R(cx+2,wy-26,2,2,C.catDk); R(cx+11,wy-26,2,2,C.catDk);
    R(cx+1,wy-25,12,2,'#c44e57');                                 // 鉢巻
    dot(cx+5,wy-19,'#2a211b'); dot(cx+9,wy-19,'#2a211b');         // 目
    R(cx+6,wy-17,2,1,'#bf6f24');                                  // 鼻
    // かき混ぜる腕＋鍋＋湯気
    R(cx+12,wy-10+Math.round(stir),5,3,C.cat);
    R(cx+15,wy-8,7,3,'#322a32'); R(cx+15,wy-9,7,1,'#5a606e');
    R(cx+21,wy-9,3,2,'#221a26');
    const s=(t/140)%8;
    dot(cx+17,wy-12-s,'rgba(255,245,225,.5)');
    dot(cx+19,wy-14-((s+4)%8),'rgba(255,245,225,.35)');
  }

  // ── 汎用：ぼかし光 ─────────────────────────
  function softGlow(x,y,r,col){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,col); g.addColorStop(1, col.replace(/[\d.]+\)$/,'0)'));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  // hex/rgba 文字列 + alpha → rgba()
  function rgba(c,a){
    if(c.startsWith('#')){
      const n=parseInt(c.slice(1),16), r=(n>>16)&255,g=(n>>8)&255,b=n&255;
      return `rgba(${r},${g},${b},${a})`;
    }
    return c.replace(/[\d.]+\)$/, a+')');
  }

  // フォント読込後に描画開始（ネオン文字のため）
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>window.ShigureScene.start());
  }
  window.ShigureScene.start(); // 念のため即時にも開始
})();
