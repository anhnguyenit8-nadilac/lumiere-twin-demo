/* =========================================================
   ỨNG DỤNG: Tòa nhà → Zoom tầng → 3D căn hộ → Gallery nội thất
   Chạy được cả dạng trang độc lập lẫn nhúng trong WordPress (khung #lt-app)
   ========================================================= */
(function () {
function ltInit(app) {
  const $ = (s, el = app) => el.querySelector(s);
  const $$ = (s, el = app) => [...el.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vn = (n) => String(n).replace('.', ',');

  const state = { view: 'tower', floor: null, hoverFloor: null, busy: false, gallery: null };

  const fmtPrice = (ty) => ty.toFixed(1).replace(/\.0$/, '').replace('.', ',') + ' tỷ';
  const floorById = (id) => FLOORS.find((f) => String(f.id) === String(id));
  const geoById = (id) => FLOOR_GEO.find((g) => String(g.id) === String(id));
  const statusClass = (s) => (/bán|sold/i.test(s) ? 'sold' : /giữ|hold/i.test(s) ? 'hold' : '');
  const isSold = (s) => statusClass(s) === 'sold';
  const unitArea = (f) => {
    const t = UNIT_TYPES[f.type];
    return t.area || Math.round(PLAN.interior.w * PLAN.interior.d * t.scale * t.scale);
  };
  const floorName = (f) => (f.id === 'TOP' ? 'Tầng Top' : 'Tầng ' + f.id);
  const rel = () => app.getBoundingClientRect();

  /* =================== VIEW 1: TÒA NHÀ =================== */
  const svg = $('#towerSvg'), gFloors = $('#floors'), dimHole = $('#dimHole');
  const towerView = $('#towerView'), stage = $('#stage');

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent && parent.appendChild(n); return n;
  }

  FLOOR_GEO.forEach((g) => {
    if (!floorById(g.id)) return;
    const grp = el('g', { class: 'floor', 'data-id': g.id, tabindex: 0, role: 'button', 'aria-label': g.id === 'TOP' ? 'Tầng Top' : 'Tầng ' + g.id }, gFloors);
    const shapes = [];
    if (g.rects) g.rects.forEach((r) => shapes.push(['rect', { x: r.x, y: r.y, width: r.w, height: r.h }]));
    if (g.polys) g.polys.forEach((p) => shapes.push(['polygon', { points: p }]));
    ['lit', 'halo', 'edge', 'hit'].forEach((cls) => shapes.forEach(([t, a]) => el(t, Object.assign({ class: cls }, cls === 'halo' || cls === 'edge' ? { fill: 'none' } : {}, a), grp)));
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
    li.innerHTML = `<button type="button" data-id="${esc(f.id)}">${f.id === 'TOP' ? 'TOP' : 'T' + esc(f.id)}</button>`;
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
    const g = geoById(id), f = floorById(id);
    if (!g || !f) return;
    g._shapes.forEach(([t, a]) => el(t, a, dimHole));
    prewarmType(id);
    const t = UNIT_TYPES[f.type];
    $('#coNum').textContent = f.id === 'TOP' ? 'TOP' : f.id;
    $('#coNum').style.fontSize = f.id === 'TOP' ? '28px' : '';
    $('#coName').textContent = t.name;
    $('#coMeta').textContent = `${t.beds} PN · ${t.baths} WC · ${unitArea(f)} m²`;
    const pill = $('#coStatus');
    pill.className = 'pill ' + statusClass(f.status);
    pill.textContent = isSold(f.status) ? f.status.toUpperCase() : `${f.status.toUpperCase()} · TỪ ${fmtPrice(f.price).toUpperCase()}`;
    placeCallout(g);
    callout.classList.add('show'); cLine.classList.add('show');
  }
  // toạ độ ảnh → toạ độ trong khung #lt-app
  function svgToLocal(x, y) {
    const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
    const p = pt.matrixTransform(svg.getScreenCTM()); const r = rel();
    return { x: p.x - r.left, y: p.y - r.top };
  }
  function placeCallout(g) {
    const yMid = (g.y1 + g.y2) / 2;
    const anchor = svgToLocal(LT.tower.anchorX || Math.max(...(LT.tower.towers || [{ x2: 0 }]).map((t) => t.x2)) + 3, yMid);
    const r = rel(), W = r.width, H = r.height;
    const cw = callout.offsetWidth || 300;
    let left = anchor.x + (isMobile() ? 18 : 110);
    if (left + cw > W - (isMobile() ? 52 : 90)) left = Math.max(12, W - cw - (isMobile() ? 52 : 90));
    const top = Math.min(Math.max(anchor.y, 120), H - 90);
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
    Scene3D.on('click', (h) => h && openGallery(h.room.key));
  }

  // Dựng sẵn mô hình 3D lúc rảnh để click vào tầng là chuyển ngay, không khựng
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  const warmed = new Set();
  function prewarmType(id) {
    const f = floorById(id); if (!f || warmed.has(f.type)) return;
    warmed.add(f.type);
    idle(() => { ensureScene(); Scene3D.prewarm(f).catch(() => {}); }, { timeout: 1500 });
  }

  function enterFloor(id) {
    if (state.busy || !floorById(id)) return;
    if (state.view === 'apt') { switchFloor(id); return; }
    hoverFloor(id); state.busy = true;
    const g = geoById(id);
    const yMid = (g.y1 + g.y2) / 2;
    const xs = (LT.tower.towers || []).map((t) => [t.x1, t.x2]).flat();
    const c = svgToLocal(xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : LT.tower.w / 2, yMid);
    const r = rel();
    const scale = isMobile() ? 3.2 : 4.6;
    towerView.classList.add('leaving');
    stage.style.transformOrigin = `${c.x}px ${c.y}px`;
    const dx = r.width / 2 - c.x, dy = r.height / 2 - c.y;
    stage.classList.add('zooming');
    requestAnimationFrame(() => { stage.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`; });
    ensureScene();
    const loading = loadFloor(id);
    setTimeout(() => flash.classList.add('on'), 1150);
    setTimeout(() => {
      towerView.classList.remove('is-active');
      aptView.classList.add('is-active');
      state.view = 'apt';
      Scene3D.start();
      Scene3D.setViewOffset(isMobile() ? 0 : 190);
      flash.classList.remove('on');
      loading.then(() => Scene3D.intro(() => { state.busy = false; showHotspots(true); }));
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
      requestAnimationFrame(() => { stage.style.transform = ''; });
      setTimeout(() => {
        stage.classList.remove('zooming'); towerView.classList.remove('leaving');
        state.busy = false; hoverFloor(null);
      }, 1750);
    }, 650);
  }

  function switchFloor(id) {
    if (!state.floor || String(id) === String(state.floor.id)) return;
    state.busy = true; showHotspots(false);
    three.classList.add('swap');
    setTimeout(() => {
      loadFloor(id).then(() => {
        three.classList.remove('swap');
        Scene3D.intro(() => { state.busy = false; showHotspots(true); });
      });
    }, 380);
  }

  /* =================== VIEW 2: CĂN HỘ =================== */
  const hsLayer = $('#hotspots'), roomList = $('#roomList');
  let hsEls = [];

  // Trả về Promise: cập nhật panel ngay, hotspot sau khi model (GLB) tải xong
  function loadFloor(id) {
    const f = floorById(id), t = UNIT_TYPES[f.type];
    state.floor = f;
    $('#pFloor').textContent = `${floorName(f).toUpperCase()} · ${f.status.toUpperCase()}`;
    $('#pName').textContent = t.name;
    $('#pBeds').textContent = t.beds;
    $('#pBaths').textContent = t.baths;
    $('#pArea').textContent = unitArea(f);
    $('#pPrice').textContent = isSold(f.status) ? f.status : fmtPrice(f.price);
    $('#pDesc').textContent = t.desc;
    $('#pExtra').textContent = (t.extra ? '✦ ' + t.extra + ' · ' : '✦ ') + 'Trần ' + vn(t.ceiling) + 'm';
    const idx = FLOORS.indexOf(f);
    $('[data-action="floor-down"]').disabled = idx === 0;
    $('[data-action="floor-up"]').disabled = idx === FLOORS.length - 1;
    hsLayer.innerHTML = ''; roomList.innerHTML = ''; hsEls = [];

    aptView.classList.add('loading');
    return Scene3D.load(f).then((ok) => {
      if (ok === false || state.floor !== f) return;
      aptView.classList.remove('loading');
      buildRoomUI();
      // tải trước ảnh đầu tiên của mỗi phòng
      Scene3D.hotspots.forEach((h) => { const im = imagesFor(h.room)[0]; if (im) { const i = new Image(); i.decoding = 'async'; i.src = im.src; } });
    }).catch((err) => { console.error(err); aptView.classList.remove('loading'); });
  }

  function buildRoomUI() {
    hsEls = [];
    Scene3D.hotspots.forEach((h) => {
      const label = `${esc(h.room.name)}${h.area ? ' · ' + vn(h.area) + ' m²' : ''}`;
      if (h.pos) {
        const d = document.createElement('button');
        d.type = 'button'; d.className = 'hs'; d.setAttribute('aria-label', h.room.name);
        d.innerHTML = `<span>${label}</span>`;
        d.addEventListener('click', () => openGallery(h.room.key));
        d.addEventListener('mouseenter', () => { setHot(h.room.key); Scene3D.highlight(h.room.key); });
        d.addEventListener('mouseleave', () => { setHot(null); Scene3D.highlight(null); });
        hsLayer.appendChild(d);
        hsEls.push({ el: d, h });
      }
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" data-key="${esc(h.room.key)}">${esc(h.room.name)}<em>${h.area ? vn(h.area) + ' m²' : ''}</em></button>`;
      li.firstChild.addEventListener('click', () => openGallery(h.room.key));
      li.firstChild.addEventListener('mouseenter', () => { setHot(h.room.key); Scene3D.highlight(h.room.key); });
      li.firstChild.addEventListener('mouseleave', () => { setHot(null); Scene3D.highlight(null); });
      roomList.appendChild(li);
    });
    updateHotspots();
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

  const infoOf = (room) => ROOM_INFO[room.type] || ROOM_INFO.other;
  function imagesFor(room) {
    if (room.imgs && room.imgs.length) return LT.images(room.imgs);
    // ảnh mặc định: xoay vòng theo tầng để mỗi tầng có cảm giác khác
    const arr = infoOf(room).imgs.slice();
    const fi = Math.max(0, FLOORS.indexOf(state.floor));
    const shift = arr.length > 3 ? fi % arr.length : 0;
    return LT.images(arr.slice(shift).concat(arr.slice(0, shift)).slice(0, 4));
  }
  const featuresOf = (room) => {
    const f = room.features;
    if (Array.isArray(f) && f.length) return f;
    if (typeof f === 'string' && f.trim()) return f.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    return infoOf(room).features;
  };

  function openGallery(key) {
    const hs = Scene3D.hotspots;
    const h = hs.find((x) => x.room.key === key); if (!h) return;
    Scene3D.highlight(key);
    const room = h.room, info = infoOf(room);
    const f = state.floor, t = UNIT_TYPES[f.type];
    const imgs = imagesFor(room);
    const first = !gal.classList.contains('open');
    state.gallery = { key, imgs, i: 0 };

    gRooms.innerHTML = '';
    hs.forEach((x) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = x.room.name; b.className = x.room.key === key ? 'active' : '';
      b.addEventListener('click', () => openGallery(x.room.key));
      gRooms.appendChild(b);
    });
    const act = gRooms.querySelector('.active'); act && act.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });

    const apply = () => {
      $('#gEyebrow').textContent = `${floorName(f)} · ${t.name}`;
      $('#gTitle').textContent = room.name;
      $('#gSpecs').innerHTML = [
        ['Diện tích', h.area ? `${vn(h.area)} m²` : '—', true],
        ['Kích thước', h.dims || '—'],
        ['Trần cao', room.type === 'terrace' ? 'Ngoài trời' : vn(t.ceiling) + ' m'],
        ['Hướng / View', room.view || '—'],
        ['Vật liệu sàn', room.floor || info.floor],
        ['Tình trạng', f.status],
      ].map(([k, v, big]) => `<div><dt>${k}</dt><dd${big ? ' class="big"' : ''}>${esc(v)}</dd></div>`).join('');
      $('#gFeatures').innerHTML = featuresOf(room).map((x) => `<li>${esc(x)}</li>`).join('');
    };
    if (first) apply(); else { gInfo.classList.add('swap'); setTimeout(() => { apply(); gInfo.classList.remove('swap'); }, 300); }

    gSlides.innerHTML = ''; gThumbs.innerHTML = '';
    imgs.forEach((im, i) => {
      const s = document.createElement('div'); s.className = 'g-slide';
      const img = new Image(); img.src = im.src; img.alt = room.name + ' – ảnh ' + (i + 1);
      img.onerror = () => { s.classList.add('fallback'); img.remove(); };
      s.appendChild(img); gSlides.appendChild(s);
      const tb = document.createElement('button');
      tb.type = 'button'; tb.innerHTML = `<img src="${esc(im.thumb)}" alt="" loading="lazy">`; tb.addEventListener('click', () => go(i));
      gThumbs.appendChild(tb);
    });
    if (!imgs.length) { const s = document.createElement('div'); s.className = 'g-slide fallback on'; gSlides.appendChild(s); }
    $('#gTotal').textContent = String(Math.max(1, imgs.length)).padStart(2, '0');
    go(0);
    if (first) { gal.classList.add('open'); gal.setAttribute('aria-hidden', 'false'); }
  }

  function go(i) {
    const g = state.gallery; if (!g || !g.imgs.length) { $('#gIdx').textContent = '01'; return; }
    const n = g.imgs.length; g.i = (i + n) % n;
    const slides = $$('.g-slide', gSlides);
    const img = slides[g.i] && slides[g.i].querySelector('img');
    const ready = img && img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    const token = (g.token = (g.token || 0) + 1);
    // chỉ crossfade khi ảnh đã giải mã xong → không giật khung
    ready.then(() => { if (state.gallery === g && g.token === token) slides.forEach((s, k) => s.classList.toggle('on', k === g.i)); });
    const nx = slides[(g.i + 1) % n] && slides[(g.i + 1) % n].querySelector('img'); nx && nx.decode && nx.decode().catch(() => {});
    $$('button', gThumbs).forEach((b, k) => b.classList.toggle('active', k === g.i));
    $('#gIdx').textContent = String(g.i + 1).padStart(2, '0');
    if (n > 1) restartTimer();
  }
  function restartTimer() {
    clearTimeout(timer); cancelAnimationFrame(progRaf);
    progStart = performance.now();
    const bar = $('#gProg');
    const tick = (now) => { bar.style.width = Math.min(100, ((now - progStart) / SLIDE_MS) * 100) + '%'; if (gal.classList.contains('open')) progRaf = requestAnimationFrame(tick); };
    progRaf = requestAnimationFrame(tick);
    timer = setTimeout(() => state.gallery && go(state.gallery.i + 1), SLIDE_MS);
  }
  function closeGallery(silent) {
    if (!gal.classList.contains('open')) return;
    gal.classList.remove('open'); gal.setAttribute('aria-hidden', 'true');
    clearTimeout(timer); cancelAnimationFrame(progRaf);
    state.gallery = null;
    if (!silent) Scene3D.highlight(null);
  }
  let sx = null;
  gal.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  gal.addEventListener('touchend', (e) => {
    if (sx == null || !state.gallery) return; const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) go(state.gallery.i + (dx < 0 ? 1 : -1)); sx = null;
  });

  /* =================== LIÊN HỆ =================== */
  const modal = $('#contact'), sel = $('#cInterest'), form = $('#contactForm');
  Object.values(UNIT_TYPES).forEach((t) => { const o = document.createElement('option'); o.textContent = t.name; sel.appendChild(o); });
  function openContact() {
    if (state.floor && state.view === 'apt') {
      sel.value = UNIT_TYPES[state.floor.type].name;
      $('#cEyebrow').textContent = `${floorName(state.floor)} · ${UNIT_TYPES[state.floor.type].name}`;
    } else $('#cEyebrow').textContent = LT.project.name || '';
    $('#cOk').hidden = true; $('#cOk').textContent = 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.'; $('#cOk').style.color = '';
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.querySelector('input').focus(), 200);
  }
  function closeContact() { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeContact(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = $('#cOk'), btn = form.querySelector('[type="submit"]');
    const done = (success, msg) => {
      btn.disabled = false; ok.hidden = false;
      if (!ok.dataset.text) ok.dataset.text = ok.textContent;
      if (!success) { ok.textContent = msg || 'Gửi chưa được, vui lòng thử lại.'; ok.style.color = '#ff9d9d'; return; }
      ok.textContent = ok.dataset.text; ok.style.color = '';
      form.reset(); setTimeout(closeContact, 1800);
    };
    if (!LT.contact || !LT.contact.ajax) { done(true); return; }   // bản demo tĩnh
    btn.disabled = true;
    const fd = new FormData(form);
    fd.append('action', 'lt_lead'); fd.append('nonce', LT.contact.nonce);
    if (state.floor) fd.append('floor', floorName(state.floor));
    fetch(LT.contact.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
      .then((r) => r.json()).then((j) => done(!!j.success, j.data && j.data.message))
      .catch(() => done(false));
  });

  /* =================== HÀNH ĐỘNG CHUNG =================== */
  app.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action],[data-goto]'); if (!a) return;
    if (a.dataset.goto) { e.preventDefault(); enterFloor(a.dataset.goto); return; }
    const act = a.dataset.action;
    if (act === 'home') { e.preventDefault(); if (state.view === 'apt') backToTower(); }
    else if (act === 'back') backToTower();
    else if (act === 'contact') openContact();
    else if (act === 'close-contact') closeContact();
    else if (act === 'close-gallery') closeGallery();
    else if (act === 'prev' && state.gallery) go(state.gallery.i - 1);
    else if (act === 'next' && state.gallery) go(state.gallery.i + 1);
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

  // Khi trang đã tải: dựng sẵn các loại căn KHÔNG dùng GLB (GLB chỉ tải khi rê chuột vào tầng)
  const prewarmAll = () => {
    const seen = new Set();
    FLOORS.forEach((f) => { if (!seen.has(f.type) && !UNIT_TYPES[f.type].glb) { seen.add(f.type); setTimeout(() => prewarmType(f.id), 600 + seen.size * 500); } });
  };
  if (document.readyState === 'complete') prewarmAll(); else window.addEventListener('load', prewarmAll);

  if (window.matchMedia('(hover: none)').matches) {
    const h = $('.hint-tower'); if (h) h.lastChild.textContent = 'Chạm vào một tầng để vào căn hộ';
  }

  // Link trực tiếp: #floor=7  hoặc shortcode [lumiere_tower floor="7"]
  const m = location.hash.match(/floor=(\w+)/);
  const start = (m && m[1]) || app.dataset.floor;
  if (start && floorById(start)) setTimeout(() => enterFloor(start), 400);
}

  // Khởi động khi có khung #lt-app. Một số theme (React/Vue, page builder) vẽ nội dung trang
  // SAU khi script đã chạy, nên nếu chưa thấy khung thì theo dõi DOM và khởi động khi nó xuất hiện.
  const boot = () => {
    const app = document.getElementById('lt-app');
    if (!app || app.dataset.ltReady) return !!app;
    app.dataset.ltReady = '1';
    ltInit(app);
    return true;
  };
  if (!boot()) {
    const mo = new MutationObserver(() => { if (boot()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
