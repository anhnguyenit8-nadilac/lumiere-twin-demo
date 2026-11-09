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
