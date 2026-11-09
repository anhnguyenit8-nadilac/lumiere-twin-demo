/* =========================================================
   CHUẨN HOÁ DỮ LIỆU
   Nguồn: window.LT_DATA (WordPress xuất ra) → nếu thiếu thì dùng window.LT_DEMO
   Toạ độ tầng tính theo pixel của ảnh tòa nhà.
   Mặt bằng mô hình dựng sẵn tính theo "ô lưới"; kích thước thật = ô × scale (m)
   ========================================================= */
(function () {
  const DEMO = window.LT_DEMO || {};
  const SRC = window.LT_DATA || {};
  const pick = (k) => (SRC[k] !== undefined && SRC[k] !== null && !(Array.isArray(SRC[k]) && !SRC[k].length) ? SRC[k] : DEMO[k]);

  const BASE = SRC.base !== undefined ? SRC.base : '';
  const project = Object.assign({}, DEMO.project, SRC.project || {});
  const tower = Object.assign({}, DEMO.tower, SRC.tower || {});
  const units = pick('units') || [];
  const floorStatus = pick('floorStatus') || {};
  const floorPrice = SRC.floorPrice || {};
  const priceStep = +(pick('priceStep') ?? 0.018);

  const url = (p) => (!p ? '' : /^(https?:)?\/\//.test(p) || p.startsWith('/') || p.startsWith('data:') ? p : BASE + p);

  window.LT = { base: BASE, url, project, tower, contact: SRC.contact || null };
  window.PROJECT = { name: project.name, location: project.location, image: { src: url(tower.image), w: tower.w, h: tower.h } };

  /* ---------- Hình học tầng trên ảnh ---------- */
  const geo = [];
  for (let n = 1; n <= tower.count; n++) {
    const y2 = tower.base - (n - 1) * tower.floorH;
    const y1 = tower.base - n * tower.floorH;
    const rects = [];
    (tower.towers || []).forEach((t) => {
      const top = Math.max(y1, t.top);
      if (y2 - top > 4) rects.push({ x: t.x1, y: top, w: t.x2 - t.x1, h: y2 - top });
    });
    geo.push({ id: n, label: 'T' + n, y1, y2, rects });
  }
  if (tower.top && tower.topPolys && tower.topPolys.length) {
    const ys = tower.topPolys.join(' ').trim().split(/\s+/).map((p) => +p.split(',')[1]);
    geo.push({ id: 'TOP', label: 'TOP', y1: Math.min(...ys), y2: Math.max(...ys), polys: tower.topPolys });
  }
  window.FLOOR_GEO = geo;

  /* ---------- Kiểu mô hình dựng sẵn (dùng khi chưa có GLB) ---------- */
  const PRESETS = {
    '2br': { scale: 0.62, terrace: 'south' },
    '3br': { scale: 0.7, terrace: 'L' },
    sky: { scale: 0.78, terrace: 'L', jacuzzi: true },
    ph: { scale: 0.86, terrace: 'L', pool: true, jacuzzi: true },
  };
  window.PRESETS = PRESETS;

  /* ---------- Loại căn ---------- */
  window.UNIT_TYPES = {};
  units.forEach((u, i) => {
    const slug = u.slug || 'unit-' + i;
    const preset = PRESETS[u.preset] ? u.preset : '3br';
    window.UNIT_TYPES[slug] = Object.assign({}, PRESETS[preset], {
      slug, preset,
      name: u.name || 'Căn hộ', beds: +u.beds || 0, baths: +u.baths || 0, extra: u.extra || '',
      ceiling: +u.ceiling || 3, basePrice: +u.price || 0, desc: u.desc || '',
      area: +u.area || 0, glb: url(u.glb || ''), rotation: +u.rotation || 0,
      rooms: Array.isArray(u.rooms) ? u.rooms : [],
    });
  });

  /* ---------- Danh sách tầng ---------- */
  const unitFor = (id) => {
    const u = units.find((x) => (x.floors || []).map(String).includes(String(id)));
    return u ? u.slug : units.length ? units[id === 'TOP' ? units.length - 1 : 0].slug : null;
  };
  const floors = [];
  const ids = geo.map((g) => g.id);
  ids.forEach((id) => {
    const type = unitFor(id); if (!type) return;
    const t = window.UNIT_TYPES[type];
    const n = id === 'TOP' ? 0 : id - 1;
    const price = floorPrice[id] !== undefined ? +floorPrice[id] : t.basePrice * (1 + n * priceStep);
    floors.push({
      id, label: id === 'TOP' ? 'Tầng Top' : 'Tầng ' + id, short: id === 'TOP' ? 'TOP' : String(id).padStart(2, '0'),
      type, price, status: floorStatus[id] || 'Còn hàng',
    });
  });
  window.FLOORS = floors;
})();

/* ---------- Mặt bằng mô hình dựng sẵn (ô lưới) ----------
   Trục x: Tây → Đông, trục z: Bắc → Nam (Nam = phía ban công)  */
window.PLAN = {
  interior: { w: 22, d: 13 },
  rooms: [
    { key: 'bed2',   type: 'bedroom', name: 'Phòng ngủ 2',   x: 0,    z: 0,   w: 5.5, d: 5,   view: 'Hướng Bắc · view thành phố' },
    { key: 'bath2',  type: 'bath',    name: 'Phòng tắm 2',   x: 5.5,  z: 0,   w: 3,   d: 5,   view: 'Thông gió tự nhiên' },
    { key: 'foyer',  type: 'foyer',   name: 'Sảnh vào',      x: 8.5,  z: 0,   w: 3.5, d: 5,   view: 'Thang máy riêng' },
    { key: 'kitchen',type: 'kitchen', name: 'Bếp đảo',       x: 12,   z: 0,   w: 5,   d: 5,   view: 'Mở ra phòng khách' },
    { key: 'mbath',  type: 'bath',    name: 'Spa Bath',      x: 17,   z: 0,   w: 5,   d: 5,   view: 'Hướng Đông · đón nắng sớm' },
    { key: 'bed3',   type: 'bedroom', name: 'Phòng ngủ 3',   x: 0,    z: 6.5, w: 5.5, d: 6.5, view: 'Hướng Nam · view sông' },
    { key: 'dining', type: 'dining',  name: 'Phòng ăn',      x: 5.5,  z: 5,   w: 5.5, d: 8,   view: 'Hướng Nam · view sông' },
    { key: 'living', type: 'living',  name: 'Phòng khách',   x: 11,   z: 5,   w: 6,   d: 8,   view: 'Kính 2 mặt · view sông' },
    { key: 'master', type: 'master',  name: 'Phòng ngủ Master', x: 17, z: 5,  w: 5,   d: 8,   view: 'Góc Đông Nam · view sông' },
    { key: 'terrace',type: 'terrace', name: 'Ban công',      x: 0,    z: 13,  w: 25.5, d: 3.5, view: 'Toàn cảnh sông Sài Gòn' },
  ],
  // Tường: [x1, z1, x2, z2, 'solid' | 'glass']
  walls: [
    [0, 0, 9.6, 0, 'solid'], [11, 0, 22, 0, 'solid'],
    [0, 0, 0, 13, 'solid'],
    [0, 13, 22, 13, 'glass'],
    [22, 0, 22, 5, 'solid'], [22, 5, 22, 13, 'glass'],
    [5.5, 0, 5.5, 5, 'solid'], [8.5, 0, 8.5, 5, 'solid'],
    [0, 5, 3.6, 5, 'solid'], [4.6, 5, 6.2, 5, 'solid'], [7.2, 5, 8.5, 5, 'solid'],
    [0, 6.5, 3.8, 6.5, 'solid'], [4.8, 6.5, 5.5, 6.5, 'solid'],
    [5.5, 6.5, 5.5, 13, 'solid'],
    [12, 0, 12, 2.6, 'solid'],
    [17, 0, 17, 5, 'solid'],
    [17, 5, 18.2, 5, 'solid'], [19.2, 5, 22, 5, 'solid'],
    [17, 5, 17, 6, 'solid'], [17, 7.2, 17, 13, 'solid'],
  ],
};

/* ---------- Ảnh & thông số mặc định theo loại phòng ---------- */
window.ROOM_INFO = {
  living:  { label: 'Phòng khách', imgs: ['living-1', 'living-2', 'living-3', 'living-4', 'living-5', 'living-6', 'living-7', 'living-8'], floor: 'Gỗ sồi Châu Âu lát xương cá', features: ['Kính Low-E cách nhiệt sàn – trần', 'Điều hoà âm trần Daikin VRV', 'Hệ thống nhà thông minh KNX', 'Rèm tự động điều khiển giọng nói'] },
  kitchen: { label: 'Bếp', imgs: ['kitchen-1', 'kitchen-2', 'kitchen-3', 'kitchen-4'], floor: 'Đá porcelain vân gỗ', features: ['Bếp đảo mặt đá marble Nero Marquina', 'Thiết bị Bosch Series 8 âm tủ', 'Máy hút mùi âm trần', 'Tủ rượu 2 vùng nhiệt'] },
  dining:  { label: 'Phòng ăn', imgs: ['dining-1', 'dining-2', 'living-6'], floor: 'Gỗ sồi Châu Âu', features: ['Bàn ăn 8 chỗ', 'Đèn chùm thiết kế riêng', 'Liên thông bếp & phòng khách', 'Cửa kính trượt ra ban công'] },
  master:  { label: 'Phòng ngủ Master', imgs: ['bed-1', 'bed-2', 'bed-4'], floor: 'Gỗ sồi + thảm len New Zealand', features: ['Phòng thay đồ walk-in', 'Kính góc 2 mặt view sông', 'Cách âm tiêu chuẩn STC 55', 'Đầu giường bọc da tích hợp đèn đọc'] },
  bedroom: { label: 'Phòng ngủ', imgs: ['bed-3', 'bed-5', 'bed-4'], floor: 'Gỗ sồi Châu Âu', features: ['Tủ âm tường kịch trần', 'Cửa sổ kính hộp cách âm', 'Ổ cắm USB-C đầu giường', 'Điều hoà inverter riêng'] },
  study:   { label: 'Phòng làm việc', imgs: ['study-1', 'study-2', 'living-5'], floor: 'Gỗ sồi Châu Âu', features: ['Bàn làm việc gỗ óc chó', 'Kệ sách âm tường', 'Có thể chuyển thành phòng ngủ', 'Đèn chiếu sáng 4000K chống mỏi mắt'] },
  bath:    { label: 'Phòng tắm', imgs: ['bath-1', 'bath-2', 'bath-3'], floor: 'Đá marble Calacatta Ý', features: ['Bồn tắm đặt sàn Kohler', 'Sen tắm cây âm tường Grohe', 'Gương LED chống mờ', 'Sàn sưởi ấm'] },
  foyer:   { label: 'Sảnh vào', imgs: ['living-7', 'living-3'], floor: 'Đá marble Calacatta Ý', features: ['Thang máy riêng mở thẳng vào căn hộ', 'Khoá vân tay & nhận diện khuôn mặt', 'Tủ giày âm tường', 'Hệ thống chuông hình 4K'] },
  terrace: { label: 'Ban công', imgs: ['terrace-1', 'living-4', 'living-8'], floor: 'Gỗ teak ngoài trời', features: ['Lan can kính cường lực 12mm', 'Hệ thống tưới cây tự động', 'Ổ cắm & đèn ngoài trời IP65', 'Ghế nằm thư giãn ngắm hoàng hôn'] },
  other:   { label: 'Không gian', imgs: ['living-2', 'living-5'], floor: 'Gỗ sồi Châu Âu', features: [] },
};

/* Đoán loại phòng từ tên node trong GLB: room_kitchen, room_bed2, room_wc1 … */
window.LT.guessType = function (key) {
  const k = key.toLowerCase();
  const rules = [
    ['master', /master|mbr|chinh/], ['bath', /bath|wc|toilet|tam/], ['kitchen', /kitchen|bep/],
    ['dining', /dining|an\b|eat/], ['living', /living|khach|lounge/], ['study', /study|office|lam.?viec|work/],
    ['terrace', /terrace|balcon|ban.?cong|deck|garden/], ['foyer', /foyer|entry|sanh|hall/], ['bedroom', /bed|ngu|br\d/],
  ];
  const r = rules.find(([, re]) => re.test(k));
  return r ? r[0] : 'other';
};

/* Chuẩn hoá danh sách ảnh: tên demo | URL | {src, thumb} → {src, thumb} */
window.LT.images = function (list) {
  return (list || []).filter(Boolean).map((x) => {
    if (typeof x === 'object') return { src: LT.url(x.src), thumb: LT.url(x.thumb || x.src) };
    if (!/[/.]/.test(x)) return { src: LT.url('assets/interiors/' + x + '.jpg'), thumb: LT.url('assets/interiors/thumbs/' + x + '.jpg') };
    return { src: LT.url(x), thumb: LT.url(x) };
  });
};
