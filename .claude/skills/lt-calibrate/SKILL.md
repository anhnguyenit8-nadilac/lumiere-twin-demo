---
name: lt-calibrate
description: Cân chỉnh tòa nhà mới cho dự án Lumière Tower từ ảnh phối cảnh khách đưa — đo toạ độ tầng, tạo JSON "Hình học các tầng" cho plugin WordPress, kiểm tra bằng ảnh chồng lớp. Dùng khi người dùng đưa ảnh tòa nhà mới / nói "đổi tòa nhà", "cân chỉnh tầng", "job mới".
argument-hint: <đường-dẫn-ảnh> [số tầng] [có TOP?] [tầng → loại căn]
---

# Cân chỉnh tòa nhà mới từ ảnh phối cảnh

Mục tiêu: từ một ảnh tòa nhà, tạo ra đoạn JSON `tower` sao cho mỗi tầng sáng lên **khớp đúng** tầng thật trên ảnh, rồi giao cho người dùng dán vào **Tòa nhà 3D › Cài đặt › Hình học các tầng (JSON)**.

Tham số người dùng truyền: `$ARGUMENTS`

## 0. Thu thập đầu vào

Cần đủ những thứ sau; thứ gì thiếu và **không tự suy ra được từ ảnh** thì hỏi một lần (gom vào 1 câu hỏi):

- **Ảnh phối cảnh** (bắt buộc) — đường dẫn file. Nếu là ảnh chụp màn hình tạm (`/var/folders/...`), chép ngay vào scratchpad vì file tạm có thể mất.
- **Số tầng** (không tính TOP). Nếu không có, tự đếm trên ảnh và **nói rõ là tự đếm** để người dùng xác nhận.
- **Có tầng TOP/penthouse** khác hình dạng ở trên cùng không.
- **Tầng nào thuộc loại căn nào** (VD `1-10` Garden, `11-25` Signature, `TOP` Penthouse) — không cần cho việc đo, chỉ cần cho bước giao kết quả.

Chép ảnh vào thư mục làm việc: `<scratchpad>/calib/<tên-dự-án>/` (ảnh gốc giữ nguyên tên).

## 1. Hiểu mô hình hình học (đọc kỹ — kết quả phải theo đúng mô hình này)

Code tạo tầng ở `js/data.js` (mục "Hình học tầng trên ảnh"). Toạ độ là **pixel trên ảnh gốc**, gốc (0,0) ở góc trên-trái:

```
Tầng n (1..count):  y2 = base - (n-1)*floorH   (chân tầng)
                    y1 = base - n*floorH       (đỉnh tầng)
Mỗi khối tháp t trong towers: vẽ hình chữ nhật x = t.x1 → t.x2, y = max(y1, t.top) → y2
                    (bỏ qua nếu cao < 4px → khối thấp hơn tự "hết tầng")
Tầng TOP: mỗi chuỗi trong topPolys là 1 đa giác "x,y x,y …"; chỉ dùng khi top = true
anchorX: x của điểm nối đường kẻ tới thẻ thông tin (thường = mép phải tòa nhà + vài px)
```

JSON cần tạo (không có `image`, `w`, `h` — plugin tự lấy từ ảnh upload):
```json
{
  "base": 785, "floorH": 28.42, "count": 19, "top": true,
  "towers": [ {"x1": 631, "x2": 819, "top": 245}, {"x1": 841, "x2": 1031, "top": 277} ],
  "topPolys": ["632,245 633,195 818,245"],
  "anchorX": 1034
}
```

Giới hạn: các tầng là **dải ngang đều nhau, hình chữ nhật**. Ảnh phải chụp gần chính diện. Nếu ảnh chụp xiên mạnh (đường tầng nghiêng rõ, hội tụ phối cảnh) hoặc tòa nhà cong → **dừng lại, báo người dùng** rằng cần thêm chế độ vẽ từng tầng bằng đa giác (sửa `js/data.js` + `js/app.js` + trang Cài đặt) và hỏi có làm không. Không cố ép số cho "gần đúng".

## 2. Đo

Công cụ: `node .claude/skills/lt-calibrate/overlay.mjs <ảnh> <out.png> [--geo geo.json] [--grid 50] [--crop x,y,w,h] [--scale N]`
(vẽ lưới toạ độ có nhãn số + các tầng chồng lên ảnh, chụp bằng Chrome headless; in ra kích thước ảnh).

