// 隠し要素：フッターのサインを 3 回タップすると、グラフィティを ASCII 文字で吹き付ける。
// 呼ばれたときに初めて読み込まれる（普段の表示には影響しない）

// 画素の種類：0 なし, 1 塗り（銀）, 2 フチ（白）, 3 ピンクの影, 4 緑の影
const NONE = 0, FILLED = 1, EDGE = 2, PINK = 3, TEAL = 4;
const COLORS = { ink: '#23262c', fill: '#a4abb4', shine: '#5d7a99', pink: '#e4007f', teal: '#00a678' };

let source = null; // 画像の解析結果は一度だけ作る

async function loadSource() {
  if (source) return source;
  const img = new Image();
  img.src = '/fx.webp';
  await img.decode();
  const c = document.createElement('canvas');
  const w = (c.width = img.naturalWidth), h = (c.height = img.naturalHeight);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const kind = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4], gr = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < 128) continue;
    if (r > 150 && gr < 90) kind[i] = PINK;
    else if (gr > 110 && r < 90) kind[i] = TEAL;
    else if (Math.min(r, gr, b) > 218) kind[i] = EDGE;
    else kind[i] = FILLED;
  }
  source = { w, h, kind };
  return source;
}

// フチの線の向き：マスのまわり（2 マス分）にあるフチの点の並び方から、線が走る向きを出す
function edgeChar(src, c, r, sx, sy) {
  let n = 0, mx = 0, my = 0, xx = 0, yy = 0, xy = 0;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const px = (c - 0.5 + (i + 0.5) / 4) * sx, py = (r - 0.5 + (j + 0.5) / 4) * sy;
    if (px < 0 || py < 0 || px >= src.w || py >= src.h) continue;
    if (src.kind[(py | 0) * src.w + (px | 0)] !== EDGE) continue;
    n++; mx += px; my += py; xx += px * px; yy += py * py; xy += px * py;
  }
  if (n < 4) return '+';
  mx /= n; my /= n;
  const a = xx / n - mx * mx, b = xy / n - mx * my, d = yy / n - my * my;
  // 点の広がりが一番大きい向き（主軸）が線の向き。画面は y が下向き
  const deg = ((0.5 * Math.atan2(2 * b, a - d) * 180) / Math.PI + 180) % 180;
  if (deg < 22.5 || deg >= 157.5) return '-';
  if (deg < 67.5) return '\\';
  if (deg < 112.5) return '|';
  return '/';
}

// 1 マスの中を 4 × 4 点で調べて、マスごとの種類と文字を決める
function classify(src, cols, rows) {
  const kind = new Uint8Array(cols * rows);
  const chars = new Array(cols * rows).fill(' ');
  const sx = src.w / cols, sy = src.h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const n = [0, 0, 0, 0, 0];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const px = Math.min(src.w - 1, ((c + (i + 0.5) / 4) * sx) | 0);
      const py = Math.min(src.h - 1, ((r + (j + 0.5) / 4) * sy) | 0);
      n[src.kind[py * src.w + px]]++;
    }
    let k = NONE;
    if (n[EDGE] >= 2) k = EDGE; // フチは細いので、少しでもかかれば優先
    else if (16 - n[NONE] >= 6) k = [FILLED, PINK, TEAL].reduce((a, b) => (n[b] > n[a] ? b : a));
    const i = r * cols + c;
    kind[i] = k;
    if (k === EDGE) chars[i] = edgeChar(src, c, r, sx, sy);
    else if (k === PINK || k === TEAL) chars[i] = n[k] > 11 ? '#' : '=';
  }
  return { kind, chars };
}

