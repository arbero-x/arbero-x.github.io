// フッターの Discord リンクのダイヤルロック。4 桁の番号が合うと招待 URL が取り出せる。
// 招待 URL は番号を鍵にして暗号化してある（scripts/make-lock.mjs で作る）。呼ばれたときに初めて読み込まれる
import secret from './data/discordLock.json';

const ITERATIONS = 300000; // scripts/make-lock.mjs と同じ値にする
const STEP = 36;           // 1 目盛りの角度（10 面）
const FACE_H = 44;         // 1 面の高さ（px）
const RADIUS = (FACE_H / 2) / Math.tan(Math.PI / 10);

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function unlock(code) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(secret.salt), iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(secret.iv) }, key, b64(secret.ct)));
  } catch {
    return null; // 番号が違う
  }
}

const el = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

export function openDialLock({ reduceMotion, returnFocus }) {
  const dlg = el('dialog', 'dial-lock');
  dlg.setAttribute('aria-label', 'Discord の鍵');
  const close = el('button', 'dl-close');
  close.type = 'button';
  close.setAttribute('aria-label', '閉じる');
  close.textContent = '×';
  const body = el('div', 'dl-body');
  for (const pos of ['tl', 'tr', 'bl', 'br']) body.appendChild(el('span', `dl-screw ${pos}`));
  const win = el('div', 'dl-window');
  win.appendChild(el('span', 'dl-index l'));
  body.appendChild(win);
  const pull = el('button', 'dl-pull');
  pull.type = 'button';
  pull.textContent = '開ける';
  const wrap = el('div', 'dl-wrap');
  wrap.append(body, pull);
  dlg.append(close, wrap);

  // ---------- ダイヤル（10 面の円筒）。毎回 0000 から ----------
  const value = st => ((Math.round(st.angle / STEP) % 10) + 10) % 10;
  const render = (st, animate) => {
    st.drum.style.transition = animate && !reduceMotion ? 'transform .18s cubic-bezier(.3,1.4,.6,1)' : 'none';
    st.drum.style.transform = `rotateX(${st.angle}deg)`;
    st.el.setAttribute('aria-valuenow', value(st));
  };
  let goLink = null;
  const resetResult = () => {
    goLink?.remove();
    goLink = null;
    pull.hidden = false;
  };
  const snap = st => {
    st.angle = Math.round(st.angle / STEP) * STEP;
    render(st, true);
    navigator.vibrate?.(8);
    resetResult();
  };

  const wheels = [];
  for (let w = 0; w < 4; w++) {
    const wheel = el('div', 'dl-wheel');
    wheel.tabIndex = 0;
    wheel.setAttribute('role', 'spinbutton');
    wheel.setAttribute('aria-valuemin', '0');
    wheel.setAttribute('aria-valuemax', '9');
    wheel.setAttribute('aria-label', `${w + 1} 桁目`);
    const drum = el('div', 'dl-drum');
    for (let i = 0; i < 10; i++) {
      const f = el('div', 'dl-face');
      f.textContent = i;
      f.style.transform = `rotateX(${-i * STEP}deg) translateZ(${RADIUS}px)`;
      drum.appendChild(f);
    }
    wheel.appendChild(drum);
    win.appendChild(wheel);
    const st = { el: wheel, drum, angle: 0 };
    wheels.push(st);
    render(st, false);

    // 上にスワイプすると数字が増える。動かさずにタップしたら、上半分は 1 つ戻す、下半分は 1 つ進める
    let drag = null;
    wheel.addEventListener('pointerdown', ev => {
      wheel.setPointerCapture?.(ev.pointerId);
      drag = { y0: ev.clientY, a0: st.angle, moved: false };
    });
    wheel.addEventListener('pointermove', ev => {
      if (!drag) return;
      const dy = ev.clientY - drag.y0;
      if (Math.abs(dy) > 4) drag.moved = true;
      st.angle = drag.a0 - dy * (STEP / FACE_H);
      render(st, false);
    });
    const end = ev => {
      if (!drag) return;
      if (!drag.moved) {
        const r = wheel.getBoundingClientRect();
        st.angle = Math.round(st.angle / STEP) * STEP + (ev.clientY < r.top + r.height / 2 ? -STEP : STEP);
      }
      drag = null;
      snap(st);
    };
    wheel.addEventListener('pointerup', end);
    wheel.addEventListener('pointercancel', end);
    wheel.addEventListener('wheel', ev => {
      ev.preventDefault();
      st.angle = Math.round(st.angle / STEP) * STEP + Math.sign(ev.deltaY) * STEP;
      snap(st);
    }, { passive: false });
    wheel.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowUp') st.angle += STEP;
      else if (ev.key === 'ArrowDown') st.angle -= STEP;
      else if (/^[0-9]$/.test(ev.key)) {
        st.angle = Number(ev.key) * STEP;
        wheels[w + 1]?.el.focus();
      } else return;
      ev.preventDefault();
      snap(st);
    });
  }
  win.appendChild(el('span', 'dl-index r'));

  // ---------- 答え合わせ：違ったら揺れるだけ。合ったら Discord を開くボタンを出す ----------
  pull.addEventListener('click', async () => {
    pull.disabled = true;
    const url = await unlock(wheels.map(value).join(''));
    pull.disabled = false;
    if (!url) {
      body.classList.remove('shake');
      void body.offsetWidth; // 続けて外したときも揺れ直すように
      body.classList.add('shake');
      navigator.vibrate?.([40, 40, 40]);
      return;
    }
    pull.hidden = true;
    goLink = el('a', 'dl-go');
    goLink.href = url;
    goLink.target = '_blank';
    goLink.rel = 'noopener';
    goLink.textContent = 'Discord を開く ↗';
    pull.after(goLink);
    goLink.focus();
  });

  close.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    dlg.remove();
    returnFocus?.focus?.();
  });
  document.body.appendChild(dlg);
  dlg.showModal();
  wheels[0].el.focus();
}
