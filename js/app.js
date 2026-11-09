/* =========================================================
   ỨNG DỤNG: Tòa nhà → Zoom tầng → 3D căn hộ → Gallery nội thất
   ========================================================= */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  const state = { view: 'tower', floor: null, hoverFloor: null, busy: false, gallery: null };

  const fmtPrice = (ty) => ty.toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' tỷ';
  const floorById = (id) => FLOORS.find((f) => String(f.id) === String(id));
  const geoById = (id) => FLOOR_GEO.find((g) => String(g.id) === String(id));
  const statusClass = (s) => (s === 'Đã bán' ? 'sold' : s === 'Đang giữ chỗ' ? 'hold' : '');
  const unitArea = (f) => { const t = UNIT_TYPES[f.type]; return Math.round(PLAN.interior.w * PLAN.interior.d * t.scale * t.scale); };

  /* =================== VIEW 1: TÒA NHÀ =================== */
  const svg = $('#towerSvg'), gFloors = $('#floors'), dimHole = $('#dimHole');
  const towerView = $('#towerView'), stage = $('#stage');

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent && parent.appendChild(n); return n;
  }

  FLOOR_GEO.forEach((g) => {
    const grp = el('g', { class: 'floor', 'data-id': g.id, tabindex: 0, role: 'button', 'aria-label': (g.id === 'TOP' ? 'Tầng Top' : 'Tầng ' + g.id) }, gFloors);
    const shapes = [];
    if (g.rects) g.rects.forEach((r) => shapes.push(['rect', { x: r.x, y: r.y, width: r.w, height: r.h }]));
    if (g.polys) g.polys.forEach((p) => shapes.push(['polygon', { points: p }]));
    shapes.forEach(([t, a]) => el(t, Object.assign({ class: 'lit' }, a), grp));
    shapes.forEach(([t, a]) => el(t, Object.assign({ class: 'halo', fill: 'none' }, a), grp));
    shapes.forEach(([t, a]) => el(t, Object.assign({ class: 'edge', fill: 'none' }, a), grp));
    shapes.forEach(([t, a]) => el(t, Object.assign({ class: 'hit' }, a), grp));
    g._shapes = shapes;
    grp.addEventListener('mouseenter', () => hoverFloor(g.id));
    grp.addEventListener('mouseleave', () => hoverFloor(null));
    grp.addEventListener('focus', () => hoverFloor(g.id));
    grp.addEventListener('blur', () => hoverFloor(null));
    grp.addEventListener('click', () => enterFloor(g.id));
    grp.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterFloor(g.id); } });
  });

  // Thanh chọn tầng
  const rail = $('#floorRail');
  FLOORS.forEach((f) => {
    const li = document.createElement('li');
    li.innerHTML = `<button data-id="${f.id}">${f.id === 'TOP' ? 'TOP' : 'T' + f.id}</button>`;
    const b = li.firstChild;
    b.addEventListener('mouseenter', () => hoverFloor(f.id));
    b.addEventListener('mouseleave', () => hoverFloor(null));
    b.addEventListener('click', () => enterFloor(f.id));
    rail.appendChild(li);
  });

  const callout = $('#callout'), cLine = $('#calloutLine');
  function hoverFloor(id) {
    if (state.busy || state.view !== 'tower') return;
    state.hoverFloor = id;
    $$('.floor', gFloors).forEach((n) => n.classList.toggle('active', String(n.dataset.id) === String(id)));
    $$('button', rail).forEach((b) => b.classList.toggle('active', String(b.dataset.id) === String(id)));
    towerView.classList.toggle('hovering', id != null);
    dimHole.innerHTML = '';
    if (id == null) { callout.classList.remove('show'); cLine.classList.remove('show'); return; }
    const g = geoById(id);
    g._shapes.forEach(([t, a]) => el(t, a, dimHole));
    prewarmType(id);
    const f = floorById(id), t = UNIT_TYPES[f.type];
    $('#coNum').textContent = f.id === 'TOP' ? 'TOP' : f.id;
    $('#coNum').style.fontSize = f.id === 'TOP' ? '28px' : '';
    $('#coName').textContent = t.name;
    $('#coMeta').textContent = `${t.beds} PN · ${t.baths} WC · ${unitArea(f)} m²`;
    const pill = $('#coStatus');
    pill.className = 'pill ' + statusClass(f.status);
    pill.textContent = f.status === 'Đã bán' ? 'ĐÃ BÁN' : `${f.status.toUpperCase()} · TỪ ${fmtPrice(f.price).toUpperCase()}`;
    placeCallout(g);
    callout.classList.add('show'); cLine.classList.add('show');
  }
  function svgToScreen(x, y) {
    const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    const p = pt.matrixTransform(svg.getScreenCTM()); return { x: p.x, y: p.y };
  }
  function placeCallout(g) {
    const yMid = (g.y1 + g.y2) / 2;
    const anchor = svgToScreen(1034, yMid);
    const W = window.innerWidth, H = window.innerHeight;
    const cw = callout.offsetWidth || 300;
    let left = anchor.x + (isMobile() ? 18 : 110);
    if (left + cw > W - (isMobile() ? 52 : 90)) left = Math.max(12, W - cw - (isMobile() ? 52 : 90));
    let top = Math.min(Math.max(anchor.y, 120), H - 90);
    callout.style.left = left + 'px'; callout.style.top = top + 'px';
    const line = cLine.querySelector('line'), dot = cLine.querySelector('circle');
    line.setAttribute('x1', anchor.x); line.setAttribute('y1', anchor.y);
    line.setAttribute('x2', left); line.setAttribute('y2', top);
    dot.setAttribute('cx', anchor.x); dot.setAttribute('cy', anchor.y);
    cLine.style.display = left > anchor.x + 8 ? '' : 'none';
  }
  window.addEventListener('resize', () => { if (state.hoverFloor != null) placeCallout(geoById(state.hoverFloor)); });

  /* =================== CHUYỂN CẢNH =================== */
  const aptView = $('#aptView'), three = $('#three'), flash = $('#flash');
  let sceneReady = false;
  function ensureScene() {
    if (sceneReady) return;
    Scene3D.init(three); sceneReady = true;
    Scene3D.on('frame', updateHotspots);
    Scene3D.on('hover', (h) => setHot(h ? h.room.key : null));
    Scene3D.on('click', (h) => openGallery(h.room.key));
  }

  // Dựng sẵn mô hình 3D lúc rảnh để click vào tầng là chuyển ngay, không khựng
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  const warmed = new Set();
  function prewarmType(id) {
    const f = floorById(id); if (!f || warmed.has(f.type)) return;
    warmed.add(f.type);
    idle(() => { ensureScene(); Scene3D.prewarm(f); }, { timeout: 1500 });
  }

  function enterFloor(id) {
    if (state.busy) return;
    if (state.view === 'apt') { switchFloor(id); return; }
    state.busy = true;
    hoverFloor(id); state.busy = true;
    const g = geoById(id);
    const yMid = (g.y1 + g.y2) / 2;
    const c = svgToScreen(931, yMid);
    const scale = isMobile() ? 3.2 : 4.6;
    towerView.classList.add('leaving');
    stage.style.transformOrigin = `${c.x}px ${c.y}px`;
    // dịch điểm tầng về giữa màn hình trong khi phóng to
    const dx = window.innerWidth / 2 - c.x, dy = window.innerHeight / 2 - c.y;
    stage.classList.add('zooming');
    requestAnimationFrame(() => {
      stage.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    });
    ensureScene();
    loadFloor(id);
    flash.style.setProperty('--fx', '50%'); flash.style.setProperty('--fy', '50%');
    setTimeout(() => flash.classList.add('on'), 1150);
    setTimeout(() => {
      towerView.classList.remove('is-active');
      aptView.classList.add('is-active');
      state.view = 'apt';
      Scene3D.start();
      Scene3D.setViewOffset(isMobile() ? 0 : 190);
      Scene3D.intro(() => { state.busy = false; showHotspots(true); });
      flash.classList.remove('on');
    }, 1800);
  }

  function backToTower() {
    if (state.busy) return;
    state.busy = true;
    closeGallery(true);
    showHotspots(false);
    flash.classList.add('on');
    setTimeout(() => {
      aptView.classList.remove('is-active');
      towerView.classList.add('is-active');
      Scene3D.stop();
      state.view = 'tower';
      flash.classList.remove('on');
      requestAnimationFrame(() => {
        stage.style.transform = '';
      });
      setTimeout(() => {
        stage.classList.remove('zooming'); towerView.classList.remove('leaving');
        state.busy = false; hoverFloor(null);
      }, 1750);
    }, 650);
  }

  function switchFloor(id) {
    if (String(id) === String(state.floor.id)) return;
    state.busy = true; showHotspots(false);
    three.classList.add('swap');
    setTimeout(() => {
      loadFloor(id);
      three.classList.remove('swap');
      Scene3D.intro(() => { state.busy = false; showHotspots(true); });
    }, 380);
  }

  /* =================== VIEW 2: CĂN HỘ =================== */
  const hsLayer = $('#hotspots'), roomList = $('#roomList');
  let hsEls = [];

  function loadFloor(id) {
    const f = floorById(id), t = UNIT_TYPES[f.type];
    state.floor = f;
    Scene3D.load(f);
    $('#pFloor').textContent = `${f.id === 'TOP' ? 'TẦNG TOP' : 'TẦNG ' + f.id} · ${f.status.toUpperCase()}`;
    $('#pName').textContent = t.name;
    $('#pBeds').textContent = t.beds;
    $('#pBaths').textContent = t.baths;
    $('#pArea').textContent = unitArea(f);
    $('#pPrice').textContent = f.status === 'Đã bán' ? 'Đã bán' : fmtPrice(f.price);
    $('#pDesc').textContent = t.desc;
    $('#pExtra').textContent = '✦ ' + t.extra + ' · Trần ' + String(t.ceiling).replace('.', ',') + 'm';
    const idx = FLOORS.indexOf(f);
    $('[data-action="floor-down"]').disabled = idx === 0;
    $('[data-action="floor-up"]').disabled = idx === FLOORS.length - 1;

    // hotspot + danh sách phòng
    hsLayer.innerHTML = ''; roomList.innerHTML = '';
    hsEls = Scene3D.hotspots.map((h) => {
      const d = document.createElement('button');
      d.className = 'hs'; d.setAttribute('aria-label', h.room.name);
      d.innerHTML = `<span>${h.room.name} · ${String(h.area).replace('.', ',')} m²</span>`;
      d.addEventListener('click', () => openGallery(h.room.key));
      d.addEventListener('mouseenter', () => { setHot(h.room.key); Scene3D.highlight(h.room.key); });
      d.addEventListener('mouseleave', () => { setHot(null); Scene3D.highlight(null); });
      hsLayer.appendChild(d);

      const li = document.createElement('li');
      li.innerHTML = `<button data-key="${h.room.key}">${h.room.name}<em>${String(h.area).replace('.', ',')} m²</em></button>`;
      li.firstChild.addEventListener('click', () => openGallery(h.room.key));
      li.firstChild.addEventListener('mouseenter', () => { setHot(h.room.key); Scene3D.highlight(h.room.key); });
      li.firstChild.addEventListener('mouseleave', () => { setHot(null); Scene3D.highlight(null); });
      roomList.appendChild(li);
      return { el: d, h };
    });
  }
  function showHotspots(on) {
    hsEls.forEach((o, i) => setTimeout(() => o.el.classList.toggle('on', on), on ? i * 70 : 0));
  }
  function updateHotspots() {
    hsEls.forEach((o) => {
      const p = Scene3D.project(o.h.pos);
      o.el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      o.el.style.visibility = p.behind ? 'hidden' : '';
    });
  }
  function setHot(key) {
    hsEls.forEach((o) => o.el.classList.toggle('hot', o.h.room.key === key));
    $$('button', roomList).forEach((b) => b.classList.toggle('hot', b.dataset.key === key));
  }

  /* =================== GALLERY =================== */
  const gal = $('#gallery'), gSlides = $('#gSlides'), gThumbs = $('#gThumbs'), gRooms = $('#gRooms'), gInfo = $('.g-info');
  const SLIDE_MS = 6500;
  let timer = null, progStart = 0, progRaf = null;

  function imagesFor(room) {
    const info = ROOM_INFO[room.type] || ROOM_INFO.living;
    // xoay vòng ảnh theo tầng để mỗi tầng có cảm giác khác
    const fi = FLOORS.indexOf(state.floor);
    const arr = info.imgs.slice();
    const shift = arr.length > 3 ? fi % arr.length : 0;
    const rot = arr.slice(shift).concat(arr.slice(0, shift));
    return rot.slice(0, Math.min(4, rot.length)).map((n) => `assets/interiors/${n}.jpg`);
  }

  function openGallery(key) {
    const hs = Scene3D.hotspots;
    const h = hs.find((x) => x.room.key === key); if (!h) return;
    Scene3D.highlight(key);
    const room = h.room, info = ROOM_INFO[room.type] || ROOM_INFO.living;
    const f = state.floor, t = UNIT_TYPES[f.type];
    const imgs = imagesFor(room);
    const first = !gal.classList.contains('open');
    state.gallery = { key, imgs, i: 0 };

    // tab phòng
    gRooms.innerHTML = '';
    hs.forEach((x) => {
      const b = document.createElement('button');
      b.textContent = x.room.name; b.className = x.room.key === key ? 'active' : '';
      b.addEventListener('click', () => openGallery(x.room.key));
      gRooms.appendChild(b);
    });
    const act = gRooms.querySelector('.active'); act && act.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });

    // nội dung thông số
    const apply = () => {
      $('#gEyebrow').textContent = `${f.id === 'TOP' ? 'Tầng Top' : 'Tầng ' + f.id} · ${t.name}`;
      $('#gTitle').textContent = room.name;
      $('#gSpecs').innerHTML = [
        ['Diện tích', `${String(h.area).replace('.', ',')} m²`, true],
        ['Kích thước', h.dims],
        ['Trần cao', room.type === 'terrace' ? 'Ngoài trời' : String(t.ceiling).replace('.', ',') + ' m'],
        ['Hướng / View', room.view],
        ['Vật liệu sàn', info.floor],
        ['Tình trạng', f.status],
      ].map(([k, v, big]) => `<div><dt>${k}</dt><dd${big ? ' class="big"' : ''}>${v}</dd></div>`).join('');
      $('#gFeatures').innerHTML = info.features.map((x) => `<li>${x}</li>`).join('');
    };
    if (first) apply(); else { gInfo.classList.add('swap'); setTimeout(() => { apply(); gInfo.classList.remove('swap'); }, 300); }

    // slide
    gSlides.innerHTML = ''; gThumbs.innerHTML = '';
    imgs.forEach((src, i) => {
      const s = document.createElement('div'); s.className = 'g-slide';
      const im = new Image(); im.src = src; im.alt = room.name + ' – ảnh ' + (i + 1);
      im.onerror = () => { s.classList.add('fallback'); im.remove(); };
      s.appendChild(im); gSlides.appendChild(s);
      const tb = document.createElement('button');
      tb.innerHTML = `<img src="${src.replace('/interiors/', '/interiors/thumbs/')}" alt="" loading="lazy">`; tb.addEventListener('click', () => go(i));
      gThumbs.appendChild(tb);
    });
    $('#gTotal').textContent = String(imgs.length).padStart(2, '0');
    go(0, true);
    if (first) { gal.classList.add('open'); gal.setAttribute('aria-hidden', 'false'); }
  }

  function go(i, instant) {
    const g = state.gallery; if (!g) return;
    const n = g.imgs.length; g.i = (i + n) % n;
    const slides = $$('.g-slide', gSlides);
    const img = slides[g.i] && slides[g.i].querySelector('img');
    const ready = img && img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    const token = (g.token = (g.token || 0) + 1);
    // chỉ crossfade khi ảnh đã giải mã xong → không giật khung
    ready.then(() => { if (state.gallery === g && g.token === token) slides.forEach((s, k) => s.classList.toggle('on', k === g.i)); });
    // tải trước ảnh kế tiếp
    const nx = slides[(g.i + 1) % n] && slides[(g.i + 1) % n].querySelector('img'); nx && nx.decode && nx.decode().catch(() => {});
    $$('button', gThumbs).forEach((b, k) => b.classList.toggle('active', k === g.i));
    $('#gIdx').textContent = String(g.i + 1).padStart(2, '0');
    restartTimer();
  }
  function restartTimer() {
    clearTimeout(timer); cancelAnimationFrame(progRaf);
    progStart = performance.now();
    const bar = $('#gProg');
    const tick = (now) => { bar.style.width = Math.min(100, ((now - progStart) / SLIDE_MS) * 100) + '%'; if (gal.classList.contains('open')) progRaf = requestAnimationFrame(tick); };
    progRaf = requestAnimationFrame(tick);
    timer = setTimeout(() => go(state.gallery.i + 1), SLIDE_MS);
  }
  function closeGallery(silent) {
    if (!gal.classList.contains('open')) return;
    gal.classList.remove('open'); gal.setAttribute('aria-hidden', 'true');
    clearTimeout(timer); cancelAnimationFrame(progRaf);
    state.gallery = null;
    if (!silent) Scene3D.highlight(null);
  }
  // vuốt trên điện thoại
  let sx = null;
  gal.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  gal.addEventListener('touchend', (e) => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(state.gallery.i + (dx < 0 ? 1 : -1)); sx = null;
  });

  /* =================== LIÊN HỆ =================== */
  const modal = $('#contact'), sel = $('#cInterest');
  Object.values(UNIT_TYPES).forEach((t) => { const o = document.createElement('option'); o.textContent = t.name; sel.appendChild(o); });
  function openContact() {
    if (state.floor && state.view === 'apt') {
      sel.value = UNIT_TYPES[state.floor.type].name;
      $('#cEyebrow').textContent = `${state.floor.id === 'TOP' ? 'Tầng Top' : 'Tầng ' + state.floor.id} · ${UNIT_TYPES[state.floor.type].name}`;
    } else $('#cEyebrow').textContent = 'LUMIÈRE TWIN';
    $('#cOk').hidden = true;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.querySelector('input').focus(), 200);
  }
  function closeContact() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeContact(); });
  $('#contactForm').addEventListener('submit', (e) => { e.preventDefault(); $('#cOk').hidden = false; e.target.reset(); setTimeout(closeContact, 1800); });

  /* =================== HÀNH ĐỘNG CHUNG =================== */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action],[data-goto]'); if (!a) return;
    if (a.dataset.goto) { e.preventDefault(); enterFloor(a.dataset.goto); return; }
    const act = a.dataset.action;
    if (act === 'home') { e.preventDefault(); if (state.view === 'apt') backToTower(); }
    else if (act === 'back') backToTower();
    else if (act === 'contact') openContact();
    else if (act === 'close-contact') closeContact();
    else if (act === 'close-gallery') closeGallery();
    else if (act === 'prev') go(state.gallery.i - 1);
    else if (act === 'next') go(state.gallery.i + 1);
    else if (act === 'reset-view') Scene3D.resetView();
    else if (act === 'toggle-panel') $('#panel').classList.toggle('expanded');
    else if (act === 'floor-up' || act === 'floor-down') {
      if (state.busy) return;
      const i = FLOORS.indexOf(state.floor) + (act === 'floor-up' ? 1 : -1);
      if (FLOORS[i]) switchFloor(FLOORS[i].id);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('open')) { if (e.key === 'Escape') closeContact(); return; }
    if (gal.classList.contains('open')) {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowRight') go(state.gallery.i + 1);
      if (e.key === 'ArrowLeft') go(state.gallery.i - 1);
      return;
    }
    if (state.view === 'apt' && e.key === 'Escape') backToTower();
  });
  window.addEventListener('resize', () => { if (state.view === 'apt') Scene3D.setViewOffset(isMobile() ? 0 : 190); });

  // khi trang đã tải: dựng sẵn từng loại căn, rồi tải trước ảnh nội thất
  window.addEventListener('load', () => {
    ['7', '1', '16', 'TOP'].forEach((id, i) => setTimeout(() => prewarmType(id), 600 + i * 500));
    setTimeout(() => {
      const all = new Set(); Object.values(ROOM_INFO).forEach((r) => r.imgs.forEach((n) => all.add(n)));
      all.forEach((n) => { const i = new Image(); i.src = `assets/interiors/${n}.jpg`; });
    }, 4000);
  });

  if (window.matchMedia('(hover: none)').matches) {
    $('.hint-tower').lastChild.textContent = 'Chạm vào một tầng để vào căn hộ';
  }

  // hỗ trợ link trực tiếp: index.html#floor=7
  const m = location.hash.match(/floor=(\w+)/);
  if (m && floorById(m[1])) setTimeout(() => enterFloor(m[1]), 400);
})();
