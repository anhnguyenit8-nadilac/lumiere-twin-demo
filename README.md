# Lumière Twin – Website BĐS tương tác

Mở `index.html` trực tiếp bằng trình duyệt (không cần build/server).
Hoặc chạy server: `npx serve .` / `python3 -m http.server`.

## Luồng
1. **Tòa nhà** – hover từng tầng (T1 → TOP) để tầng sáng lên + thẻ thông tin. Có thanh chọn tầng bên phải.
2. **Click** – zoom vào tầng → chuyển mượt sang **mô hình 3D căn hộ** (xoay/zoom/pan).
3. **Click vào phòng** (chấm xanh, sàn phòng hoặc danh sách bên phải) → **slide ảnh nội thất toàn màn hình** + thông số phòng.
   Phím ← → / vuốt để chuyển ảnh, ESC để đóng. Link trực tiếp: `index.html#floor=12`.

## Tuỳ chỉnh – `js/data.js`
- `FLOOR_GEO`: toạ độ các tầng trên ảnh (`BASE`, `H`, khung tháp trái/phải). Đổi ảnh tòa nhà thì chỉnh ở đây.
- `UNIT_TYPES`: loại căn (tên, PN, WC, giá, mô tả, `scale` = mét/ô lưới).
- `FLOORS`: tầng nào loại căn nào, giá, tình trạng.
- `PLAN`: mặt bằng (phòng + tường) dùng để dựng 3D.
- `ROOM_INFO`: ảnh nội thất (`assets/interiors/<tên>.jpg`), vật liệu, tiện ích từng loại phòng.

Ảnh nội thất mẫu lấy từ Unsplash – thay bằng ảnh thật của dự án trước khi đưa lên production.

## Plugin WordPress (`wp-plugin/lumiere-tower`)
Đóng gói: `sh wp-plugin/build.sh` → `dist/lumiere-tower.zip` (chép mã front-end dùng chung vào plugin).
Cài: Plugins › Cài mới › Tải plugin lên → kích hoạt → menu **Tòa nhà 3D**. Chèn `[lumiere_tower]` vào trang.

- **Loại căn hộ**: tầng áp dụng (`1-6, 8, TOP`), PN/WC, giá, mô tả, **file GLB**, góc xoay, mô hình dựng sẵn dự phòng.
- **Danh sách phòng**: mã phòng (khớp node `room_<mã>` trong GLB), tên, loại, diện tích, kích thước, hướng, vật liệu, tiện ích, ảnh từ Media Library (kéo thả sắp xếp).
- **Cài đặt**: tên dự án, ảnh tòa nhà, toạ độ tầng (JSON), bước giá, tình trạng/giá riêng từng tầng, email nhận khách.
- **Khách đăng ký**: form trên web lưu vào admin + gửi email.
- File mẫu: `samples/sample-apartment.glb` (đặt tên `room_living`, `room_kitchen`, … và `hotspot_living`).

## Skill cho Claude Code (`.claude/skills/`)

Bộ lệnh để Claude Code làm các việc lặp lại của dự án. Gõ lệnh trong Claude Code, không cần mở file `.md`.

| Lệnh | Dùng khi | Claude làm gì |
|---|---|---|
| `/lt-calibrate <ảnh> [số tầng, TOP, tầng → loại căn]` | Job mới, khách đưa ảnh phối cảnh tòa nhà | Đo toạ độ tầng, vẽ các tầng chồng lên ảnh để kiểm tra, giao JSON để dán vào *Tòa nhà 3D › Cài đặt › Hình học các tầng* + các bước trong WP Admin |
| `/lt-test-live <url> [tầng]` | Plugin không chạy / lỗi trên một site WordPress | Mở trang bằng Chrome chạy ngầm, bắt lỗi JS, rê chuột + bấm vào tầng, chụp màn hình; có thể thử bản sửa trong repo ngay trên site mà không cần cài |
| `/lt-release [patch\|minor\|major] [push]` | Sau khi sửa code | Tăng phiên bản, kiểm tra, build `dist/lumiere-tower.zip`, commit (push nếu có chữ `push`) |

Ví dụ:
```
/lt-calibrate ~/Downloads/phoi-canh.jpg 25 tầng + TOP; 1-10 Garden, 11-24 Signature, TOP Penthouse
/lt-test-live https://ten-site.com/trang-toa-nha/
/lt-release push
```

### Cài đặt

Skill nằm sẵn trong repo, **clone về là dùng được**:

1. Cài [Claude Code](https://claude.com/claude-code), **Node.js ≥ 18** (`node -v`) và **Google Chrome**.
2. Clone repo và mở Claude Code **tại thư mục gốc dự án**:
   ```
   git clone https://github.com/anhnguyenit8-nadilac/lumiere-twin-demo.git
   cd lumiere-twin-demo
   claude
   ```
3. Gõ `/lt-` — danh sách lệnh hiện ra. Nếu chưa thấy (đang mở Claude Code từ trước khi pull về), thoát và mở lại Claude Code.

Đã có repo thì chỉ cần `git pull` rồi mở lại Claude Code.

**Dùng ở dự án khác / mọi thư mục:** chép skill vào thư mục skill cá nhân:
```
mkdir -p ~/.claude/skills
cp -R .claude/skills/lt-* ~/.claude/skills/
```
(Các skill vẫn trỏ tới file của dự án này — `js/data.js`, `wp-plugin/` — nên chủ yếu dùng khi làm việc trong repo này.)

**Lưu ý**
- Script chạy Chrome theo đường dẫn macOS: `/Applications/Google Chrome.app/…`. Dùng Windows/Linux thì sửa hằng `CHROME` trong `.claude/skills/lt-calibrate/overlay.mjs` và `.claude/skills/lt-test-live/live-test.mjs`.
- `lt-calibrate` đọc kích thước ảnh bằng `sips` (có sẵn trên macOS).
- Kiểm tra cú pháp PHP trong `lt-release` cần `php` (`brew install php`); không có thì bước này được bỏ qua và báo lại.
- Khi Claude hỏi quyền chạy `node …` hay Chrome, chọn cho phép (có thể chọn "luôn cho phép" cho dự án này).
