// 背景の ASCII グッピー。画面全体に固定した canvas に、文字で描いた一匹をゆっくり泳がせる
// 形はローカル座標（u = 頭の向き、v = 腹の向き。1 = 魚の大きさ S px）で定義し、
// 各マスの中心をローカル座標に戻して濃さを求め、濃さに応じた文字を置く

const FONT_PX = 9;
const LINE_H = 10;
const FPS = 18;                       // ASCII らしいコマ送り感（負荷も軽くなる）
const RAMP = ' .,:;~=+*x%#@';         // 薄い → 濃い
const FONT = `${FONT_PX}px "Share Tech Mono", ui-monospace, "SFMono-Regular", monospace`;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

// ---------- 魚の形 ----------
const PED = -0.40;                    // 尾びれの付け根

function bodyHalf(u) {
  if (u > 1.02 || u < PED - 0.02) return 0;
  if (u >= 0.3) { const x = (u - 0.3) / 0.72; return 0.16 * Math.sqrt(Math.max(0, 1 - x * x)); }
  const t = (0.3 - u) / 0.70;
  return 0.16 - 0.105 * Math.pow(clamp(t, 0, 1), 1.3);
}

// 体の後ろほど大きく、少し遅れて揺れる
function sway(u, phase) {
  const s = Math.max(0, 0.25 - u);
  return 0.024 * s * s * Math.sin(phase - 2.3 * s);
}

// 戻り値: [濃さ 0-1, 種類]  種類 0 = ひれ, 1 = 背, 2 = 腹, 3 = 目
function sample(u, v, phase, lag) {
  const vv = v - sway(u, phase);

  // 目
  const ex = u - 0.86, ey = vv + 0.035;
  if (ex * ex + ey * ey < 0.0011) return [1, 3];

  // 体
  const hb = bodyHalf(u);
  if (hb > 0 && Math.abs(vv) < hb) {
    const e = 1 - Math.abs(vv) / hb;
    return [0.45 + 0.5 * smooth(0, 0.45, e), vv < -hb * 0.15 ? 1 : 2];
  }

  let best = 0;

  // 背びれ（背中の中ほどから立ち上がり、上ほど後ろへ流れる）
  {
    const base = -bodyHalf(clamp(u, PED, 1));
    const flutter = 0.025 * Math.sin(phase * 0.8 + u * 4);
    const vd = vv - flutter * Math.max(0, base - vv) * 3;
    const h = clamp((base - vd) / 0.44, 0, 1.2);      // 付け根からの高さ
    const ue = u + 0.32 * h;                          // 上ほど後ろにずらす
    if (vd < base + 0.02 && ue < 0.16 && ue > -0.30) {
      const k = (0.16 - ue) / 0.46;                   // 0 = 前縁, 1 = 後縁
      const top = 0.10 + 0.90 * Math.pow(k, 0.6);     // 前は低く、後ろは高い
      if (h < top) {
        const rays = 0.6 + 0.4 * Math.cos(ue * 60);
        const spot = hash(Math.floor(u * 30), Math.floor(vd * 30)) > 0.8 ? 0.35 : 0;
        const edge = smooth(top, top * 0.75, h) * smooth(1, 0.85, k);
        best = Math.max(best, (0.30 + 0.30 * rays + spot) * edge);
      }
    }
  }

  // 尾びれ（扇形 + 筋 + 斑点）。体が傾いても、尾は付け根を中心に少し遅れてついてくる
  const cl = Math.cos(lag), sl = Math.sin(lag);
  const dx0 = PED - u;
  const dx = dx0 * cl - vv * sl;
  const tv = dx0 * sl + vv * cl;
  if (dx > -0.03) {
    const side = Math.sign(tv || 1);
    const ady = Math.max(0, Math.abs(tv) - 0.045);
    const r = Math.hypot(dx, ady);
    const ang = Math.atan2(ady, Math.max(dx, 1e-4));
    const spread = 0.60 * (1 + 0.07 * Math.sin(phase * 0.5));
    const R = 1.18 * (1 + 0.05 * Math.sin(side * ang * 3 + phase * 0.6));
    if (ang < spread && r < R) {
      const rays = 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.cos(ang * side * 36), 2);
      const spot = hash(Math.floor(r * 22), Math.floor(ang * side * 40)) > 0.86 ? 0.3 : 0;
      const edge = smooth(spread, spread * 0.82, ang) * smooth(R, R * 0.9, r);
      const grow = 0.35 + 0.65 * smooth(0, 0.7, r);  // 先へ行くほど青が濃い
      best = Math.max(best, (rays * grow + spot) * edge);
    }
  }

  // 胸びれ（小さく半透明）
  const px = (u - 0.52) / 0.13, py = (vv - 0.11 - 0.02 * Math.sin(phase * 1.7)) / 0.05;
  if (px * px + py * py < 1) best = Math.max(best, 0.28);

  return best > 0.04 ? [clamp(best, 0, 1), 0] : null;
}

// 明るい背景用：濃いところほど暗く、色数は絞って描画をまとめる
function colorOf(d, kind, u) {
  const q = Math.round(d * 6) / 6;
  switch (kind) {
    case 3: return '#23262c';
    case 1: return `hsl(205,28%,${Math.round(62 - 22 * q)}%)`;
    case 2: return `hsl(42,50%,${Math.round(62 - 16 * q)}%)`;
    default: return `hsl(${u < PED ? 200 : 196},85%,${Math.round(70 - 34 * q)}%)`;
  }
}

