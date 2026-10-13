import './style.css';
import releases from './data/releases.json';
import { loadObiFonts, drawObi } from './obi.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = matchMedia('(hover: hover)').matches;

const $ = id => document.getElementById(id);
const stage = $('stage');
const fallback = $('fallback');
let current = releases.length - 1; // 最初は最新シングルを表示
let jewelCase = null;

// ---------- 切替ボタン ----------
const buttons = releases.map((r, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sw';
  b.innerHTML = `<span class="num">${r.no}</span>${r.title}`;
  b.addEventListener('click', () => select(i));
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
  buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
  $('releaseTitle').textContent = r.title;
  $('releaseDate').textContent = `${r.date} RELEASE`;
  stage.href = r.bandcampUrl;
  stage.setAttribute('aria-label', `${r.title} を Bandcamp で聴く`);
  fallback.src = r.cover;
  renderPlayer(r);
  renderMV(r);
}

function select(i) {
  if (i === current) return;
  current = i;
  renderUI(i);
  jewelCase?.swapTo(i);
}

renderUI(current);

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
      onFirstFrame: () => { fallback.hidden = true; },
    });
  } catch (e) {
    console.warn('3D の初期化に失敗したため、ジャケット画像を表示します', e);
  }
}
start3D();
