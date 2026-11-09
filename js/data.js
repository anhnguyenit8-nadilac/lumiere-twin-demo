/* =========================================================
   DỮ LIỆU DỰ ÁN — chỉnh sửa tại đây
   - Toạ độ tầng tính theo pixel của ảnh gốc assets/tower.png (1672 × 941)
   - Mặt bằng căn hộ tính theo "ô lưới"; kích thước thật = ô × scale (m)
   ========================================================= */

window.PROJECT = {
  name: 'LUMIÈRE TWIN',
  location: 'Thủ Thiêm · TP. Hồ Chí Minh',
  image: { src: 'assets/tower.jpg', w: 1672, h: 941 },
};

/* ---------- Hình học tầng trên ảnh ---------- */
(function () {
  const BASE = 785;        // chân tầng 1 (y px)
  const H = 28.42;         // chiều cao mỗi tầng (px)
  const COUNT = 19;        // số tầng căn hộ
  const L = { x1: 631, x2: 819, top: 245 };   // tháp trái
  const C = { x1: 819, x2: 841, top: 300 };   // lõi giữa
  const R = { x1: 841, x2: 1031, top: 277 };  // tháp phải

  const geo = [];
  for (let n = 1; n <= COUNT; n++) {
    const y2 = BASE - (n - 1) * H;
    const y1 = BASE - n * H;
    const rects = [];
    [L, C, R].forEach((t) => {
      const top = Math.max(y1, t.top);
      if (y2 - top > 4) rects.push({ x: t.x1, y: top, w: t.x2 - t.x1, h: y2 - top });
    });
    geo.push({ id: n, label: 'T' + n, y1, y2, rects });
  }
  // Tầng TOP: mái/vương miện hai tháp
  geo.push({
    id: 'TOP', label: 'TOP', y1: 183, y2: 277,
    polys: [
      '632,245 633,195 640,186 652,184 802,226 814,236 818,245',
      '842,277 842,268 850,262 1012,214 1024,218 1030,230 1031,277',
    ],
  });
  window.FLOOR_GEO = geo;
})();

/* ---------- Loại căn hộ ---------- */
window.UNIT_TYPES = {
  '2br': {
    name: 'Garden Residence', beds: 2, baths: 2, extra: '+1 phòng đa năng', scale: 0.62, ceiling: 3.0,
    terrace: 'south', basePrice: 6.2,
    desc: 'Căn hộ 2 phòng ngủ cùng phòng làm việc riêng, phòng khách – bếp – ăn liên thông mở ra ban công kính dài 9m đón gió sông.',
  },
  '3br': {
    name: 'Signature Residence', beds: 3, baths: 2, extra: 'Ban công góc chữ L', scale: 0.7, ceiling: 3.2,
    terrace: 'L', basePrice: 8.9,
    desc: 'Căn góc ba phòng ngủ với kính hai mặt, bếp đảo đá marble đen và ban công chữ L bao quanh phòng khách lẫn phòng ngủ master.',
  },
  sky: {
    name: 'Sky Villa', beds: 3, baths: 3, extra: 'Jacuzzi ngoài trời', scale: 0.78, ceiling: 3.4,
    terrace: 'L', jacuzzi: true, basePrice: 14.5,
    desc: 'Biệt thự trên không với sân vườn chữ L, bồn jacuzzi riêng, trần cao 3,4m và tầm nhìn toàn cảnh sông Sài Gòn.',
  },
  ph: {
    name: 'Penthouse Crown', beds: 4, baths: 4, extra: 'Hồ bơi vô cực riêng', scale: 0.86, ceiling: 3.8,
    terrace: 'L', pool: true, jacuzzi: true, basePrice: 38,
    desc: 'Penthouse trên đỉnh tháp với hồ bơi vô cực riêng, sân thượng 120m², trần 3,8m và thang máy riêng dẫn thẳng vào căn hộ.',
  },
};

