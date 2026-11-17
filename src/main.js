import './style.css';
import releases from './data/releases.json';

// トップページ：ドット絵の arbero を操作してフィールドを歩くゲーム（Canvas 2D、外部画像なし）。
// 見た目と挙動は arbero-net-prototype.html が元。LIST からはゲームを遊ばなくても全リリースとリンクを見られる

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);

const T = 16;
// 文字＝部屋（c:CREATIVE  s:スタート  p:Penguin  m:ProMotion  v:テレビ）／記号＝オブジェクト
// 1/2/3：CD（releases.json の 1〜3 曲目）  T：端末  S：スタート位置  M：ポスト  N：ノート  U：スピーカー  D：Discord の扉  V：テレビ
const RAW = [
  '', '', '',
  '...ccccccc',
  '...ccc1ccc',
  '...ccccccc',
  '......c',
  '......c',
  '......c.........ppppppp',
  '...sssssss......ppppppp',
  '...sTsSsssppppppppp2ppp',
  '...sssssss......ppppppp',
  '...MsNsUsD......ppppppp',
  '......m',
  '......m',
  '...mmmmmmm',
  '...mmm3mmm',
  '...mmmmmmm',
  '...mmmmmmm',
  '......v',
  '......v',
  '....vvvvv',
  '....vvVvv',
  '....vvvvv',
  '', '', '', '', '',
];
const W = Math.max(...RAW.map(r => r.length)) + 3;
const MAP = RAW.map(r => r.padEnd(W, '.'));
const H = MAP.length;
const at = (tx, ty) => (MAP[ty] && MAP[ty][tx]) || '.';
const walk = c => c !== '.';
const ZONE_OF = { 1: 'c', 2: 'p', 3: 'm', T: 's', S: 's', V: 'v', M: 's', N: 's', U: 's', D: 's' };
const zoneOf = c => ZONE_OF[c] || c;
// 部屋ごとの配色
const TH = {
  s: { a: '#1b1b1f', b: '#202026', dot: '#2e2e35', edge: '#f4f4f4', side: '#8a8a90', side2: '#3a3a40', bg: [0, 0, 0], pt: '#3a3a42', pb: '#f4f4f4', acc: '#f4f4f4' },
  c: { a: '#0b0b0b', b: '#131313', dot: '#3a3300', edge: '#ffe600', side: 'stripe', side2: '#000', bg: [14, 12, 0], pt: '#4a4200', pb: '#ffe600', acc: '#ffe600' },
  p: { a: '#bfe6ff', b: '#b2defb', dot: '#e6f5ff', edge: '#ffffff', side: '#6fb6e0', side2: '#3a7fae', bg: [6, 22, 36], pt: '#3a6f90', pb: '#ffffff', acc: '#9fd3ff' },
  m: { a: '#050505', b: '#0c0c0c', dot: '#2c2c2c', edge: '#3dff5a', side: '#1c7a2e', side2: '#0a3312', bg: [0, 0, 0], pt: '#145a22', pb: '#3dff5a', acc: '#3dff5a' },
  v: { a: '#0e0e10', b: '#121215', dot: '#1e1e22', edge: '#4a4a52', side: '#2a2a30', side2: '#151518', bg: [0, 0, 0], pt: '#1c1c20', pb: '#55555c', acc: '#8a8a90' },
};
const solidCh = c => c === '.' || '123TVMNUD'.includes(c);