1. **Toàn cảnh có lưới**: `overlay.mjs ảnh full.png` → xem để biết tòa nhà nằm đâu, có mấy khối tháp, khối nào cao hơn.
2. **Đo chi tiết bằng crop** (ảnh xem được bị thu nhỏ, nên luôn crop + phóng để đọc số chính xác tới ~2px):
   - Chân tầng 1 (`base`): crop vùng chân tòa nhà, `--grid 10`. Lấy đường sàn/ban công dưới cùng của tầng ở được đầu tiên (bỏ sảnh/khối đế nếu khách không bán tầng đó — hỏi nếu không rõ).
   - `floorH`: đo y của **cùng một chi tiết** (mép ban công) ở tầng 1 và ở tầng cao nhất đếm được, chia cho số tầng giữa hai mốc. Không đo 1 tầng riêng lẻ (sai số lớn).
   - Mỗi khối tháp: `x1`, `x2` (mép trái/phải, gồm ban công) và `top` (y đỉnh của tầng cao nhất khối đó — thường = `base - count*floorH` với khối cao nhất). Khối giữa/hẹp (lõi thang) cũng là một khối nếu muốn nó sáng lên.
   - Tầng TOP: crop phần mái, `--grid 10`, chấm các điểm quanh viền theo chiều kim đồng hồ, điểm đầu và cuối nằm trên đường `top` của khối.
   - `count`: kiểm lại bằng `(base - top_khối_cao_nhất) / floorH` — phải ra gần số nguyên.
3. Ghi JSON vào `<thư-mục-làm-việc>/geo.json`.

## 3. Kiểm tra và lặp

1. `overlay.mjs ảnh check.png --geo geo.json` → xem toàn cảnh: mỗi dải màu (đỏ/xanh xen kẽ, có số tầng) phải trùng **đúng 1 tầng thật**; TOP màu hồng phủ đúng phần mái.
2. Crop kiểm **3 vùng**: tầng 1–3, tầng giữa, 3 tầng trên cùng + TOP (`--crop ... --geo geo.json --grid 0`). Lệch tích luỹ ở tầng trên cùng = sai `floorH`; lệch đều mọi tầng = sai `base`.
3. Sửa số → chạy lại tới khi cả 3 vùng khớp (lệch ≤ ~15% chiều cao tầng). Thường 2–4 vòng.
4. Kiểm trên giao diện thật (không bắt buộc nhưng nên làm): tạm thay ảnh + `tower` trong bản demo độc lập rồi chụp — **làm trên bản sao trong scratchpad**, không sửa `assets/` hay `js/demo-data.js` của repo trừ khi người dùng yêu cầu đổi bản demo.

## 4. Giao kết quả

Trả lời người dùng (tiếng Việt, ngắn gọn):
- Ảnh `check.png` (đường dẫn tuyệt đối) để họ nhìn thấy độ khớp.
- **Khối JSON** hoàn chỉnh để dán.
- Các bước trong WP Admin:
  1. **Tòa nhà 3D › Cài đặt › Ảnh phối cảnh › Chọn ảnh** → upload **đúng file ảnh đã dùng để đo** (đừng để ai crop/resize trước khi upload; WordPress tự thu nhỏ ảnh > 2560px nhưng plugin đọc đúng kích thước sau thu nhỏ — nếu ảnh gốc > 2560px thì **đo trên bản đã thu nhỏ về 2560px** hoặc báo người dùng).
  2. Dán JSON vào **Hình học các tầng (JSON)** → Lưu.
  3. **Loại căn hộ**: sửa "Tầng áp dụng" của từng loại cho khớp số tầng mới (liệt kê cụ thể nếu người dùng đã cho phân bổ).
  4. **Cài đặt**: sửa tình trạng/giá từng tầng nếu cần.
- Nói rõ phần nào **tự suy ra** (VD tự đếm số tầng, tự chọn tầng 1 là tầng trên khối đế) để họ xác nhận.

Nếu người dùng muốn đổi luôn **bản demo độc lập** (`index.html`): chép ảnh vào `assets/`, sửa `tower` trong `js/demo-data.js` (thêm `image`, `w`, `h`), và các `floors` trong `units`; rồi dùng skill `lt-release` để đóng gói.

Lưu ảnh khách + geo.json cuối cùng trong scratchpad; không commit ảnh của khách vào repo nếu không được yêu cầu.
