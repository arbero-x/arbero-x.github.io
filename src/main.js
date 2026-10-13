import './style.css';
import releases from './data/releases.json';
import { loadObiFonts, drawObi } from './obi.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = matchMedia('(hover: hover)').matches;

const $ = id => document.getElementById(id);
const stage = $('stage');
const fallback = $('fallback');
const swipeHint = $('swipeHint');
let current = releases.length - 1; // 最初は最新シングルを表示
let jewelCase = null;

// ---------- インジケーター（● = 表示中、○ = それ以外。タップでも切り替えられる） ----------
const dots = releases.map((r, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'dot';
  b.setAttribute('aria-label', `${r.no} ${r.title}`);
  b.addEventListener('click', () => select(i, i < current ? -1 : 1));
  $('switcher').appendChild(b);
  return b;
});

// ---------- Bandcamp 試聴プレイヤー ----------
function bandcampSrc(r) {
  return `https://bandcamp.com/EmbeddedPlayer/track=${r.bandcampTrackId}/size=large/bgcol=ffffff/linkcol=${r.bandcampLinkColor}/tracklist=false/artwork=small/transparent=true/`;
}
function renderPlayer(r) {
  const box = $('bandcamp');
  box.replaceChildren();
  const f = document.createElement('iframe');
  f.title = `${r.title} by arbero（Bandcamp 試聴プレイヤー）`;
  f.src = bandcampSrc(r);
  f.loading = 'lazy';
  f.setAttribute('seamless', '');
  const a = document.createElement('a');
  a.href = r.bandcampUrl;
  a.textContent = `${r.title} by arbero`;
  f.appendChild(a);
  box.appendChild(f);
}