// ---------- 中身 ----------
const L = {
  mm: ['マシュマロ', 'https://marshmallow-qa.com/albero_niveo?t=IONPa5&utm_medium=url_text&utm_source=promotion'],
  sc: ['SoundCloud', 'https://soundcloud.com/arbero_x'],
  nt: ['note', 'https://note.com/arbero_x'],
  yt: ['YouTube', 'https://www.youtube.com/@arbero_x'],
  bc: ['Bandcamp', 'https://arbero.bandcamp.com/'],
  x: ['X', 'https://x.com/arbero_x'],
};
// CD：ゲームでの表記と色。曲の情報と Bandcamp の URL は releases.json から取る
const CD = {
  1: { i: 0, title: 'CREATIVE', sub: 'クリエイティブ', col: '#ffe600' },
  2: { i: 1, title: 'Penguin', sub: 'ペンギン', col: '#9fd3ff' },
  3: { i: 2, title: 'ProMotion', sub: 'プロモーション', col: '#3dff5a' },
};
const INFO = {
  M: { no: 'MAILBOX', title: 'マシュマロ', sub: '匿名でメッセージを送れます', text: '（下のボタンから開く）', links: [L.mm], col: '#f4f4f4' },
  U: { no: 'SPEAKER', title: 'SoundCloud', sub: '', text: '（下のボタンから開く）', links: [L.sc], col: '#f4f4f4' },
  N: { no: 'NOTEBOOK', title: 'note', sub: '', text: '（下のボタンから開く）', links: [L.nt], col: '#f4f4f4' },
  T: { no: 'TERMINAL', title: 'arbero NET AREA', sub: 'EXPERIMENTAL HIPHOP VTUBER', text: 'ようこそ。\n回っているCDに近づいて、調べてみて。', links: [L.x, L.yt, L.bc], col: '#f4f4f4' },
};
const OBJ_URL = { M: L.mm[1], U: L.sc[1], N: L.nt[1] };
for (const [k, c] of Object.entries(CD)) {
  const r = releases[c.i];
  if (!r) continue;
  const links = [];
  if (r.youtubeId) links.push(['YouTube', `https://www.youtube.com/watch?v=${encodeURIComponent(r.youtubeId)}`]);
  links.push(['Bandcamp', r.bandcampUrl]);
  INFO[k] = { no: `${r.catNo} / ${r.date} RELEASE`, title: c.title, sub: c.sub, text: `${r.blurb}\n（下のボタンからBandcampへ）`, links, col: c.col };
  OBJ_URL[k] = r.bandcampUrl;
}
const LABEL = { T: 'TERMINAL', V: '???', M: 'MARSHMALLOW', U: 'SOUNDCLOUD', N: 'NOTE', D: 'DISCORD' };
const TV_SCRIPT = ['よく見つけたね！', 'わざわざ見に来てくれてありがとね！', '（実はセリフはこれで終わりです）'];
const TV_LOOP = ['・・・', '暇なんですか？'];
let tvOn = false, tvSeen = false;

// スタート部屋の床のタギング（サイン）。3 回続けて押すと隠し要素が出る。ここだけ画面の解像度で描く
const SIGN = { x: 7 * T, y: 9 * T + 5, w: 48, h: 20 };
const signImg = new Image();
addEventListener('load', () => { signImg.src = '/signature-tag.webp'; }, { once: true });

// オブジェクトとスタート位置
const objs = [];
let px = 0, py = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = at(x, y);
  if ('123TVMNUD'.includes(c)) objs.push({ k: c, x: x * T + 8, y: y * T + 10, ph: Math.random() * 6 });
  if (c === 'S') { px = x * T + 8; py = y * T + 12; }
}

// ---------- スプライト ----------
const PAL = { k: '#16161c', s: '#f3d3c0', b: '#3b8cff', g: '#8d929c', j: '#23232c', p: '#3dff5a', d: '#2e2e3a', h: '#0b0b0b' };
const body = [
  '...gggggg...',
  '..jjggggjj..',
  '.jjjggggjjj.',
  '.jpjggggjjj.',
  '.sjjggggjjs.',
  '..jjjjjjjj..'];
const headD = ['....kkkk....', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkkkkkkkkk.', '.kksssssskk.', '.ksbssssbsk.', '.ksbssssbsk.', '..ssssssss..'];
const headU = ['....kkkk....', '..kkkkkkkk..', '.kkkkkkkkkk.', '.kkkkkkkkkk.', '.kkkkkkkkkk.', '.kkkkkkkkkk.', '.kkkkkkkkkk.', '..kkkkkkkk..'];
const bodyU = body.map((r, i) => (i === 3 ? '.jjjggggjjj.' : r));
const side = ['....kkkk....', '..kkkkkkk...', '.kkkkkkkkk..', '.kkkkkkkkkk.', '.kkkkssssk..', '.kkksssbs...', '.kkkssssss..', '..kksssss...',
  '...gggggg...', '...jjgggj...', '..jjjgggj...', '..jjpgggj...', '..jjjggsj...', '...jjjjjj...'];
const LEG = { f0: ['...dd..dd...', '...hh..dd...'], f1: ['...dd..dd...', '...dd..hh...'], s0: ['....dddd....', '....hhhh....'], s1: ['...dd...dd..', '...hh...hh..'], st: ['...dd..dd...', '...hh..hh...'], ss: ['....dd.dd...', '....hh.hh...'] };
function mk(rows) {
  const c = document.createElement('canvas');
  c.width = 14; c.height = rows.length + 2;
  const x = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = '#000'; x.fillRect(i, y, 3, 3); } }));
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i + 1, y + 1, 1, 1); } }));
  return c;
}
const SPR = {
  down: [mk([...headD, ...body, ...LEG.st]), mk([...headD, ...body, ...LEG.f0]), mk([...headD, ...body, ...LEG.f1])],
  up: [mk([...headU, ...bodyU, ...LEG.st]), mk([...headU, ...bodyU, ...LEG.f0]), mk([...headU, ...bodyU, ...LEG.f1])],
  side: [mk([...side, ...LEG.ss]), mk([...side, ...LEG.s0]), mk([...side, ...LEG.s1])],
};