/* ---------- Danh sách tầng ---------- */
window.FLOORS = (function () {
  const list = [];
  const statuses = ['Còn hàng', 'Còn hàng', 'Đang giữ chỗ', 'Còn hàng', 'Đã bán', 'Còn hàng'];
  for (let n = 1; n <= 19; n++) {
    const type = n <= 6 ? '2br' : n <= 13 ? '3br' : 'sky';
    const t = UNIT_TYPES[type];
    const price = t.basePrice * (1 + (n - 1) * 0.018);
    list.push({ id: n, label: 'Tầng ' + n, short: String(n).padStart(2, '0'), type, price, status: statuses[n % statuses.length] });
  }
  list.push({ id: 'TOP', label: 'Tầng Top', short: 'TOP', type: 'ph', price: UNIT_TYPES.ph.basePrice, status: 'Còn hàng' });
  return list;
})();

/* ---------- Mặt bằng (ô lưới) ----------
   Trục x: Tây → Đông, trục z: Bắc → Nam (Nam = phía sông / ban công)  */
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
    [0, 0, 9.6, 0, 'solid'], [11, 0, 22, 0, 'solid'],          // Bắc (cửa chính 9.6–11)
    [0, 0, 0, 13, 'solid'],                                      // Tây
    [0, 13, 22, 13, 'glass'],                                    // Nam (kính ra ban công)
    [22, 0, 22, 5, 'solid'], [22, 5, 22, 13, 'glass'],           // Đông
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

/* ---------- Ảnh & thông số theo loại phòng ---------- */
window.ROOM_INFO = {
  living:  { imgs: ['living-1', 'living-2', 'living-3', 'living-4', 'living-5', 'living-6', 'living-7', 'living-8'], floor: 'Gỗ sồi Châu Âu lát xương cá', features: ['Kính Low-E cách nhiệt sàn – trần', 'Điều hoà âm trần Daikin VRV', 'Hệ thống nhà thông minh KNX', 'Rèm tự động điều khiển giọng nói'] },
  kitchen: { imgs: ['kitchen-1', 'kitchen-2', 'kitchen-3', 'kitchen-4'], floor: 'Đá porcelain vân gỗ', features: ['Bếp đảo mặt đá marble Nero Marquina', 'Thiết bị Bosch Series 8 âm tủ', 'Máy hút mùi âm trần', 'Tủ rượu 2 vùng nhiệt'] },
  dining:  { imgs: ['dining-1', 'dining-2', 'living-6'], floor: 'Gỗ sồi Châu Âu', features: ['Bàn ăn 8 chỗ', 'Đèn chùm thiết kế riêng', 'Liên thông bếp & phòng khách', 'Cửa kính trượt ra ban công'] },
  master:  { imgs: ['bed-1', 'bed-2', 'bed-4'], floor: 'Gỗ sồi + thảm len New Zealand', features: ['Phòng thay đồ walk-in', 'Kính góc 2 mặt view sông', 'Cách âm tiêu chuẩn STC 55', 'Đầu giường bọc da tích hợp đèn đọc'] },
  bedroom: { imgs: ['bed-3', 'bed-5', 'bed-4'], floor: 'Gỗ sồi Châu Âu', features: ['Tủ âm tường kịch trần', 'Cửa sổ kính hộp cách âm', 'Ổ cắm USB-C đầu giường', 'Điều hoà inverter riêng'] },
  study:   { imgs: ['study-1', 'study-2', 'living-5'], floor: 'Gỗ sồi Châu Âu', features: ['Bàn làm việc gỗ óc chó', 'Kệ sách âm tường', 'Có thể chuyển thành phòng ngủ', 'Đèn chiếu sáng 4000K chống mỏi mắt'] },
  bath:    { imgs: ['bath-1', 'bath-2', 'bath-3'], floor: 'Đá marble Calacatta Ý', features: ['Bồn tắm đặt sàn Kohler', 'Sen tắm cây âm tường Grohe', 'Gương LED chống mờ', 'Sàn sưởi ấm'] },
  foyer:   { imgs: ['living-7', 'living-3'], floor: 'Đá marble Calacatta Ý', features: ['Thang máy riêng mở thẳng vào căn hộ', 'Khoá vân tay & nhận diện khuôn mặt', 'Tủ giày âm tường', 'Hệ thống chuông hình 4K'] },
  terrace: { imgs: ['terrace-1', 'living-4', 'living-8'], floor: 'Gỗ teak ngoài trời', features: ['Lan can kính cường lực 12mm', 'Hệ thống tưới cây tự động', 'Ổ cắm & đèn ngoài trời IP65', 'Ghế nằm thư giãn ngắm hoàng hôn'] },
};
