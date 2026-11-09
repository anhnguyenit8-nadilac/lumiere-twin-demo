---
name: lt-test-live
description: Kiểm tra plugin Lumière Tower trên một trang WordPress thật (site test/khách) bằng Chrome headless — bắt lỗi JS, rê chuột/bấm vào tầng, chụp màn hình; có thể thử bản sửa trong repo ngay trên site mà không cần cài. Dùng khi người dùng gửi link trang và nói "không chạy", "bị lỗi", "kiểm tra giúp", hoặc trước khi giao bản mới.
argument-hint: <url-trang-có-shortcode> [tầng]
---

# Kiểm tra plugin trên site WordPress thật

Tham số: `$ARGUMENTS` — URL trang đã chèn `[lumiere_tower]`, tuỳ chọn số tầng để thử (mặc định 7).

## Chạy

```
node .claude/skills/lt-test-live/live-test.mjs <url> <scratchpad>/live [--floor 7] [--patch] [--width 1440 --height 900]
```

- Ra `report.json` + `tower.png`, `hover.png`, `apt.png` trong thư mục ra. **Xem cả 3 ảnh** (Read) — số liệu đúng chưa chắc giao diện đúng.
- `--patch`: thay `js/*.js` và `css/style.css` của plugin trên site bằng bản trong repo, chỉ trong trình duyệt headless. Dùng để **chứng minh bản sửa chạy trên site** trước khi đóng gói. Không có `--patch` = đang thử đúng bản đang cài trên site.
- Thử thêm giao diện điện thoại khi liên quan bố cục: `--width 390 --height 844`.

## Đọc kết quả

| Dấu hiệu trong report | Nghĩa | Hướng xử lý |
|---|---|---|
| `ltApp: false` | Trang không có khung plugin | Shortcode chưa chèn / plugin chưa kích hoạt / sai URL / trang bị cache cũ |
| `pluginScripts` rỗng | Script plugin không được nạp | Theme thiếu `wp_footer()`, hoặc plugin tối ưu (WP Rocket, LiteSpeed, Autoptimize) gộp/hoãn JS |
| `ltApp: true`, `floors: 0`, không lỗi | Script chạy trước khi khung xuất hiện | Theme dựng nội dung bằng JS (React — `reactTheme: true`). Bản ≥ 1.0.1 đã xử lý bằng MutationObserver; nếu vẫn lỗi, xem `js/app.js` phần `boot` |
| `errors` có nội dung | Lỗi JS | Đọc stack, sửa ở `js/` (root), thử lại với `--patch` |
| `failedRequests` có file plugin 404 | Thiếu file trong zip | Build lại bằng `lt-release` |
| `width` < `viewport` nhiều | Theme ép khung hẹp | Gợi ý `[lumiere_tower full="1"]` hoặc mẫu trang "Tòa nhà 3D – Toàn màn hình" |
| `hover` không chứa `show` | Rê chuột không bật thẻ thông tin | Có lớp phủ của theme chặn chuột (z-index/pointer-events) — kiểm `document.elementFromPoint` |
| `apartment.canvas: false` | Không dựng được 3D | Lỗi WebGL/GLB — xem `errors`, kiểm URL file GLB |

Ghi chú: một số site trả mã **403 cho chính trang HTML** với trình duyệt headless (tường lửa/bảo mật) nhưng vẫn gửi nội dung — nếu `ltApp: true` thì bỏ qua 403 đó.

Khi cần soi thêm (DOM, CSS của theme đè lên plugin…), sửa tạm một bản sao của `live-test.mjs` trong scratchpad để chạy thêm `Runtime.evaluate`, đừng sửa bản trong skill trừ khi đó là cải tiến dùng lâu dài.

## Sau khi tìm ra lỗi

1. Sửa ở mã gốc (`js/`, `css/`, `wp-plugin/lumiere-tower/includes|templates/`) — không sửa `wp-plugin/lumiere-tower/public/`.
2. Chạy lại với `--patch` để xác nhận trên site (chỉ thử được phần JS/CSS; phần PHP phải cài bản mới mới thử được — nói rõ điều này).
3. Đóng gói bằng skill `lt-release`.
4. Báo người dùng (tiếng Việt): nguyên nhân bằng lời dễ hiểu, đã thử thế nào trên site của họ, ảnh chụp kết quả, việc họ cần làm (cài zip, xoá cache).