// ---------- canvas ----------
// ドット絵は低い解像度の 2 枚（床 / 物と人）に描き、画面の canvas に拡大して重ねる。
// その間に、床のタギングだけを画面の解像度で描く（ドット絵の粗さはそのまま、サインだけ細かく）
const cv = $('field'), out = cv.getContext('2d');
const layer = () => { const c = document.createElement('canvas'); return { c, g: c.getContext('2d') }; };
const floorL = layer(), topL = layer();
let ctx = floorL.g;
let S = 2, VW = 0, VH = 0, K = 2, camX = 0, camY = 0;
function resize() {
  S = Math.max(2, Math.floor(Math.min(innerWidth, innerHeight) / 200));
  VW = Math.ceil(innerWidth / S); VH = Math.ceil(innerHeight / S);
  K = S * Math.min(devicePixelRatio || 1, 2); // 1 ドットが画面の canvas で何画素か
  for (const l of [floorL, topL]) { l.c.width = VW; l.c.height = VH; l.g.imageSmoothingEnabled = false; }
  cv.width = Math.round(VW * K); cv.height = Math.round(VH * K);
  cv.style.width = `${VW * S}px`; cv.style.height = `${VH * S}px`;
}
addEventListener('resize', resize);
resize();

const stars = Array.from({ length: 140 }, () => ({ x: Math.random() * 800, y: Math.random() * 600, z: 0.2 + Math.random() * 0.6, b: Math.random() < 0.15 }));

// ---------- 入力 ----------
const keys = {};
const clearKeys = () => { for (const k in keys) keys[k] = false; };
let listOpen = false;
// LIST・ダイヤルロック・隠し要素が開いている間は、ゲームの操作を止めてそちらにキーを渡す
const overlayOpen = () => listOpen || !!document.querySelector('dialog[open], .fx-layer');
const KM = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
addEventListener('keydown', e => {
  if (overlayOpen()) { clearKeys(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (KM[e.code]) { keys[KM[e.code]] = true; e.preventDefault(); }
  if (['KeyZ', 'Enter', 'Space'].includes(e.code)) {
    // フォーカスのあるリンクやボタンは、Enter / Space でそれ自体を押せるようにする
    if (e.code !== 'KeyZ' && e.target.closest?.('a, button')) return;
    e.preventDefault();
    if (!e.repeat) action();
  }
  if (e.code === 'Escape') closeDlg();
});
addEventListener('keyup', e => { if (KM[e.code]) keys[KM[e.code]] = false; });
addEventListener('blur', clearKeys);
addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });
if (matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k, on = e => { e.preventDefault(); keys[k] = true; }, off = () => { keys[k] = false; };
  b.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, off));
});
$('abtn').addEventListener('pointerdown', e => { e.preventDefault(); action(); });

