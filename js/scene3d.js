/* =========================================================
   MÔ HÌNH 3D CĂN HỘ (Three.js r147, không cần build)
   ========================================================= */
window.Scene3D = (function () {
  const T = THREE;
  let renderer, scene, camera, controls, root, container;
  let pickables = [], hotspots = [], hovered = null;
  let running = false, anim = null, viewOffsetPx = 0, dirty = true, shadowDirty = true;
  const raycaster = new T.Raycaster();
  const mouse = new T.Vector2();
  const cb = { hover: () => {}, click: () => {} };
  const OX = -12.75, OZ = -8.5; // dời tâm mặt bằng về gốc toạ độ

  /* ---------- Vật liệu ---------- */
  function woodTexture(base, line) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row++) {
      const y = row * 32, off = (row % 3) * 120;
      for (let x = -off; x < 512; x += 260) {
        const v = 0.9 + Math.random() * 0.2;
        g.fillStyle = `rgba(${v > 1 ? 255 : 60},${v > 1 ? 230 : 40},${v > 1 ? 200 : 20},${Math.abs(v - 1) * 0.6})`;
        g.fillRect(x, y, 258, 31);
        g.fillStyle = line; g.fillRect(x + 258, y, 2, 32);
      }
      g.fillStyle = line; g.fillRect(0, y + 31, 512, 1);
      for (let k = 0; k < 18; k++) { // vân gỗ
        g.strokeStyle = 'rgba(90,60,30,0.07)'; g.beginPath();
        const yy = y + Math.random() * 30; g.moveTo(0, yy);
        g.bezierCurveTo(170, yy + 3, 340, yy - 3, 512, yy + 1); g.stroke();
      }
    }
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = 8;
    return t;
  }
  function tileTexture(base, grout, n) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(150,150,160,0.12)'; g.beginPath(); g.moveTo(Math.random() * 256, Math.random() * 256); g.lineTo(Math.random() * 256, Math.random() * 256); g.stroke(); }
    g.fillStyle = grout; const s = 256 / n;
    for (let i = 0; i <= n; i++) { g.fillRect(i * s, 0, 1.5, 256); g.fillRect(0, i * s, 256, 1.5); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; return t;
  }

  const M = {};
  function makeMaterials() {
    const std = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0 }, o));
    M.wood = std(0xffffff, { map: woodTexture('#c49a6c', 'rgba(70,45,20,0.35)'), roughness: 0.6 });
    M.deck = std(0xffffff, { map: woodTexture('#8a6143', 'rgba(30,18,8,0.6)'), roughness: 0.8 });
    M.tile = std(0xffffff, { map: tileTexture('#ece9e4', '#cfcac2', 4), roughness: 0.35 });
    M.wall = std(0xf4efe7, { roughness: 0.9 });
    M.wallTop = std(0xffffff, { roughness: 0.9 });
    M.slab = std(0xe8e3da, { roughness: 0.9 });
    M.glass = new T.MeshStandardMaterial({ color: 0xcfe3ee, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false });
    M.black = std(0x1c1c1f, { roughness: 0.4, metalness: 0.4 });
    M.marbleBlack = std(0x18181a, { roughness: 0.2, metalness: 0.1 });
    M.fabric = std(0xece6da, { roughness: 1 });
    M.fabricDark = std(0x9a8f80, { roughness: 1 });
    M.linen = std(0xfaf8f4, { roughness: 1 });
    M.walnut = std(0x6b4a33, { roughness: 0.55 });
    M.oak = std(0xb88a5c, { roughness: 0.6 });
    M.white = std(0xf8f8f6, { roughness: 0.35 });
    M.rug = std(0xd9cfbf, { roughness: 1 });
    M.rugGrey = std(0xbdb8b0, { roughness: 1 });
    M.leaf = std(0x5d7a45, { roughness: 0.9 });
    M.pot = std(0xe2ddd3, { roughness: 0.8 });
    M.water = new T.MeshStandardMaterial({ color: 0x3fb4d8, roughness: 0.1, metalness: 0.1, emissive: 0x0b4a66, emissiveIntensity: 0.4 });
    M.screen = std(0x0b0d12, { roughness: 0.2, metalness: 0.6 });
    M.lamp = new T.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 1.2 });
    M.art = std(0x2c3440);
  }

  /* ---------- Hàm dựng hình ---------- */
  const P = (x, z) => [x + OX, z + OZ];
  function box(w, h, d, mat, x, y, z, parent, opts = {}) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    const [px, pz] = P(x, z);
    m.position.set(px, y + h / 2, pz);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    (parent || root).add(m); return m;
  }
  // box theo toạ độ góc (x1,z1)-(x2,z2)
  function boxXZ(x1, z1, x2, z2, y, h, mat, parent, opts) {
    return box(Math.abs(x2 - x1), h, Math.abs(z2 - z1), mat, (x1 + x2) / 2, y, (z1 + z2) / 2, parent, opts);
  }
  function cyl(r, h, mat, x, y, z, seg = 24, parent) {
    const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg), mat);
    const [px, pz] = P(x, z); m.position.set(px, y + h / 2, pz);
    m.castShadow = true; m.receiveShadow = true; (parent || root).add(m); return m;
  }
  function plant(x, z, s = 1) {
    cyl(0.28 * s, 0.5 * s, M.pot, x, 0, z);
    const g = new T.IcosahedronGeometry(0.55 * s, 1);
    [[0, 1.0, 0, 1], [0.25, 1.35, 0.1, 0.75], [-0.2, 1.3, -0.15, 0.7]].forEach(([dx, y, dz, k]) => {
      const m = new T.Mesh(g, M.leaf); const [px, pz] = P(x + dx * s, z + dz * s);
      m.position.set(px, y * s, pz); m.scale.setScalar(k); m.castShadow = true; root.add(m);
    });
  }
  function chair(x, z, ry = 0, mat = M.fabric) {
    const g = new T.Group(); root.add(g);
    const [px, pz] = P(x, z); g.position.set(px, 0, pz); g.rotation.y = ry;
    const seat = new T.Mesh(new T.BoxGeometry(0.5, 0.08, 0.5), mat); seat.position.y = 0.46; g.add(seat);
    const back = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.07), mat); back.position.set(0, 0.75, -0.22); g.add(back);
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([a, b]) => {
      const l = new T.Mesh(new T.BoxGeometry(0.04, 0.46, 0.04), M.walnut); l.position.set(a, 0.23, b); g.add(l);
    });
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  function bed(x1, z1, w, d, headSide) { // headSide: 'n' | 'w' | 'e'
    boxXZ(x1, z1, x1 + w, z1 + d, 0, 0.32, M.walnut);
    boxXZ(x1 + 0.05, z1 + 0.05, x1 + w - 0.05, z1 + d - 0.05, 0.32, 0.22, M.linen);
    if (headSide === 'n') {
      boxXZ(x1 - 0.1, z1 - 0.12, x1 + w + 0.1, z1 + 0.02, 0, 1.15, M.fabricDark);
      boxXZ(x1 + 0.15, z1 + 0.15, x1 + w / 2 - 0.08, z1 + 0.55, 0.54, 0.16, M.white);
      boxXZ(x1 + w / 2 + 0.08, z1 + 0.15, x1 + w - 0.15, z1 + 0.55, 0.54, 0.16, M.white);
      boxXZ(x1 + 0.05, z1 + d * 0.62, x1 + w - 0.05, z1 + d - 0.05, 0.54, 0.04, M.fabricDark);
    } else {
      const hx = headSide === 'w' ? x1 : x1 + w;
      const s = headSide === 'w' ? 1 : -1;
      boxXZ(hx - 0.12 * s, z1 - 0.1, hx + 0.02 * s, z1 + d + 0.1, 0, 1.15, M.fabricDark);
      boxXZ(hx + 0.15 * s, z1 + 0.15, hx + 0.55 * s, z1 + d / 2 - 0.08, 0.54, 0.16, M.white);
      boxXZ(hx + 0.15 * s, z1 + d / 2 + 0.08, hx + 0.55 * s, z1 + d - 0.15, 0.54, 0.16, M.white);
      const fx = headSide === 'w' ? x1 + w * 0.62 : x1 + 0.05;
      boxXZ(fx, z1 + 0.05, fx + w * 0.33, z1 + d - 0.05, 0.54, 0.04, M.fabricDark);
    }
  }
  function nightstand(x, z) {
    box(0.5, 0.5, 0.45, M.walnut, x, 0, z);
    cyl(0.12, 0.3, M.lamp, x, 0.5, z, 16);
  }
  function sofaL(x1, z1) {
    // phần dài dọc trục z (lưng sát x1), phần ngắn dọc trục x
    boxXZ(x1, z1, x1 + 1.0, z1 + 4.4, 0, 0.42, M.fabric);
    boxXZ(x1, z1, x1 + 0.25, z1 + 4.4, 0.42, 0.42, M.fabric);
    boxXZ(x1, z1 + 3.4, x1 + 3.6, z1 + 4.4, 0, 0.42, M.fabric);
    boxXZ(x1, z1 + 4.15, x1 + 3.6, z1 + 4.4, 0.42, 0.42, M.fabric);
    for (let i = 0; i < 3; i++) boxXZ(x1 + 0.3, z1 + 0.25 + i * 1.0, x1 + 0.45, z1 + 0.95 + i * 1.0, 0.42, 0.35, M.linen);
  }
  function lounger(x, z, ry) {
    const g = new T.Group(); root.add(g); const [px, pz] = P(x, z);
    g.position.set(px, 0, pz); g.rotation.y = ry;
    const base = new T.Mesh(new T.BoxGeometry(0.7, 0.3, 1.9), M.walnut); base.position.y = 0.15; g.add(base);
    const cush = new T.Mesh(new T.BoxGeometry(0.66, 0.1, 1.3), M.linen); cush.position.set(0, 0.35, 0.28); g.add(cush);
    const back = new T.Mesh(new T.BoxGeometry(0.66, 0.1, 0.7), M.linen); back.position.set(0, 0.55, -0.55); back.rotation.x = -0.6; g.add(back);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  /* ---------- Tường ---------- */
  const WALL_H = 1.55, WALL_T = 0.16;
  function wall(x1, z1, x2, z2, kind) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const horiz = Math.abs(z2 - z1) < 0.001;
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    if (kind === 'glass') {
      const g = box(horiz ? len : 0.05, 2.2, horiz ? 0.05 : len, M.glass, cx, 0, cz, null, { cast: false });
      g.renderOrder = 2;
      // khung kính
      const n = Math.max(2, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) {
        const t = i / n; const px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
        box(0.06, 2.2, 0.06, M.black, px, 0, pz);
      }
      boxXZ(horiz ? x1 : x1 - 0.04, horiz ? z1 - 0.04 : z1, horiz ? x2 : x1 + 0.04, horiz ? z1 + 0.04 : z2, 2.2, 0.06, M.black);
      return;
    }
    box(horiz ? len + WALL_T : WALL_T, WALL_H, horiz ? WALL_T : len + WALL_T, M.wall, cx, 0, cz);
    box(horiz ? len + WALL_T : WALL_T + 0.002, 0.012, horiz ? WALL_T + 0.002 : len + WALL_T, M.wallTop, cx, WALL_H, cz, null, { cast: false });
  }

  /* ---------- Dựng căn hộ ---------- */
  const cache = {};
  function getBuild(floor) {
    if (!cache[floor.type]) {
      const prev = { root, pickables, hotspots };
      build(floor);
      mergeStatic(root);
      cache[floor.type] = { root, pickables, hotspots };
      root.visible = false;
      ({ root, pickables, hotspots } = prev);
      shadowDirty = true;
    }
    return cache[floor.type];
  }

  // Gộp mọi mesh tĩnh cùng vật liệu thành 1 draw call (≈ 600 → ≈ 40 draw calls)
  function mergeStatic(group) {
    group.updateMatrixWorld(true);
    const buckets = new Map(), olds = [];
    group.traverse((o) => {
      if (!o.isMesh || o.userData.room) return;
      const key = o.material.uuid + '|' + o.castShadow + '|' + o.renderOrder;
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, order: o.renderOrder, geos: [] });
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      ['position', 'normal', 'uv'].forEach((a) => { if (!g.attributes[a]) g = null; });
      if (g) { Object.keys(g.attributes).forEach((a) => { if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); }); buckets.get(key).geos.push(g); }
      olds.push(o);
    });
    olds.forEach((o) => { o.parent.remove(o); o.geometry.dispose(); });
    // dọn các Group rỗng
    [...group.children].forEach((c) => { if (!c.isMesh && c.children.length === 0) group.remove(c); });
    buckets.forEach((b) => {
      if (!b.geos.length) return;
      const merged = T.BufferGeometryUtils.mergeBufferGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      const m = new T.Mesh(merged, b.mat);
      m.castShadow = b.cast; m.receiveShadow = true; m.renderOrder = b.order;
      m.matrixAutoUpdate = false;
      group.add(m);
    });
  }

  function build(floor) {
    root = new T.Group(); scene.add(root);
    pickables = []; hotspots = [];
    const type = UNIT_TYPES[floor.type];
    const lShape = type.terrace === 'L';
    const IW = PLAN.interior.w, ID = PLAN.interior.d;
    const deckX2 = lShape ? 25.5 : IW;

    // Đế mô hình
    boxXZ(-0.3, -0.3, IW + 0.3, 16.8, -0.6, 0.6, M.slab, null, { cast: false });
    if (lShape) boxXZ(IW + 0.3, 1.2, deckX2 + 0.3, 16.8, -0.6, 0.6, M.slab, null, { cast: false });
    // Sàn từng phòng
    PLAN.rooms.forEach((r) => {
      if (r.key === 'terrace') return;
      const mat = r.type === 'bath' ? M.tile : M.wood;
      const f = boxXZ(r.x, r.z, r.x + r.w, r.z + r.d, 0, 0.02, mat.clone(), null, { cast: false });
      f.material.map = mat.map.clone(); f.material.map.needsUpdate = true;
      f.material.map.repeat.set(r.w / (r.type === 'bath' ? 1.6 : 4), r.d / (r.type === 'bath' ? 1.6 : 4));
      addPick(r, f);
    });

    // Ban công
    const decks = [];
    decks.push(boxXZ(0, ID, deckX2, 16.5, 0, 0.05, M.deck, null, { cast: false }));
    if (lShape) decks.push(boxXZ(IW, 1.5, deckX2, ID, 0, 0.05, M.deck, null, { cast: false }));
    decks.forEach((d) => { d.material = M.deck.clone(); d.material.map = M.deck.map.clone(); d.material.map.needsUpdate = true; d.material.map.repeat.set(d.geometry.parameters.width / 3, d.geometry.parameters.depth / 3); });
    const terraceRoom = PLAN.rooms.find((r) => r.key === 'terrace');
    decks.forEach((d) => addPick(terraceRoom, d));

    // Lan can kính ban công
    const rail = (x1, z1, x2, z2) => {
      const horiz = Math.abs(z2 - z1) < 0.001, len = Math.hypot(x2 - x1, z2 - z1);
      box(horiz ? len : 0.04, 1.1, horiz ? 0.04 : len, M.glass, (x1 + x2) / 2, 0.05, (z1 + z2) / 2, null, { cast: false }).renderOrder = 2;
      boxXZ(horiz ? x1 : x1 - 0.05, horiz ? z1 - 0.05 : z1, horiz ? x2 : x1 + 0.05, horiz ? z1 + 0.05 : z2, 1.12, 0.06, M.black);
      const n = Math.round(len / 1.8);
      for (let i = 0; i <= n; i++) box(0.07, 1.15, 0.07, M.black, x1 + (x2 - x1) * i / n, 0.05, z1 + (z2 - z1) * i / n);
    };
    rail(0, 16.5, deckX2, 16.5);
    if (lShape) { rail(deckX2, 1.5, deckX2, 16.5); rail(IW, 1.5, deckX2, 1.5); }
    else rail(IW, ID, IW, 16.5);
    rail(0, ID, 0, 16.5);

    // Tường
    PLAN.walls.forEach((w) => wall(...w));

    furnish(floor, type, lShape);
    computeHotspots(type, lShape);
  }

  function addPick(room, mesh) {
    const overlay = new T.Mesh(
      new T.PlaneGeometry(mesh.geometry.parameters.width, mesh.geometry.parameters.depth),
      new T.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.22, depthWrite: false, visible: false })
    );
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.set(mesh.position.x, 0.07, mesh.position.z);
    overlay.userData.room = room; overlay.renderOrder = 3;
    root.add(overlay); pickables.push(overlay);
  }

  function furnish(floor, type, lShape) {
    const isStudy = floor.type === '2br';
    // --- Phòng ngủ 2
    boxXZ(0.6, 0.6, 4.9, 4.4, 0, 0.01, M.rug, null, { cast: false });
    bed(1.6, 0.35, 2.0, 2.4, 'n');
    nightstand(1.1, 0.6); nightstand(4.1, 0.6);
    boxXZ(0.12, 3.1, 0.75, 4.85, 0, 1.4, M.oak);
    // --- Phòng tắm 2
    boxXZ(5.65, 0.2, 6.25, 1.8, 0, 0.85, M.white); boxXZ(5.6, 0.2, 6.3, 1.8, 0.85, 0.04, M.marbleBlack);
    cyl(0.22, 0.4, M.white, 6.0, 0, 2.6, 16);
    boxXZ(6.9, 3.5, 8.35, 4.85, 0, 0.04, M.white);
    box(0.04, 1.9, 1.35, M.glass, 6.9, 0, 4.17, null, { cast: false }).renderOrder = 2;
    // --- Sảnh
    boxXZ(8.7, 1.4, 9.1, 3.6, 0, 0.8, M.walnut);
    cyl(0.9, 0.01, M.rugGrey, 10.3, 0, 2.6, 40);
    plant(11.4, 4.3, 0.8);
    box(0.02, 0.8, 1.2, M.art, 8.62, 0.95, 2.5);
    // --- Bếp
    boxXZ(12.2, 0.12, 16.0, 0.75, 0, 0.88, M.oak); boxXZ(12.2, 0.1, 16.0, 0.78, 0.88, 0.04, M.white);
    boxXZ(16.05, 0.12, 16.85, 0.85, 0, 2.1, M.oak);                       // tủ lạnh âm tủ
    boxXZ(13.4, 0.12, 14.6, 0.6, 1.35, 0.5, M.white);                      // hút mùi
    boxXZ(13.2, 2.4, 16.2, 3.5, 0, 0.88, M.walnut); boxXZ(13.1, 2.35, 16.3, 3.55, 0.88, 0.06, M.marbleBlack);
    for (let i = 0; i < 4; i++) { cyl(0.2, 0.06, M.walnut, 13.6 + i * 0.8, 0.68, 4.05, 16); cyl(0.03, 0.68, M.black, 13.6 + i * 0.8, 0, 4.05, 8); }
    box(0.5, 0.1, 0.5, M.leaf, 15.6, 0.94, 2.95);
    // --- Spa bath
    const tub = new T.Mesh(new T.CapsuleGeometry(0.55, 1.0, 6, 16), M.white);
    tub.rotation.z = Math.PI / 2; tub.scale.set(0.8, 1, 1); const [tx, tz] = P(19.4, 3.6); tub.position.set(tx, 0.45, tz); tub.castShadow = true; root.add(tub);
    boxXZ(17.3, 0.15, 20.1, 0.7, 0, 0.85, M.walnut); boxXZ(17.25, 0.12, 20.15, 0.73, 0.85, 0.05, M.white);
    cyl(0.18, 0.06, M.white, 18.0, 0.9, 0.42, 16); cyl(0.18, 0.06, M.white, 19.4, 0.9, 0.42, 16);
    boxXZ(20.4, 0.15, 21.85, 2.0, 0, 0.04, M.white);
    box(0.04, 1.9, 1.85, M.glass, 20.4, 0, 1.08, null, { cast: false }).renderOrder = 2;
    plant(21.4, 4.4, 0.6);
    // --- Phòng ngủ 3 / Phòng làm việc
    if (isStudy) {
      boxXZ(0.15, 7.5, 0.85, 10.5, 0, 0.75, M.walnut);
      chair(1.25, 9.0, -Math.PI / 2, M.black);
      boxXZ(0.12, 11.0, 0.55, 12.85, 0, 1.45, M.oak);
      boxXZ(3.2, 10.6, 4.4, 11.8, 0, 0.42, M.fabricDark); boxXZ(3.2, 11.6, 4.4, 11.8, 0.42, 0.4, M.fabricDark);
      cyl(1.1, 0.01, M.rug, 3.0, 0, 9.3, 40);
      plant(4.8, 7.2, 0.7);
    } else {
      boxXZ(0.8, 7.4, 4.8, 12.2, 0, 0.01, M.rug, null, { cast: false });
      bed(0.2, 8.6, 2.4, 2.0, 'w');
      nightstand(0.45, 8.1); nightstand(0.45, 11.1);
      boxXZ(4.2, 6.75, 5.3, 8.2, 0, 1.4, M.oak);
    }
    // --- Phòng ăn
    boxXZ(6.6, 8.5, 9.9, 9.7, 0.74, 0.06, M.walnut);
    box(0.12, 0.74, 0.12, M.black, 6.9, 0, 9.1); box(0.12, 0.74, 0.12, M.black, 9.6, 0, 9.1);
    [7.1, 8.25, 9.4].forEach((x) => { chair(x, 8.1, 0); chair(x, 10.1, Math.PI); });
    chair(6.1, 9.1, Math.PI / 2); chair(10.4, 9.1, -Math.PI / 2);
    const pend = cyl(0.5, 0.08, M.lamp, 8.25, 2.0, 9.1, 32); pend.castShadow = false;
    box(0.5, 0.06, 0.25, M.leaf, 8.25, 0.8, 9.1);
    plant(6.0, 12.4, 0.75);
    // --- Phòng khách
    boxXZ(11.7, 7.0, 16.2, 12.2, 0, 0.012, M.rug, null, { cast: false });
    sofaL(11.7, 7.6);
    boxXZ(13.6, 8.8, 15.2, 10.4, 0, 0.36, M.marbleBlack);
    box(0.4, 0.06, 0.4, M.lamp, 14.4, 0.36, 9.6);
    boxXZ(16.35, 7.6, 16.85, 11.4, 0, 0.5, M.walnut);             // kệ TV
    boxXZ(16.6, 8.2, 16.75, 10.8, 0.75, 0.72, M.screen);           // TV
    boxXZ(16.4, 8.0, 16.85, 11.0, 0.5, 0.18, M.lamp);              // lò sưởi điện
    plant(12.0, 5.6, 0.8);
    // --- Master
    boxXZ(17.5, 6.9, 21.5, 12.3, 0, 0.01, M.rugGrey, null, { cast: false });
    bed(17.3, 7.9, 2.6, 2.4, 'w');
    nightstand(17.55, 7.4); nightstand(17.55, 10.75);
    boxXZ(20.6, 11.4, 21.6, 12.4, 0, 0.42, M.fabric); boxXZ(21.35, 11.4, 21.6, 12.4, 0.42, 0.4, M.fabric);
    plant(21.4, 5.7, 0.7);
    // --- Ban công
    [3, 5, 7].forEach((x) => lounger(x, 14.9, 0));
    cyl(0.25, 0.4, M.walnut, 4.0, 0, 14.4, 16);
    plant(0.6, 15.9, 0.9); plant(10.5, 15.9, 0.9);
    if (lShape) {
      plant(25.0, 15.9, 1.0); plant(25.0, 2.1, 0.9);
      if (type.pool) {
        boxXZ(22.6, 3.0, 25.0, 11.0, 0.05, 0.04, M.water, null, { cast: false });
        boxXZ(22.45, 2.85, 25.15, 3.0, 0.05, 0.2, M.white); boxXZ(22.45, 11.0, 25.15, 11.15, 0.05, 0.2, M.white);
        [13.5, 16].forEach((x) => lounger(x, 14.9, 0));
      } else {
        // bàn ăn ngoài trời
        cyl(0.6, 0.06, M.walnut, 23.8, 0.72, 5.5, 32); cyl(0.06, 0.72, M.black, 23.8, 0, 5.5, 8);
        chair(23.0, 5.5, Math.PI / 2, M.linen); chair(24.6, 5.5, -Math.PI / 2, M.linen);
        chair(23.8, 4.7, 0, M.linen); chair(23.8, 6.3, Math.PI, M.linen);
        [23.75].forEach((x) => { lounger(x, 9.5, Math.PI / 2 * 0); });
      }
      if (type.jacuzzi) {
        const ring = cyl(1.15, 0.5, M.white, 19.5, 0.05, 15.0, 40);
        cyl(0.95, 0.03, M.water, 19.5, 0.53, 15.0, 40);
        ring.castShadow = true;
      } else {
        [14, 16.5, 19].forEach((x) => lounger(x, 14.9, 0));
      }
    } else {
      [14, 16.5, 19].forEach((x) => lounger(x, 14.9, 0));
    }
  }

  const vn = (n) => n.toFixed(1).replace('.', ',');
  function computeHotspots(type, lShape) {
    const s = type.scale;
    PLAN.rooms.forEach((r) => {
      let cx = r.x + r.w / 2, cz = r.z + r.d / 2;
      let w = r.w, d = r.d, area;
      let room = Object.assign({}, r);
      if (r.key === 'bed3' && UNIT_TYPES['2br'] === type) { room.type = 'study'; room.name = 'Phòng làm việc'; }
      if (r.key === 'terrace') {
        cx = 12; cz = 14.8;
        w = lShape ? 25.5 : 22; area = (w * 3.5 + (lShape ? 3.5 * 11.5 : 0)) * s * s;
      }
      area = area || w * d * s * s;
      const [px, pz] = P(cx, cz);
      hotspots.push({
        room, pos: new T.Vector3(px, 1.0, pz),
        dims: r.key === 'terrace' && lShape ? 'Chữ L · ' + vn(25.5 * s) + ' × ' + vn(15 * s) + ' m' : vn(w * s) + ' × ' + vn(d * s) + ' m',
        area: Math.round(area * 10) / 10,
      });
    });
    // gắn dữ liệu đã tính vào overlay
    pickables.forEach((p) => {
      const h = hotspots.find((x) => x.room.key === p.userData.room.key);
      p.userData.hotspot = h;
    });
  }

  /* ---------- Camera ---------- */
  function idealCamera() {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const k = Math.max(1.22, (aspect < 0.8 ? 1.3 : 1.9) / aspect);
    const pos = new T.Vector3(17 * k, 25 * k, 25 * k);
    controls.maxDistance = Math.max(70, pos.length() * 1.5);
    return { pos, target: new T.Vector3(0.5, 0, aspect < 0.8 ? 2.5 : 0) };
  }
  function animateCamera(fromPos, toPos, fromT, toT, dur, done) {
    const t0 = performance.now();
    anim = (now) => {
      let t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.lerpVectors(fromPos, toPos, e);
      controls.target.lerpVectors(fromT, toT, e);
      if (t >= 1) { anim = null; done && done(); }
    };
  }

  /* ---------- Vòng lặp ---------- */
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    if (anim) { anim(performance.now()); dirty = true; }
    if (controls.update()) dirty = true;
    if (!dirty) return;
    dirty = false;
    if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    renderer.render(scene, camera);
    cb.frame && cb.frame();
  }
  function resize() {
    if (!container) return;
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (viewOffsetPx) camera.setViewOffset(w, h, viewOffsetPx, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    dirty = true;
  }

  /* ---------- Tương tác ---------- */
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object : null;
  }
  function setHover(obj) {
    if (hovered === obj) return;
    hovered = obj;
    pickables.forEach((p) => { p.material.visible = !!obj && p.userData.room.key === obj.userData.room.key; });
    dirty = true;
    renderer.domElement.style.cursor = obj ? 'pointer' : 'grab';
    cb.hover(obj ? obj.userData.hotspot : null);
  }

  return {
    init(el) {
      container = el; makeMaterials();
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 900 ? 2 : 1.5));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false; // cảnh tĩnh → chỉ tính bóng 1 lần
      el.appendChild(renderer.domElement);
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(32, 1, 0.5, 400);
      camera.position.set(0, 80, 1);

      scene.add(new T.HemisphereLight(0xe6eeff, 0x4a3a2a, 0.75));
      const sun = new T.DirectionalLight(0xfff3e0, 1.35);
      sun.position.set(-14, 30, 18); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
      sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
      scene.add(sun);
      const fill = new T.DirectionalLight(0xa9c4ff, 0.35); fill.position.set(20, 12, -10); scene.add(fill);

      controls = new T.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; controls.dampingFactor = 0.08;
      controls.minDistance = 12; controls.maxDistance = 70;
      controls.minPolarAngle = 0.1; controls.maxPolarAngle = 1.2;
      controls.enablePan = true; controls.screenSpacePanning = false;
      controls.addEventListener('change', () => { dirty = true; });

      const dom = renderer.domElement;
      let down = null;
      dom.addEventListener('pointermove', (e) => { if (!anim && e.pointerType === 'mouse') setHover(pick(e)); });
      dom.addEventListener('pointerleave', () => setHover(null));
      dom.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
      dom.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
        const o = pick(e); if (o) cb.click(o.userData.hotspot);
      });
      window.addEventListener('resize', resize);
      resize();
    },
    load(floor) {
      const b = getBuild(floor);
      if (root) root.visible = false;
      ({ root, pickables, hotspots } = b);
      root.visible = true; shadowDirty = true; dirty = true;
      setHover(null);
    },
    // Dựng sẵn + biên dịch shader trước để lúc chuyển cảnh không bị khựng
    prewarm(floor) {
      const b = getBuild(floor);
      const was = b.root.visible; b.root.visible = true;
      renderer.compile(scene, camera);
      b.root.visible = was;
    },
    start() { if (!running) { running = true; resize(); loop(); } },
    stop() { running = false; },
    intro(done) {
      const ideal = idealCamera();
      const from = new T.Vector3(ideal.pos.x * 0.15, 95, ideal.pos.z * 0.15 + 2);
      camera.position.copy(from); controls.target.set(0, 0, 0); controls.enabled = false;
      animateCamera(from, ideal.pos, new T.Vector3(0, 0, 0), ideal.target, 2200, () => { controls.enabled = true; done && done(); });
    },
    resetView() {
      const ideal = idealCamera();
      animateCamera(camera.position.clone(), ideal.pos, controls.target.clone(), ideal.target, 1100);
    },
    focus(hotspot) {
      const tgt = hotspot.pos.clone().setY(0);
      const dir = camera.position.clone().sub(controls.target).normalize();
      animateCamera(camera.position.clone(), tgt.clone().add(dir.multiplyScalar(20)), controls.target.clone(), tgt, 900);
    },
    setViewOffset(px) { viewOffsetPx = px; resize(); },
    project(v) {
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * container.clientWidth, y: (-p.y * 0.5 + 0.5) * container.clientHeight, behind: p.z > 1 };
    },
    get hotspots() { return hotspots; },
    info() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries }; },
    on(name, fn) { cb[name] = fn; },
    highlight(key) {
      const obj = key ? pickables.find((p) => p.userData.room.key === key) : null;
      pickables.forEach((p) => { p.material.visible = !!obj && p.userData.room.key === key; });
      dirty = true;
    },
  };
})();
