=== Lumière Tower 3D ===
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later

Tòa nhà tương tác cho website bất động sản: hover tầng, zoom vào mô hình 3D căn hộ, slide ảnh nội thất.

== Cài đặt ==
1. Plugins › Cài mới › Tải plugin lên › chọn lumiere-tower.zip › Kích hoạt.
2. Menu "Tòa nhà 3D": sửa 4 loại căn mẫu (tầng áp dụng, giá, file GLB, phòng & ảnh).
3. Tòa nhà 3D › Cài đặt: tên dự án, ảnh tòa nhà, toạ độ tầng, tình trạng/giá từng tầng, email nhận khách.
4. Chèn shortcode [lumiere_tower] vào trang (Gutenberg: khối Shortcode; Elementor: widget Shortcode).

== Shortcode ==
[lumiere_tower height="100vh" header="1" floor=""]
- height: chiều cao khung (px, vh, %…)
- header: 0 để ẩn thanh tiêu đề riêng (khi theme đã có header)
- floor: mở sẵn 1 tầng, VD floor="7" hoặc floor="TOP"

== File GLB ==
- Xuất .glb, đơn vị mét, nén Draco, nên < 10 MB.
- Đặt tên node sàn phòng: room_living, room_kitchen, room_master, room_bed2, room_wc1…
- Tuỳ chọn: Empty "hotspot_<mã>" để đặt vị trí chấm hotspot.
- Xem Tòa nhà 3D › Hướng dẫn và file mẫu samples/sample-apartment.glb.

== Ghi chú ==
- Mỗi trang chỉ chèn shortcode 1 lần.
- Plugin dùng Three.js r147 (đi kèm, không tải từ CDN). Font Google: Noto Serif Display, Be Vietnam Pro.
- Ảnh nội thất mẫu từ Unsplash — thay bằng ảnh thật của dự án.