// ---------- ダイアログ ----------
const dlg = $('dlg'), dText = $('dText'), dLinks = $('links');
const elT = $('dTitle'), elS = $('dSub'), elN = $('dNo');
let open = false, full = '', typed = 0, tAcc = 0;
let q = [], qi = 0, loopQ = null, li = 0, mode = 'info';
let skipOnMove = false; // 最初の会話だけ、移動キーで閉じてそのまま歩き出せる
function startType(txt) { full = txt; typed = 0; tAcc = 0; dText.textContent = ''; }
function openDlg(k) {
  const d = INFO[k];
  open = true; mode = 'info'; q = []; loopQ = null; skipOnMove = false;
  elN.textContent = d.no; elT.style.display = ''; elS.style.display = '';
  elT.textContent = d.title; elT.style.color = d.col; elS.textContent = d.sub;
  startType(d.text);
  dLinks.replaceChildren(); dLinks.style.visibility = 'hidden';
  for (const [label, href] of d.links) {
    const a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label;
    dLinks.appendChild(a);
  }
  dlg.style.display = 'block';
}
// セリフ用：lines を順に出し、loop があれば無限に繰り返す
function talk(name, lines, loop, { skippable = false } = {}) {
  open = true; mode = 'talk'; q = lines; qi = 0; loopQ = loop || null; li = 0; skipOnMove = skippable;
  elN.textContent = name; elT.style.display = 'none'; elS.style.display = 'none';
  dLinks.replaceChildren(); dLinks.style.visibility = 'hidden';
  dlg.style.display = 'block';
  startType(q.length ? q[0] : loopQ[0]);
  if (!q.length) li = 1;
}
function advance() {
  if (typed < full.length) { typed = full.length; dText.textContent = full; return; }
  if (mode === 'talk') {
    if (qi < q.length - 1) { qi++; startType(q[qi]); return; }
    if (loopQ) {
      if (qi === q.length - 1 && q.length) { qi = q.length; li = 0; }
      startType(loopQ[li % loopQ.length]); li++;
      return;
    }
  }
  closeDlg();
}
function closeDlg() { open = false; dlg.style.display = 'none'; }
$('dlgClose').addEventListener('click', e => { closeDlg(); if (e.detail) e.currentTarget.blur(); });

let near = null;
function action() {
  if (open) { advance(); return; }
  if (!near) {
    if (onSign()) tapSign();
    return;
  }
  const k = near.k;
  const url = OBJ_URL[k];
  if (url) {
    const w = window.open(url, '_blank');
    if (w) { try { w.opener = null; } catch { /* 無視 */ } } else openDlg(k); // ポップアップが止められたら案内を出す
    return;
  }
  if (k === 'D') { openDialLock(null); return; }
  if (k === 'V') {
    tvOn = true;
    if (!tvSeen) { tvSeen = true; talk('BROKEN TV', TV_SCRIPT, TV_LOOP); } else talk('BROKEN TV', [], TV_LOOP);
    return;
  }
  openDlg(k);
}

// ---------- 隠し要素：床のサインを 3 回続けて押す（タップ / クリック、または上に立って A）と、グラフィティを吹き付ける ----------
let signTaps = [];
function tapSign() {
  const now = performance.now();
  signTaps = signTaps.filter(t => now - t < 1200);
  signTaps.push(now);
  if (signTaps.length < 3) return;
  signTaps = [];
  clearKeys();
  import('./graffitiEgg.js')
    .then(m => m.show({ reduceMotion, returnFocus: document.activeElement }))
    .catch(e => console.warn('読み込みに失敗しました', e));
}
const inSign = (x, y, pad) => x >= SIGN.x - pad && x <= SIGN.x + SIGN.w + pad && y >= SIGN.y - pad && y <= SIGN.y + SIGN.h + pad;
const onSign = () => inSign(P.x, P.y - 2, 4);
cv.addEventListener('click', e => {
  if (open) return;
  const r = cv.getBoundingClientRect();
  const wx = (e.clientX - r.left) * (VW / r.width) + camX, wy = (e.clientY - r.top) * (VH / r.height) + camY;
  if (inSign(wx, wy, 2)) tapSign();
});

// ---------- Discord：ダイヤルロックで番号が合ったら招待リンクを出す ----------
function openDialLock(returnFocus) {
  clearKeys();
  import('./dialLock.js')
    .then(m => m.openDialLock({ reduceMotion, returnFocus }))
    .catch(e => console.warn('ダイヤルロックを開けませんでした', e));
}
$('discordLink').addEventListener('click', ev => {
  ev.preventDefault();
  openDialLock(ev.currentTarget);
});