// ---------- YouTube MV（タップするまでサムネイルだけ表示） ----------
function renderMV(r) {
  const box = $('mv');
  box.replaceChildren();
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mv-thumb';
  b.setAttribute('aria-label', `${r.title} の MV を再生`);
  b.innerHTML = `
    <img src="https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg" alt="" loading="lazy">
    <span class="yt"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0l10 6-10 6z"/></svg></span>
    <span class="mv-label">${r.title} — Music Video</span>`;
  b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${r.youtubeId}?autoplay=1&playsinline=1&rel=0`;
    f.title = `${r.title} — Music Video`;
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    box.replaceChildren(f);
  });
  box.appendChild(b);
}

function renderUI(i) {
  const r = releases[i];
  dots.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
  $('releaseTitle').textContent = r.title;
  $('releaseDate').textContent = `${r.date} RELEASE`;
  stage.href = r.bandcampUrl;
  stage.setAttribute('aria-label', `${r.title} を Bandcamp で聴く（左右キーで曲を切り替え）`);
  fallback.src = r.cover;
  renderPlayer(r);
  renderMV(r);
}

// dir：-1 = 左（1つ前＝過去の曲）、+1 = 右（1つ新しい曲）。端まで行ったらループする
function select(i, dir) {
  if (i === current) return;
  current = i;
  renderUI(i);
  jewelCase?.swapTo(i, dir);
}
const step = dir => select((current + dir + releases.length) % releases.length, dir);

renderUI(current);

// ---------- スワイプの案内（一度スワイプしたら、その端末では出さない） ----------
const HINT_KEY = 'arbero.swiped';
let hintDone = false;
try { hintDone = localStorage.getItem(HINT_KEY) === '1'; } catch { /* 保存できない環境では毎回表示 */ }
swipeHint.hidden = hintDone;
function finishHint() {
  if (hintDone) return;
  hintDone = true;
  swipeHint.hidden = true;
  try { localStorage.setItem(HINT_KEY, '1'); } catch { /* 無視 */ }
}

// ---------- ジェスチャー：タップ = Bandcamp、横スワイプ = 切替、縦 = スクロール ----------
const TAP_SLOP = 10;        // これ以上動いたらタップではない
const TAP_MAX_MS = 500;
const SWIPE_DIST = 50;      // これ以上横に動かして離したら切替
const SWIPE_VELOCITY = 0.5; // px/ms。短くても素早く払ったら切替
const SWIPE_MIN_FLICK = 30; // ただし指のぶれで切り替わらないよう、素早くても最低限この距離は必要
const EDGE = 24;            // 画面端からのスワイプは OS の「戻る」に任せる

let g = null;               // 進行中のジェスチャー
let suppressClick = false;

stage.addEventListener('pointerdown', ev => {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  // 指のスワイプの後は click が発生しないことがあるため、前のジェスチャーの「クリック無視」を持ち越さない
  suppressClick = false;
  const fromEdge = ev.pointerType === 'touch' && (ev.clientX < EDGE || ev.clientX > innerWidth - EDGE);
  g = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, t0: performance.now(), mode: 'pending', fromEdge, lastX: ev.clientX, lastT: performance.now(), vx: 0 };
});

stage.addEventListener('pointermove', ev => {
  if (!g || ev.pointerId !== g.id) return;
  const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
  const now = performance.now();
  g.vx = (ev.clientX - g.lastX) / Math.max(now - g.lastT, 1);
  g.lastX = ev.clientX;
  g.lastT = now;
  if (g.mode === 'pending') {
    if (Math.abs(dx) > TAP_SLOP && Math.abs(dx) > Math.abs(dy) && !g.fromEdge) {
      g.mode = 'drag';
      stage.setPointerCapture?.(ev.pointerId);
    } else if (Math.abs(dy) > TAP_SLOP || Math.abs(dx) > TAP_SLOP) {
      g.mode = 'none'; // 縦スクロールなど。何もしない
    }
  }
  if (g.mode === 'drag') {
    ev.preventDefault();
    jewelCase?.setDrag((dx / stage.clientWidth) * 1.4);
  }
});

function endGesture(ev, cancelled) {
  if (!g || ev.pointerId !== g.id) return;
  const dx = ev.clientX - g.x0;
  if (g.mode === 'drag') {
    suppressClick = true; // スワイプの後に来るクリックで Bandcamp に飛ばないようにする
    const fast = Math.abs(dx) >= SWIPE_MIN_FLICK && Math.abs(g.vx) > SWIPE_VELOCITY && Math.sign(g.vx) === Math.sign(dx);
    if (!cancelled && (Math.abs(dx) > SWIPE_DIST || fast)) {
      step(dx < 0 ? -1 : 1);
      finishHint();
    } else {
      jewelCase?.releaseDrag();
    }
  } else if (g.mode === 'none' || performance.now() - g.t0 > TAP_MAX_MS) {
    suppressClick = true; // 長押しやスクロールの後はタップ扱いしない
  }
  g = null;
}
stage.addEventListener('pointerup', ev => endGesture(ev, false));
stage.addEventListener('pointercancel', ev => endGesture(ev, true));

stage.addEventListener('click', ev => {
  // キーボードの Enter（detail === 0）はジェスチャーと無関係なので、無視の対象にしない
  if (suppressClick && ev.detail !== 0) {
    suppressClick = false;
    ev.preventDefault();
    return;
  }
  // ケース以外の余白をタップしたときは遷移しない（キーボードの Enter は detail === 0 なので通す）
  if (ev.detail !== 0 && jewelCase && !jewelCase.hitTest(ev)) ev.preventDefault();
});
stage.addEventListener('dragstart', ev => ev.preventDefault());

// キーボード：ケースにフォーカスして左右キーで切替
stage.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
    ev.preventDefault();
    step(ev.key === 'ArrowLeft' ? -1 : 1);
  }
});

// ---------- 3D ジュエルケース（ジャケット画像を先に見せてから読み込む） ----------
const loadImage = src => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = rej;
  im.src = src;
});

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function start3D() {
  if (!hasWebGL()) return;
  try {
    const [{ initJewelCase }, sig, coverImgs] = await Promise.all([
      import('./jewelCase.js'),
      loadImage('/signature.webp'),
      Promise.all(releases.map(r => loadImage(r.cover))),
      loadObiFonts(releases),
    ]);
    const obiCanvases = releases.map(r => drawObi(r.obi, sig));
    jewelCase = initJewelCase({
      stage, coverImgs, obiCanvases, initial: current, reduceMotion, canHover,
      onFirstFrame: () => {
        fallback.hidden = true;
        if (!hintDone) setTimeout(() => jewelCase?.nudge(), 700);
      },
    });
  } catch (e) {
    console.warn('3D の初期化に失敗したため、ジャケット画像を表示します', e);
  }
}
start3D();