export async function show({ reduceMotion, returnFocus }) {
  if (document.querySelector('.fx-layer')) return;
  const src = await loadSource();

  const overlay = document.createElement('div');
  overlay.className = 'fx-layer';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'arbero のグラフィティ（タップか Esc で閉じる）');
  overlay.tabIndex = -1;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const note = document.createElement('p');
  note.className = 'fx-note';
  note.textContent = 'タップで閉じる';
  overlay.append(canvas, note);
  document.body.appendChild(overlay);
  document.documentElement.classList.add('fx-open');
  overlay.focus();

  const ctx = canvas.getContext('2d');
  const font = getComputedStyle(document.documentElement).getPropertyValue('--f-mono');
  let W, H, cw, ch, cols, rows, ox, oy, cells, order;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fontPx = W < 520 ? 7 : 10;
    ctx.font = `${fontPx}px ${font}`;
    cw = ctx.measureText('M').width; ch = fontPx * 1.1;
    // ロゴを画面幅の 9 割に。縦横比は文字の縦長さを考えて合わせる
    const targetW = Math.min(W * 0.9, (H - 80) * (src.w / src.h));
    cols = Math.floor(targetW / cw);
    rows = Math.round((cols * cw * (src.h / src.w)) / ch);
    ox = (W - cols * cw) / 2; oy = (H - rows * ch) / 2;
    cells = classify(src, cols, rows);
    // 吹き付ける順番：左から右へ、少しばらつかせる
    order = Float32Array.from({ length: cols * rows }, (_, i) => ((i % cols) / cols) * 0.85 + Math.random() * 0.15);
  }

  let start = performance.now(), raf = 0;
  function render(t) {
    const age = (t - start) / 1000;
    const spray = reduceMotion ? 1 : Math.min(1, age / 1.4);  // 吹き付けの進み具合
    const sweep = ((age - 1.4) % 4.5) / 1.6;                  // 光の帯が横切る位置（0 → 1）
    const twitch = !reduceMotion && age > 2 && Math.sin(age * 2.1) > 0.985 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    for (let r = 0; r < rows; r++) {
      let run = '', runCol = null, runStart = 0;
      const flush = () => { if (runCol && run.trim()) { ctx.fillStyle = runCol; ctx.fillText(run, ox + runStart * cw, oy + r * ch); } };
      // ぴくっと動くときは、ところどころの行だけ横にずらす
      const slide = twitch && (r * 7 + ((t / 90) | 0)) % 11 === 0 ? twitch * 2 : 0;
      for (let c0 = 0; c0 < cols; c0++) {
        const c = Math.min(cols - 1, Math.max(0, c0 - slide));
        const i = r * cols + c;
        let k = cells.kind[i], chr = cells.chars[i], col = null;
        if (k && order[i] > spray) { k = NONE; chr = ' '; }
        else if (k && order[i] > spray - 0.04 && spray < 1) { chr = '.'; col = COLORS.fill; } // 吹き付けの先端は霧のような点
        if (k === FILLED && !col) {
          // 銀の塗りは静かな点。斜めに横切る光の帯だけ、映り込みの線にする
          const band = Math.exp(-((c / cols + (r / rows) * 0.35 - sweep * 1.5 + 0.2) ** 2) / 0.003);
          chr = band > 0.6 ? '/' : band > 0.25 ? ':' : (r + c) % 2 ? '.' : ':';
          col = band > 0.25 ? COLORS.shine : COLORS.fill;
        } else if (k === EDGE && !col) col = COLORS.ink;
        else if (k === PINK && !col) col = COLORS.pink;
        else if (k === TEAL && !col) col = COLORS.teal;
        if (col !== runCol) { flush(); run = ''; runStart = c0; runCol = col; }
        run += chr;
      }
      flush();
    }
  }
  function frame(t) {
    render(t);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.documentElement.classList.remove('fx-open');
    returnFocus?.focus?.();
  }
  const onResize = () => { resize(); render(performance.now()); };
  const onKey = ev => { if (ev.key === 'Escape') close(); };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  addEventListener('resize', onResize);

  await (document.fonts ? document.fonts.ready : Promise.resolve());
  resize();
  start = performance.now();
  if (reduceMotion) render(start); else raf = requestAnimationFrame(frame);
}