// ---------- LIST ----------
const list = $('list'), listBtn = $('listBtn'), listClose = $('listClose');
let listBuilt = false;
listBtn.addEventListener('click', () => {
  if (!listBuilt) { buildList(); listBuilt = true; }
  closeDlg(); clearKeys();
  listOpen = true;
  list.hidden = false;
  document.body.classList.add('list-open');
  list.scrollTop = 0;
  list.tabIndex = -1;
  list.focus({ preventScroll: true });
});
listClose.addEventListener('click', e => {
  listOpen = false;
  list.hidden = true;
  document.body.classList.remove('list-open');
  if (e.detail) document.activeElement?.blur(); else listBtn.focus();
});
addEventListener('keydown', e => { if (listOpen && e.key === 'Escape' && !document.querySelector('dialog[open], .fx-layer')) listClose.click(); });

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
// 発売前で Bandcamp / YouTube がまだない曲は、プレイヤーの代わりに COMING SOON を出す
const pendingNote = () => el('p', 'pending', 'COMING SOON');

function player(r) {
  const box = el('div', 'rel-player');
  if (!r.bandcampTrackId) { box.appendChild(pendingNote()); return box; }
  const track = encodeURIComponent(r.bandcampTrackId), link = encodeURIComponent(r.bandcampLinkColor);
  const f = document.createElement('iframe');
  f.title = `${r.title} by arbero（Bandcamp 試聴プレイヤー）`;
  f.src = `https://bandcamp.com/EmbeddedPlayer/track=${track}/size=large/bgcol=000000/linkcol=${link}/tracklist=false/artwork=small/transparent=true/`;
  f.loading = 'lazy';
  f.setAttribute('seamless', '');
  const a = el('a', null, `${r.title} by arbero`);
  a.href = r.bandcampUrl;
  f.appendChild(a);
  box.appendChild(f);
  return box;
}

// YouTube MV：タップするまでサムネイルだけ表示
function mv(r) {
  const box = el('div', 'mv');
  if (!r.youtubeId) { box.className = ''; box.appendChild(pendingNote()); return box; }
  const id = encodeURIComponent(r.youtubeId);
  const b = el('button', 'mv-thumb');
  b.type = 'button';
  b.setAttribute('aria-label', `${r.title} の MV を再生`);
  const img = el('img');
  img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  img.alt = '';
  img.loading = 'lazy';
  // 動画が公開前だと YouTube は 120×90 の灰色の画像を返すので、その間はジャケット画像を出す
  img.addEventListener('load', () => {
    if (img.naturalWidth > 120 || img.classList.contains('is-cover')) return;
    img.classList.add('is-cover');
    img.src = r.cover;
  });
  const yt = el('span', 'yt');
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 10 12');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M0 0l10 6-10 6z');
  svg.appendChild(path);
  yt.appendChild(svg);
  b.append(img, yt, el('span', 'mv-label', `${r.title} — Music Video`));
  b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
    f.title = `${r.title} — Music Video`;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    box.replaceChildren(f);
  });
  box.appendChild(b);
  return box;
}

// 開いたときに初めて組み立てる（ジャケット画像やプレイヤーは最初の読み込みに含めない）
function buildList() {
  const box = $('releases');
  for (const r of releases) {
    const art = el('article');
    const head = el('div', 'rel-head');
    const cover = el('a');
    cover.href = r.bandcampUrl; cover.target = '_blank'; cover.rel = 'noopener';
    cover.setAttribute('aria-label', `${r.title} を Bandcamp で聴く`);
    const img = el('img');
    img.src = r.cover; img.alt = ''; img.width = 96; img.height = 96; img.loading = 'lazy'; img.decoding = 'async';
    cover.appendChild(img);
    const txt = el('div');
    txt.append(el('div', 'meta', `${r.catNo} / ${r.date} RELEASE`), el('h2', null, r.title), el('p', null, r.blurb));
    head.append(cover, txt);
    art.append(head, player(r), mv(r));
    box.appendChild(art);
  }
}

