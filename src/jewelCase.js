import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// 3D ジュエルケース。stage（<a>）の中に canvas を置き、ケースに当たったタップだけ遷移させる
export function initJewelCase({ stage, coverImgs, obiCanvases, initial, reduceMotion, canHover, onFirstFrame }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 6, 8);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);

  const toTex = src => {
    const t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
    t.needsUpdate = true;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };
  const textures = coverImgs.map(toTex);
  const obiTex = obiCanvases.map(o => ({ front: toTex(o.front), spine: toTex(o.spine), back: toTex(o.back) }));

  // 実物の比率：142 × 125 mm、厚さ約 10 mm
  const W = 14.2, H = 12.5;
  const group = new THREE.Group();
  scene.add(group);

  // トレイも透明なクリアケース（背景のグリッドが透けて見える）
  const trayGeo = new THREE.BoxGeometry(W, H, 0.6);
  const tray = new THREE.Mesh(trayGeo, new THREE.MeshPhysicalMaterial({
    color: 0xe4ebf2, roughness: 0.06, transparent: true, opacity: 0.07, depthWrite: false,
  }));
  tray.position.z = -0.42;
  group.add(tray);
  const trayEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(trayGeo),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
  );
  trayEdges.position.z = -0.42;
  group.add(trayEdges);

  // 裏ジャケット（正面からは見えず、回転したときだけ見える）
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(13.6, 11.8),
    new THREE.MeshStandardMaterial({ color: 0xc7ced8, metalness: 0.55, roughness: 0.32 }),
  );
  back.rotation.y = Math.PI;
  back.position.z = -0.7;
  group.add(back);

  const coverMat = new THREE.MeshBasicMaterial({ map: textures[initial], toneMapped: false });
  const cover = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), coverMat);
  cover.position.set(0.95, 0, -0.1);
  group.add(cover);

  const lidGeo = new THREE.BoxGeometry(W, H, 0.22);
  // うっすら白いプラスチックの層
  const haze = new THREE.Mesh(lidGeo, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.05, depthWrite: false,
  }));
  haze.position.z = 0.06;
  group.add(haze);
  // 反射だけを加算する層（玉虫色の光沢）。opacity = 反射の強さ
  const gloss = new THREE.Mesh(lidGeo, new THREE.MeshPhysicalMaterial({
    color: 0x000000, metalness: 0, roughness: 0.04,
    iridescence: 1, iridescenceIOR: 1.4, iridescenceThicknessRange: [160, 520],
    clearcoat: 0.6, clearcoatRoughness: 0.02, envMapIntensity: 1.0,
    transparent: true, opacity: 0.4, depthWrite: false,
    // 光だけ足して、キャンバスの不透明度は増やさない（黒いシート状になるのを防ぐ）
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  }));
  gloss.position.z = 0.06;
  group.add(gloss);

  // 蝶番部分：透明のまま、継ぎ目の線だけで形を見せる
  const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  [-W / 2 + 0.35, -W / 2 + 1.25].forEach(x => {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.04, H, 0.24), seamMat);
    seam.position.set(x, 0, 0.06);
    group.add(seam);
  });

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(lidGeo),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }),
  );
  edges.position.z = 0.06;
  group.add(edges);

  // 帯：ケースの外側、左端に巻き付ける（表・背・裏）
  const OBI_W = 2.6, zFront = 0.19, zBack = -0.74;
  // ジャケットと帯は元画像の色をそのまま出す（照明・トーンマッピングで白っぽくなるのを防ぐ）
  const obiMat = map => new THREE.MeshBasicMaterial({ map, toneMapped: false });
  const obiMats = {
    front: obiMat(obiTex[initial].front),
    spine: obiMat(obiTex[initial].spine),
    back: obiMat(obiTex[initial].back),
  };
  const obiFront = new THREE.Mesh(new THREE.PlaneGeometry(OBI_W, H), obiMats.front);
  obiFront.position.set(-W / 2 + OBI_W / 2 - 0.01, 0, zFront);
  group.add(obiFront);
  const obiSpine = new THREE.Mesh(new THREE.PlaneGeometry(zFront - zBack, H), obiMats.spine);
  obiSpine.rotation.y = -Math.PI / 2;
  obiSpine.position.set(-W / 2 - 0.012, 0, (zFront + zBack) / 2);
  group.add(obiSpine);
  const obiBack = new THREE.Mesh(new THREE.PlaneGeometry(OBI_W, H), obiMats.back);
  obiBack.rotation.y = Math.PI;
  obiBack.position.set(-W / 2 + OBI_W / 2 - 0.01, 0, zBack);
  group.add(obiBack);

  function setRelease(i) {
    coverMat.map = textures[i];
    obiMats.front.map = obiTex[i].front;
    obiMats.spine.map = obiTex[i].spine;
    obiMats.back.map = obiTex[i].back;
  }

  const hitTargets = [tray, cover, haze, obiFront, obiSpine, obiBack];

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const dist = Math.max((H / 2) / half, (W / 2) / (half * camera.aspect)) * 1.22;
    camera.position.set(0, 0, dist);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ポインター → 視差＆ホバー判定
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pointer = { x: 0, y: 0 };
  let hover = false;
  function hitTest(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(hitTargets, false).length > 0;
  }
  if (canHover) {
    stage.addEventListener('pointermove', ev => {
      const rect = stage.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((ev.clientY - rect.top) / rect.height) * 2 - 1;
      hover = hitTest(ev);
      stage.classList.toggle('is-hot', hover);
    });
    stage.addEventListener('pointerleave', () => {
      pointer.x = pointer.y = 0;
      hover = false;
      stage.classList.remove('is-hot');
    });
  }
  // ---------- 切替・ドラッグ・案内の動き ----------
  // ドラッグ中は指の移動量に合わせてケースを傾け、離したら回転して切り替えるか元に戻す
  let dragTarget = 0, dragCur = 0;
  function setDrag(angle) { dragTarget = angle; }
  function releaseDrag() { dragTarget = 0; }

  // 切替：dir の向き（-1 = 左、+1 = 右）に1回転し、裏面が向いたタイミングでジャケットと帯を差し替え
  let spin = null;
  function swapTo(i, dir = -1) {
    dragTarget = 0;
    if (reduceMotion) { dragCur = 0; setRelease(i); return; }
    if (spin) {
      spin.to = i;
      if (spin.swapped) setRelease(i);
      return;
    }
    spin = { start: performance.now(), dur: 900, from: dragCur, end: dir * Math.PI * 2, to: i, swapped: false };
    dragCur = 0;
  }
  const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOut = p => 1 - Math.pow(1 - p, 3);

  // スワイプの案内：一度だけ左にスッと動いて戻る
  let nudgeStart = -1;
  function nudge() { if (!reduceMotion) nudgeStart = performance.now(); }

  const clock = new THREE.Clock();
  let px = 0, py = 0, sc = 1, first = true;
  function loop() {
    const t = clock.getElapsedTime();
    const now = performance.now();
    px += (pointer.x - px) * 0.06;
    py += (pointer.y - py) * 0.06;
    dragCur += (dragTarget - dragCur) * 0.25;

    let s = 0;
    if (spin) {
      const p = Math.min((now - spin.start) / spin.dur, 1);
      s = spin.from + (spin.end - spin.from) * (spin.from ? easeOut(p) : ease(p));
      if (!spin.swapped && Math.abs(s) >= Math.PI) { setRelease(spin.to); spin.swapped = true; }
      if (p >= 1) spin = null;
    }

    let nudgeY = 0, nudgeX = 0;
    if (nudgeStart >= 0) {
      const p = Math.min((now - nudgeStart) / 1100, 1);
      const k = Math.sin(Math.PI * p) * (1 - p * 0.3);
      nudgeY = -0.45 * k;
      nudgeX = -1.1 * k;
      if (p >= 1) nudgeStart = -1;
    }

    const idleY = reduceMotion ? -0.18 : Math.sin(t * 0.45) * 0.38;
    group.rotation.y = idleY + s + dragCur + nudgeY + px * 0.28;
    group.rotation.x = -0.06 + (reduceMotion ? 0 : Math.sin(t * 0.7) * 0.04) + py * 0.14;
    group.position.x = dragCur * 2.2 + nudgeX;
    group.position.y = reduceMotion ? 0 : Math.sin(t * 1.1) * 0.18;
    sc += ((hover ? 1.04 : 1) - sc) * 0.12;
    group.scale.setScalar(sc);
    renderer.render(scene, camera);
    if (first) { first = false; onFirstFrame?.(); }
    requestAnimationFrame(loop);
  }
  loop();

  return { swapTo, setDrag, releaseDrag, nudge, hitTest };
}