export function startGuppy({ reduceMotion = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'guppy';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W, H, cellW, cols, rows, S;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    cellW = ctx.measureText('M').width;
    cols = Math.ceil(W / cellW);
    rows = Math.ceil(H / LINE_H);
    S = clamp(Math.min(W * 0.22, H * 0.2), 60, 170);   // 魚の大きさ（1 単位の px）
  }

  // 泳ぐ道筋：周期の違う波を重ねて、同じ動きの繰り返しに見えないようにする
  const pathAt = t => ({
    x: W * 0.5 + W * 0.30 * Math.sin(t * 0.085) + W * 0.06 * Math.sin(t * 0.21 + 1.3),
    y: H * 0.5 + H * 0.20 * Math.sin(t * 0.12 + 0.7) + H * 0.05 * Math.sin(t * 0.33),
  });

  const fish = { facing: 1, pitch: 0, phase: 0 };
  const motes = Array.from({ length: 16 }, () => ({
    x: Math.random(), y: Math.random(), s: 0.004 + Math.random() * 0.006, w: Math.random() * 6,
  }));

  function render(t, dt) {
    const p0 = pathAt(t), p1 = pathAt(t + 0.5);
    const vx = (p1.x - p0.x) * 2, vy = (p1.y - p0.y) * 2;

    // 向き：絵を反転せず、横幅を縮めて → 広げて U ターンに見せる
    const want = vx >= 0 ? 1 : -1;
    fish.facing += (want - fish.facing) * Math.min(1, dt * 0.9);
    const fAbs = Math.max(0.10, Math.abs(fish.facing));
    const f = Math.sign(fish.facing || 1) * fAbs;

    const wantPitch = clamp(Math.atan2(vy, Math.abs(vx) + 1e-3), -0.16, 0.16) * fAbs;
    fish.pitch += (wantPitch - fish.pitch) * Math.min(1, dt * 1.5);
    fish.phase += dt * (1.6 + Math.hypot(vx, vy) / S * 3);

    const a = fish.pitch, s = Math.sign(f);
    const hx = f * Math.cos(a), hy = Math.sin(a);        // 頭の向き
    const nx = -s * Math.sin(a), ny = Math.cos(a);       // 腹の向き
    const det = hx * ny - hy * nx;
    const lag = -a * s * 0.7;

    ctx.clearRect(0, 0, W, H);
    const buckets = new Map();
    const put = (col, row, ch, color) => {
      let arr = buckets.get(color);
      if (!arr) buckets.set(color, arr = []);
      arr.push(col, row, ch);
    };

    for (const m of motes) {
      m.y -= m.s * dt;
      if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); }
      const x = m.x + 0.01 * Math.sin(t * 0.4 + m.w);
      put(Math.floor(x * cols), Math.floor(m.y * rows), m.s > 0.007 ? 'o' : '.', '#aeb6c2');
    }

    // 魚の周りだけ計算する
    const reach = 1.9 * S;
    const c0 = Math.max(0, Math.floor((p0.x - reach) / cellW)), c1 = Math.min(cols - 1, Math.ceil((p0.x + reach) / cellW));
    const r0 = Math.max(0, Math.floor((p0.y - reach) / LINE_H)), r1 = Math.min(rows - 1, Math.ceil((p0.y + reach) / LINE_H));
    for (let row = r0; row <= r1; row++) {
      const ry = ((row + 0.5) * LINE_H - p0.y) / S;
      for (let col = c0; col <= c1; col++) {
        const rx = ((col + 0.5) * cellW - p0.x) / S;
        const u = (rx * ny - ry * nx) / det;
        const v = (hx * ry - hy * rx) / det;
        if (u < -1.8 || u > 1.1 || v < -0.9 || v > 0.9) continue;
        const res = sample(u, v, fish.phase, lag);
        if (!res) continue;
        const [d, kind] = res;
        const ch = kind === 3 ? '0' : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(d * (RAMP.length - 1)))];
        put(col, row, ch, colorOf(d, kind, u));
      }
    }

    for (const [color, arr] of buckets) {
      ctx.fillStyle = color;
      for (let i = 0; i < arr.length; i += 3) {
        ctx.fillText(arr[i + 2], (arr[i] + 0.5) * cellW, (arr[i + 1] + 0.5) * LINE_H);
      }
    }
  }

  resize();
  fish.facing = pathAt(0.5).x >= pathAt(0).x ? 1 : -1;

  if (reduceMotion) {
    // 動きを減らす設定では、止まった一枚だけ
    const still = () => { resize(); render(8, 0.5); };
    still();
    addEventListener('resize', still);
    document.fonts?.ready.then(still);
    return;
  }

  addEventListener('resize', resize);
  document.fonts?.ready.then(resize);       // 等幅フォントが届いたらマスの幅を測り直す

  const start = performance.now();
  let last = start, acc = 0;
  const loop = now => {
    acc += now - last; last = now;
    if (acc >= 1000 / FPS) {
      const dt = Math.min(acc, 200) / 1000;
      acc = 0;
      render((now - start) / 1000, dt);
    }
    requestAnimationFrame(loop);            // タブが見えていない間はブラウザが自動で止める
  };
  requestAnimationFrame(loop);
}