// ---------- プレイヤー ----------
let zone = 's';
const bgc = [0, 0, 0];
const P = { x: px, y: py, dir: 'down', flip: false, anim: 0, moving: false };
function blocked(x, y) {
  for (const [ox, oy] of [[-4, -4], [4, -4], [-4, 0], [4, 0]]) {
    if (solidCh(at(Math.floor((x + ox) / T), Math.floor((y + oy - 0.01) / T)))) return true;
  }
  return false;
}
function update(dt) {
  let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  if (open && skipOnMove && (dx || dy) && !overlayOpen()) closeDlg(); // 移動キー（画面の WASD ボタンも）で最初の会話を飛ばす
  if (open || overlayOpen()) dx = dy = 0;
  P.moving = !!(dx || dy);
  if (P.moving) {
    const l = Math.hypot(dx, dy), sp = 64 * dt;
    dx = (dx / l) * sp; dy = (dy / l) * sp;
    if (Math.abs(dx) > Math.abs(dy) + 0.01) { P.dir = 'side'; P.flip = dx < 0; } else if (dy) { P.dir = dy < 0 ? 'up' : 'down'; }
    if (!blocked(P.x + dx, P.y)) P.x += dx;
    if (!blocked(P.x, P.y + dy)) P.y += dy;
    P.anim += dt;
  } else P.anim = 0;
  const z = zoneOf(at(Math.floor(P.x / T), Math.floor((P.y - 2) / T)));
  if (TH[z] && z !== zone) { zone = z; document.documentElement.style.setProperty('--g', TH[z].acc); }
  const tb = TH[zone].bg, k = Math.min(1, dt * 3);
  for (let i = 0; i < 3; i++) bgc[i] += (tb[i] - bgc[i]) * k;
  near = null;
  let best = 22;
  for (const o of objs) { const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < best) { best = d; near = o; } }
  if (open && typed < full.length) {
    tAcc += dt;
    while (tAcc > 0.03 && typed < full.length) { tAcc -= 0.03; typed++; }
    dText.textContent = full.slice(0, typed);
  }
  if (open && typed >= full.length) dLinks.style.visibility = 'visible';
}

