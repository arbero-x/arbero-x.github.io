// 帯（obi）をデータから canvas に描く。元データがないため画像ではなくコードで生成する

const OBI_FONT = '"M PLUS 1p","Hiragino Sans","Yu Gothic",sans-serif';
const SMALL_KANA = 'ァィゥェォッャュョヮぁぃぅぇぉっゃゅょ';
const ROTATE_IN_VERTICAL = 'ー／/～—';

const tokenize = text => text.match(/[0-9A-Za-z]+|./gu);

// 縦書き：英数字は縦中横、長音とスラッシュは90°回転、小書きかなは右上に寄せる
function drawVertical(g, text, cx, top, size, color) {
  g.save();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let y = top + size / 2;
  for (const t of tokenize(text)) {
    if (/^[0-9A-Za-z]+$/.test(t)) {
      g.font = `800 ${size * 0.62}px ${OBI_FONT}`;
      g.fillText(t, cx, y, size * 0.95);
    } else if (ROTATE_IN_VERTICAL.includes(t)) {
      g.save();
      g.translate(cx, y);
      g.rotate(Math.PI / 2);
      g.font = `800 ${size}px ${OBI_FONT}`;
      g.fillText(t, 0, 0);
      g.restore();
    } else {
      g.font = `800 ${size}px ${OBI_FONT}`;
      const small = SMALL_KANA.includes(t);
      g.fillText(t, cx + (small ? size * 0.12 : 0), y - (small ? size * 0.12 : 0));
    }
    y += size * 1.02;
  }
  g.restore();
}
const verticalLength = (text, size) => tokenize(text).length * size * 1.02;

function tint(img, color) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function paperGrain(g, w, h) {
  for (let i = 0; i < (w * h) / 90; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  }
  const v = g.createLinearGradient(0, 0, w, 0);
  v.addColorStop(0, 'rgba(0,0,0,.06)');
  v.addColorStop(0.15, 'rgba(0,0,0,0)');
  v.addColorStop(0.85, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.05)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}

function makeCanvas(w, h, o) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = o.bg;
  g.fillRect(0, 0, w, h);
  if (o.paper) paperGrain(g, w, h);
  return [c, g];
}

// 表面：416 × 2000px（ケースの高さ 12.5 に対して幅 2.6）
function drawObiFront(o, sig) {
  const w = 416, h = 2000;
  const [c, g] = makeCanvas(w, h, o);

  // 品番
  let y = 44;
  if (o.paper) {
    g.strokeStyle = o.ink;
    g.lineWidth = 4;
    g.strokeRect(70, y, w - 140, 80);
    g.fillStyle = o.ink;
  } else {
    g.fillStyle = '#fff';
    g.fillRect(56, y, w - 112, 86);
    g.fillStyle = o.bg;
  }
  g.font = `800 50px ${OBI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(o.catNo, w / 2, y + 43);
  y += 96;
  if (o.stereo) {
    g.fillStyle = o.ink;
    g.fillRect(70, y, w - 140, 50);
    g.fillStyle = o.bg;
    g.font = `800 34px ${OBI_FONT}`;
    g.fillText('STEREO', w / 2, y + 26);
    y += 50;
  }

  // 縦書き 2 列（タイトル・キャッチ）
  const top = y + 50, area = 1180 - top;
  const titleSize = Math.min(118, area / (tokenize(o.title).length * 1.02));
  const catchSize = Math.min(70, area / (tokenize(o.catch).length * 1.02));
  const titleX = o.catchSide === 'left' ? 272 : 160;
  const catchX = o.catchSide === 'left' ? 104 : 318;
  g.fillStyle = o.catchBg;
  g.fillRect(catchX - catchSize * 0.66, top - 18, catchSize * 1.32, verticalLength(o.catch, catchSize) + 36);
  drawVertical(g, o.catch, catchX, top, catchSize, o.catchInk);
  drawVertical(g, o.title, titleX, top, titleSize, o.ink);

  // ひとこと
  y = 1250;
  g.fillStyle = o.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 38px ${OBI_FONT}`;
  o.copy.forEach((line, i) => g.fillText(line, w / 2, y + i * 52));

  // 下部（価格・仕様・サイン）
  y = 1400;
  if (o.panelBg) {
    g.fillStyle = o.panelBg;
    g.fillRect(28, y, w - 56, h - y - 28);
  } else {
    g.fillStyle = o.ink;
    g.fillRect(40, y - 4, w - 80, 3);
  }
  y += 44;
  g.fillStyle = o.priceInk;
  g.textAlign = 'left';
  g.font = `800 50px ${OBI_FONT}`;
  g.fillText('定価 ¥210', 56, y + 20);
  if (o.taxNote) {
    g.font = `700 28px ${OBI_FONT}`;
    g.fillText(o.taxNote, 290, y + 26);
  }
  y += 100;
  g.fillStyle = o.panelBg ? '#141414' : o.ink;
  g.font = `800 38px ${OBI_FONT}`;
  ['DIGITAL SINGLE', 'WAV MASTER', '2026'].forEach((t, i) => g.fillText(t, 56, y + i * 54, w - 100));
  const sw = w - 120, sh = (sw * sig.height) / sig.width;
  g.drawImage(tint(sig, o.sigColor), 60, h - sh - 70, sw, sh);
  return c;
}

// 背：80 × 2000px（ケースの厚さ ≒ 0.92）
function drawObiSpine(o) {
  const w = 80, h = 2000;
  const [c, g] = makeCanvas(w, h, o);
  drawVertical(g, o.title, w / 2, 120, 50, o.ink);
  g.save();
  g.translate(w / 2, h - 200);
  g.rotate(Math.PI / 2);
  g.fillStyle = o.ink;
  g.font = `800 38px ${OBI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(o.catNo, 0, 0);
  g.restore();
  return c;
}

// 裏：416 × 2000px
function drawObiBack(o) {
  const w = 416, h = 2000;
  const [c, g] = makeCanvas(w, h, o);
  g.fillStyle = o.ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `800 44px ${OBI_FONT}`;
  g.fillText('arbero', w / 2, 140);
  g.font = `700 32px ${OBI_FONT}`;
  g.fillText(o.catNo, w / 2, 200);
  return c;
}

// 帯に使う日本語の字形だけを先に読み込む（Google Fonts は文字ごとに分割配信されるため）
export async function loadObiFonts(releases) {
  const text = releases.map(r => r.obi.title + r.obi.catch + r.obi.copy.join('') + r.obi.catNo).join('') + '定価¥(税込)STEREO arbero DIGITAL SINGLE WAV MASTER 2026';
  await Promise.race([
    Promise.all([
      document.fonts.load(`800 60px "M PLUS 1p"`, text),
      document.fonts.load(`700 40px "M PLUS 1p"`, text),
    ]),
    new Promise(res => setTimeout(res, 2500)),
  ]);
}

export function drawObi(o, sig) {
  return { front: drawObiFront(o, sig), spine: drawObiSpine(o), back: drawObiBack(o) };
}
