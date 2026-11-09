---
name: lt-release
description: Đóng gói plugin WordPress Lumière Tower sau khi sửa code — tăng phiên bản, build zip, kiểm tra, commit (và push nếu được yêu cầu). Dùng khi người dùng nói "đóng gói", "build plugin", "ra bản mới", "release".
argument-hint: [patch|minor|major] [push]
---

# Đóng gói plugin Lumière Tower

Tham số: `$ARGUMENTS` (mặc định `patch`; có chữ `push` thì đẩy lên GitHub sau khi commit).

## Cấu trúc cần nhớ

- Mã front-end **gốc** nằm ở repo root: `css/style.css`, `js/*.js`, `vendor/`, `assets/`. Bản demo `index.html` dùng trực tiếp các file này (GitHub Pages).
- `wp-plugin/lumiere-tower/public/` và `samples/` là **bản chép** do `wp-plugin/build.sh` tạo, bị `.gitignore`. **Không bao giờ sửa trong `public/`** — sửa ở root rồi build.
- Phiên bản nằm ở 3 chỗ, phải luôn giống nhau:
  - `wp-plugin/lumiere-tower/lumiere-tower.php`: dòng ` * Version:` và `define( 'LT_VERSION', '…' )`
  - `wp-plugin/lumiere-tower/readme.txt`: `Stable tag:`
  `LT_VERSION` được gắn vào `?ver=` của CSS/JS → tăng phiên bản là cách phá cache trình duyệt/CDN của khách. **Luôn tăng khi đổi CSS/JS.**

## Các bước

1. `git status` + `git diff --stat` — xem đã đổi gì. Không có thay đổi nào thì báo và dừng.
2. Kiểm tra cú pháp:
   - `node --check` cho mọi file `js/*.js` đã đổi.
   - PHP: nếu có `php` (`which php`) thì `php -l` mọi file `.php` đã đổi. Máy hiện **không có PHP** → nói rõ trong báo cáo là phần PHP chưa được kiểm tra cú pháp, và đọc lại kỹ diff PHP bằng mắt (dấu `;`, ngoặc, `?>`, escape `esc_attr/esc_html/esc_url`).
3. Tăng phiên bản ở cả 3 chỗ (patch: 1.0.2 → 1.0.3; minor: → 1.1.0; major: → 2.0.0).
4. Cập nhật tài liệu nếu có tuỳ chọn/tính năng mới: `wp-plugin/lumiere-tower/readme.txt`, trang Hướng dẫn trong `includes/admin-settings.php`, `README.md`.
5. Build: `sh wp-plugin/build.sh` → `dist/lumiere-tower.zip`.
6. Kiểm tra bản demo độc lập vẫn chạy:
   ```
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=<scratchpad>/prof \
     --allow-file-access-from-files --virtual-time-budget=8000 --dump-dom file://$PWD/index.html | grep -o '<g id="floors">.\{0,60\}'
   ```
   Phải thấy `<g class="floor" data-id="1"…`. Rỗng = JS hỏng → sửa trước khi đi tiếp.
7. Nếu thay đổi liên quan tới hành vi trên WordPress và người dùng có site test → chạy skill `lt-test-live` với `--patch` để thử trên site thật.
8. Commit (một commit, message tiếng Anh mô tả thay đổi + "Bump plugin to x.y.z"), kèm dòng attribution theo hướng dẫn hệ thống. Chỉ `git push` khi tham số có `push` hoặc người dùng đã bảo.

## Báo cáo cho người dùng (tiếng Việt)

- Đã đổi gì (1–3 gạch đầu dòng, ngôn ngữ người dùng, không thuật ngữ code).
- Đường dẫn zip tuyệt đối: `/Users/mac/Documents/Project/BDS/dist/lumiere-tower.zip` và số phiên bản.
- Cách cài: Plugins › Thêm mới › Tải plugin lên › chọn zip › **Thay thế bản hiện tại** → xoá cache site nếu có.
- Đã kiểm tra gì / **chưa** kiểm tra gì (đặc biệt PHP).
- Trạng thái git: mã commit, đã push chưa.