// ---------- 描画 ----------
function tile(x, y, sx, sy) {
  const th = TH[zoneOf(at(x, y))];
  ctx.fillStyle = (x + y) % 2 ? th.b : th.a; ctx.fillRect(sx, sy, T, T);
  ctx.fillStyle = th.dot; ctx.fillRect(sx + 7, sy + 7, 2, 2);
  ctx.fillStyle = th.edge;
  if (!walk(at(x, y - 1))) ctx.fillRect(sx, sy, T, 1);
  if (!walk(at(x - 1, y))) ctx.fillRect(sx, sy, 1, T);
  if (!walk(at(x + 1, y))) ctx.fillRect(sx + T - 1, sy, 1, T);
  if (!walk(at(x, y + 1))) {
    ctx.fillRect(sx, sy + T - 1, T, 1);
    if (th.side === 'stripe') { // 黒×黄の警告ストライプ
      for (let j = 0; j < 4; j++) for (let i = 0; i < T; i++) { ctx.fillStyle = (((x * T + i + j) >> 1) & 1) ? '#ffe600' : '#000'; ctx.fillRect(sx + i, sy + T + j, 1, 1); }
    } else { ctx.fillStyle = th.side; ctx.fillRect(sx, sy + T, T, 3); ctx.fillStyle = th.side2; ctx.fillRect(sx, sy + T + 3, T, 2); }
  }
}
// 床のタギング：サインをスプレーで吹いたように少し透かして置く（画面の canvas に直接、細かく描く）
function drawSign() {
  if (!signImg.complete || !signImg.naturalWidth) return;
  const sx = SIGN.x - camX, sy = SIGN.y - camY;
  if (sx > VW || sy > VH || sx + SIGN.w < 0 || sy + SIGN.h < 0) return;
  out.save();
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.globalAlpha = 0.62;
  out.drawImage(signImg, sx * K, sy * K, SIGN.w * K, SIGN.h * K);
  out.restore();
}
function drawCD(o, sx, sy, t) {
  const bob = Math.sin(t * 2 + o.ph) * 1.5;
  const col = INFO[o.k].col;
  ctx.strokeStyle = o.k === '2' ? '#ffffff' : col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.14; ctx.fillStyle = o.k === '2' ? '#ffffff' : col; ctx.fillRect(sx - 6, sy - 22, 12, 22); ctx.globalAlpha = 1;
  const cy = sy - 14 + bob, c = Math.cos(t * 2.6 + o.ph), w = Math.max(Math.abs(c), 0.07);
  ctx.save(); ctx.translate(sx, cy); ctx.scale(w, 1);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c > 0 ? '#e9e9e9' : '#8a8a8a'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  if (c > 0) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 7.5, -2.4, -1.2); ctx.stroke();
  }
  ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawTerm(sx, sy, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 7, sy - 17, 14, 13);
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(sx - 6, sy - 16, 12, 11);
  ctx.fillStyle = '#1b1b1f'; ctx.fillRect(sx - 5, sy - 15, 10, 9);
  ctx.fillStyle = '#f4f4f4';
  for (let i = 0; i < 3; i++) { const ww = (((t * 3 + i * 2) | 0) % 6) + 3; ctx.fillRect(sx - 4, sy - 14 + i * 3, ww, 1); }
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 2, sy - 4, 4, 4);
}
function drawTV(sx, sy) {
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 10, sy - 20, 20, 17);
  ctx.fillStyle = '#3a3a40'; ctx.fillRect(sx - 9, sy - 19, 18, 15);
  if (tvOn) {
    const fl = Math.random() < 0.08;
    ctx.fillStyle = fl ? '#1c7a2e' : '#3dff5a'; ctx.fillRect(sx - 7, sy - 17, 14, 11);
    for (let i = 0; i < 10; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#f4f4f4' : '#0f3318'; ctx.fillRect(sx - 7 + ((Math.random() * 14) | 0), sy - 17 + ((Math.random() * 11) | 0), 1, 1); }
    ctx.fillStyle = 'rgba(61,255,90,.18)'; ctx.beginPath(); ctx.arc(sx, sy - 11, 18, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#101014'; ctx.fillRect(sx - 7, sy - 17, 14, 11);
    ctx.fillStyle = '#55555c'; ctx.fillRect(sx - 3, sy - 16, 1, 3); ctx.fillRect(sx - 2, sy - 13, 1, 2); ctx.fillRect(sx - 1, sy - 11, 2, 1); ctx.fillRect(sx + 1, sy - 10, 1, 3);
  }
  ctx.fillStyle = '#000'; ctx.fillRect(sx - 7, sy - 3, 3, 3); ctx.fillRect(sx + 4, sy - 3, 3, 3);
  ctx.fillStyle = '#3a3a40'; ctx.fillRect(sx - 4, sy - 23, 1, 3); ctx.fillRect(sx + 3, sy - 24, 1, 4);
}
function pr(c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function drawProp(k, sx, sy, t) {
  const K = '#000', Wh = '#f4f4f4', G = '#8a8a90', D = '#2a2a30';
  if (k === 'M') { // ポスト
    pr(K, sx - 1, sy - 6, 3, 6); pr(G, sx, sy - 6, 1, 6);
    pr(K, sx - 7, sy - 17, 14, 11); pr(Wh, sx - 6, sy - 16, 12, 9); pr(K, sx - 4, sy - 13, 8, 2);
    pr('#ff5aa8', sx + 4, sy - 21, 1, 5); pr('#ff5aa8', sx + 5, sy - 21, 3, 2);
  } else if (k === 'U') { // スピーカー
    const b = Math.sin(t * 10) > 0 ? 1 : 0;
    pr(K, sx - 6, sy - 18, 12, 17); pr(D, sx - 5, sy - 17, 10, 15);
    pr(G, sx - 3 - b, sy - 15 - b, 6 + 2 * b, 6 + 2 * b); pr(K, sx - 1, sy - 13, 2, 2);
    pr(G, sx - 2, sy - 6, 4, 4); pr(K, sx - 1, sy - 5, 2, 2);
  } else if (k === 'N') { // 書見台とノート
    pr(K, sx - 1, sy - 6, 3, 6);
    pr(K, sx - 8, sy - 14, 16, 9); pr(Wh, sx - 7, sy - 13, 7, 7); pr(Wh, sx + 1, sy - 13, 6, 7);
    for (let i = 0; i < 3; i++) { pr(G, sx - 6, sy - 12 + i * 2, 5, 1); pr(G, sx + 2, sy - 12 + i * 2, 4, 1); }
  } else if (k === 'D') { // 鍵のかかった扉
    pr(K, sx - 7, sy - 22, 14, 22); pr('#3a3a40', sx - 6, sy - 21, 12, 21);
    pr(D, sx - 4, sy - 19, 8, 8); pr(D, sx - 4, sy - 9, 8, 7);
    const a = t * 1.5;
    pr(Wh, sx - 2, sy - 13, 4, 4); pr(K, sx - 1 + Math.round(Math.cos(a)), sy - 12 + Math.round(Math.sin(a)), 2, 2);
  }
}
function bubble(o, sx, sy) {
  const isCD = '123'.includes(o.k);
  const label = LABEL[o.k] || INFO[o.k].title.toUpperCase();
  ctx.font = '8px "Press Start 2P",monospace';
  const tw = Math.ceil(ctx.measureText(label).width) + 20;
  const bx = Math.round(sx - tw / 2), by = Math.round(sy - (isCD ? 42 : 34));
  ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, tw + 2, 14);
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(bx, by, tw, 12);
  // 赤いキーに「␣」（SPACE で調べる）
  ctx.fillStyle = '#e8202a'; ctx.fillRect(bx + 2, by + 2, 8, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(bx + 3, by + 7, 6, 1); ctx.fillRect(bx + 3, by + 5, 1, 2); ctx.fillRect(bx + 8, by + 5, 1, 2);
  ctx.fillStyle = '#000';
  ctx.fillText(label, bx + 13, by + 10);
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(Math.round(sx) - 1, by + 12, 3, 2);
}
function draw(t) {
  const th = TH[zone];
  ctx = floorL.g;
  ctx.fillStyle = `rgb(${bgc[0] | 0},${bgc[1] | 0},${bgc[2] | 0})`; ctx.fillRect(0, 0, VW, VH);
  const mw = W * T, mh = H * T;
  let cx = mw <= VW ? (mw - VW) / 2 : Math.min(Math.max(P.x - VW / 2, 0), mw - VW);
  let cy = mh <= VH ? (mh - VH) / 2 : Math.min(Math.max(P.y - VH / 2, 0), mh - VH);
  cx = Math.round(cx); cy = Math.round(cy);
  camX = cx; camY = cy;
  for (const s of stars) {
    const x = (((s.x - cx * s.z) % VW) + VW) % VW, y = (((s.y + t * 14 * s.z - cy * s.z) % VH) + VH) % VH;
    ctx.fillStyle = s.b ? th.pb : th.pt; ctx.fillRect(x | 0, y | 0, 1, s.b ? 2 : 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(at(x, y))) tile(x, y, x * T - cx, y * T - cy);
  ctx = topL.g;
  ctx.clearRect(0, 0, VW, VH);
  const ds = [
    ...objs.map(o => ({
      y: o.y,
      f: () => (o.k === 'T' ? drawTerm(o.x - cx, o.y - cy + 2, t)
        : o.k === 'V' ? drawTV(o.x - cx, o.y - cy + 2)
          : 'MNUD'.includes(o.k) ? drawProp(o.k, o.x - cx, o.y - cy + 2, t)
            : drawCD(o, o.x - cx, o.y - cy, t)),
    })),
    {
      y: P.y,
      f: () => {
        const sx = Math.round(P.x - cx), sy = Math.round(P.y - cy);
        ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
        const fr = P.moving ? 1 + (((P.anim * 7) | 0) % 2) : 0, img = SPR[P.dir][fr], bobY = P.moving && fr === 1 ? -1 : 0;
        if (P.dir === 'side' && P.flip) { ctx.save(); ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.drawImage(img, -7, sy - 17 + bobY); ctx.restore(); }
        else ctx.drawImage(img, sx - 7, sy - 17 + bobY);
      },
    },
  ];
  ds.sort((a, b) => a.y - b.y).forEach(d => d.f());
  if (near && !open) bubble(near, near.x - cx, near.y - cy);
  // 重ねる：床 → タギング → 物と人
  out.imageSmoothingEnabled = false;
  out.drawImage(floorL.c, 0, 0, cv.width, cv.height);
  drawSign();
  out.imageSmoothingEnabled = false;
  out.drawImage(topL.c, 0, 0, cv.width, cv.height);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!listOpen) { update(dt); draw(now / 1000); } // LIST を開いている間は描かない
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
setTimeout(() => talk('arbero', ['Welcome ! ようこそ！\n（SPACEキーを押してね）', 'WASDで移動、SPACEで調べるよ！'], null, { skippable: true }), 400);
