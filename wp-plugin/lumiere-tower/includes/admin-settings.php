<?php
/**
 * Trang Cài đặt: thông tin dự án, ảnh tòa nhà, hình học các tầng, tình trạng/giá từng tầng, email nhận khách.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=lt_unit', 'Cài đặt tòa nhà 3D', 'Cài đặt', 'manage_options', 'lt-settings', 'lt_settings_page' );
	add_submenu_page( 'edit.php?post_type=lt_unit', 'Hướng dẫn', 'Hướng dẫn', 'edit_posts', 'lt-guide', 'lt_guide_page' );
} );

add_action( 'admin_init', function () {
	register_setting( 'lt_settings', 'lt_settings', array( 'sanitize_callback' => 'lt_sanitize_settings' ) );
} );

function lt_sanitize_settings( $in ) {
	$in  = (array) $in;
	$old = lt_settings();
	$geo = (string) ( $in['tower_geo'] ?? '' );
	if ( '' !== trim( $geo ) && ! is_array( json_decode( $geo, true ) ) ) {
		add_settings_error( 'lt_settings', 'lt_geo', 'Hình học các tầng không phải JSON hợp lệ — giữ nguyên giá trị cũ.' );
		$geo = $old['tower_geo'];
	}
	if ( '' === trim( $geo ) ) {
		$geo = lt_default_settings()['tower_geo'];
	}
	return array(
		'project_name'   => sanitize_text_field( $in['project_name'] ?? '' ),
		'location'       => sanitize_text_field( $in['location'] ?? '' ),
		'eyebrow'        => sanitize_text_field( $in['eyebrow'] ?? '' ),
		'title'          => wp_kses( $in['title'] ?? '', array( 'br' => array(), 'em' => array(), 'strong' => array() ) ),
		'credit'         => sanitize_text_field( $in['credit'] ?? '' ),
		'cta_label'      => sanitize_text_field( $in['cta_label'] ?? '' ),
		'tower_image_id' => absint( $in['tower_image_id'] ?? 0 ),
		'tower_geo'      => $geo,
		'price_step'     => max( 0, (float) str_replace( ',', '.', (string) ( $in['price_step'] ?? 0 ) ) ),
		'floor_status'   => sanitize_textarea_field( $in['floor_status'] ?? '' ),
		'floor_price'    => sanitize_textarea_field( $in['floor_price'] ?? '' ),
		'contact_email'  => sanitize_email( $in['contact_email'] ?? '' ),
	);
}

function lt_settings_page() {
	$s   = lt_settings();
	$img = $s['tower_image_id'] ? wp_get_attachment_image_url( (int) $s['tower_image_id'], 'medium' ) : LT_URL . 'public/assets/tower.jpg';
	$f   = function ( $k ) { return 'lt_settings[' . $k . ']'; };
	?>
	<div class="wrap lt-settings">
		<h1>Cài đặt tòa nhà 3D</h1>
		<p>Chèn vào trang: <code>[lumiere_tower]</code> &nbsp;·&nbsp; Tuỳ chọn: <code>[lumiere_tower height="800px" header="0" floor="7"]</code></p>
		<?php settings_errors( 'lt_settings' ); ?>
		<form method="post" action="options.php">
			<?php settings_fields( 'lt_settings' ); ?>

			<h2>Thông tin dự án</h2>
			<table class="form-table">
				<tr><th>Tên dự án</th><td><input class="regular-text" name="<?php echo esc_attr( $f( 'project_name' ) ); ?>" value="<?php echo esc_attr( $s['project_name'] ); ?>"></td></tr>
				<tr><th>Vị trí</th><td><input class="regular-text" name="<?php echo esc_attr( $f( 'location' ) ); ?>" value="<?php echo esc_attr( $s['location'] ); ?>"></td></tr>
				<tr><th>Dòng phụ trên tiêu đề</th><td><input class="regular-text" name="<?php echo esc_attr( $f( 'eyebrow' ) ); ?>" value="<?php echo esc_attr( $s['eyebrow'] ); ?>"></td></tr>
				<tr><th>Tiêu đề lớn</th><td><input class="regular-text" name="<?php echo esc_attr( $f( 'title' ) ); ?>" value="<?php echo esc_attr( $s['title'] ); ?>"><p class="description">Dùng <code>&lt;br&gt;</code> để xuống dòng.</p></td></tr>
				<tr><th>Ghi chú góc phải dưới</th><td><input class="regular-text" name="<?php echo esc_attr( $f( 'credit' ) ); ?>" value="<?php echo esc_attr( $s['credit'] ); ?>"></td></tr>
				<tr><th>Nút liên hệ</th><td><input class="regular-text" name="<?php echo esc_attr( $f( 'cta_label' ) ); ?>" value="<?php echo esc_attr( $s['cta_label'] ); ?>"></td></tr>
				<tr><th>Email nhận khách đăng ký</th><td><input type="email" class="regular-text" name="<?php echo esc_attr( $f( 'contact_email' ) ); ?>" value="<?php echo esc_attr( $s['contact_email'] ); ?>"><p class="description">Khách gửi form sẽ được lưu ở mục <em>Khách đăng ký</em> và gửi email về địa chỉ này.</p></td></tr>
			</table>

			<h2>Ảnh tòa nhà &amp; vị trí các tầng</h2>
			<table class="form-table">
				<tr><th>Ảnh phối cảnh</th><td>
					<input type="hidden" id="lt_tower_image_id" name="<?php echo esc_attr( $f( 'tower_image_id' ) ); ?>" value="<?php echo esc_attr( (int) $s['tower_image_id'] ); ?>">
					<img id="lt_tower_preview" src="<?php echo esc_url( $img ); ?>" alt="" style="max-width:360px;height:auto;display:block;margin-bottom:8px;border-radius:4px">
					<button type="button" class="button" id="lt_tower_pick">Chọn ảnh</button>
					<button type="button" class="button-link-delete" id="lt_tower_clear" data-default="<?php echo esc_url( LT_URL . 'public/assets/tower.jpg' ); ?>">Dùng ảnh mẫu</button>
					<p class="description">Đổi ảnh thì phải chỉnh lại toạ độ tầng bên dưới cho khớp ảnh mới.</p>
				</td></tr>
				<tr><th>Hình học các tầng (JSON)</th><td>
					<textarea class="large-text code" rows="16" name="<?php echo esc_attr( $f( 'tower_geo' ) ); ?>"><?php echo esc_textarea( $s['tower_geo'] ); ?></textarea>
					<p class="description">
						Toạ độ tính bằng <strong>pixel trên ảnh gốc</strong>.
						<code>base</code>: y chân tầng 1 · <code>floorH</code>: chiều cao 1 tầng · <code>count</code>: số tầng ·
						<code>towers</code>: các khối tháp (x1, x2, y đỉnh) · <code>top</code>/<code>topPolys</code>: tầng TOP (đa giác "x,y x,y …") ·
						<code>anchorX</code>: x điểm nối thẻ thông tin. Để trống để khôi phục mặc định.
					</p>
				</td></tr>
			</table>

			<h2>Giá &amp; tình trạng từng tầng</h2>
			<table class="form-table">
				<tr><th>Bước giá mỗi tầng</th><td><input type="number" step="0.001" min="0" name="<?php echo esc_attr( $f( 'price_step' ) ); ?>" value="<?php echo esc_attr( $s['price_step'] ); ?>"> <span class="description">VD 0.018 = mỗi tầng cao hơn đắt thêm 1,8%</span></td></tr>
				<tr><th>Tình trạng</th><td>
					<textarea class="large-text code" rows="6" name="<?php echo esc_attr( $f( 'floor_status' ) ); ?>" placeholder="4 = Đã bán&#10;8-9 = Đang giữ chỗ"><?php echo esc_textarea( $s['floor_status'] ); ?></textarea>
					<p class="description">Mỗi dòng: <code>tầng = tình trạng</code>. Tầng không ghi sẽ là "Còn hàng". Tình trạng có chữ "bán" hiển thị màu đỏ, "giữ" màu vàng.</p>
				</td></tr>
				<tr><th>Giá riêng từng tầng</th><td>
					<textarea class="large-text code" rows="4" name="<?php echo esc_attr( $f( 'floor_price' ) ); ?>" placeholder="12 = 11.5&#10;TOP = 42"><?php echo esc_textarea( $s['floor_price'] ); ?></textarea>
					<p class="description">Mỗi dòng: <code>tầng = giá (tỷ)</code> — ghi đè giá tự tính.</p>
				</td></tr>
			</table>
			<?php submit_button( 'Lưu cài đặt' ); ?>
		</form>
	</div>
	<?php
}

function lt_guide_page() {
	?>
	<div class="wrap lt-guide">
		<h1>Hướng dẫn chuẩn bị file GLB</h1>
		<h2>1. Quy trình</h2>
		<p><strong>AutoCAD (.dwg)</strong> → dựng 3D &amp; gán vật liệu trong <strong>3ds Max / SketchUp / Revit / Blender</strong> → xuất <strong>.glb</strong> → upload ở <em>Tòa nhà 3D › Loại căn hộ › Mô hình 3D</em>.</p>
		<p>Trình duyệt không đọc trực tiếp được file DWG; file DWG thường cũng chỉ là bản vẽ 2D, chưa có vật liệu.</p>
		<h2>2. Yêu cầu file</h2>
		<ul class="ul-disc">
			<li>Định dạng <code>.glb</code> (glTF binary), đơn vị <strong>mét</strong>, trục Y hướng lên (mặc định khi xuất glTF).</li>
			<li>Dung lượng nên dưới <strong>10 MB</strong>: bật nén <em>Draco</em> khi xuất (Blender: Export glTF › Compression), texture tối đa 2048px.</li>
			<li>Cắt bỏ trần, tường cao khoảng 1,2–1,5 m để nhìn được vào trong (kiểu mô hình sa bàn).</li>
		</ul>
		<h2>3. Đặt tên để tự nhận phòng</h2>
		<table class="widefat striped" style="max-width:720px">
			<thead><tr><th>Tên node trong model</th><th>Tác dụng</th></tr></thead>
			<tbody>
				<tr><td><code>room_living</code>, <code>room_kitchen</code>, <code>room_master</code>, <code>room_bed2</code>, <code>room_wc1</code>, <code>room_balcony</code> …</td><td>Mesh sàn (hoặc group) của từng phòng → vùng sáng khi rê chuột + chấm hotspot ở giữa phòng + diện tích tự tính từ kích thước.</td></tr>
				<tr><td><code>hotspot_living</code> (Empty)</td><td>Không bắt buộc — đặt vị trí chấm hotspot chính xác cho phòng <code>living</code>.</td></tr>
			</tbody>
		</table>
		<p>Mã phòng (phần sau <code>room_</code>) dùng để khớp với danh sách phòng nhập trong admin (tên hiển thị, ảnh, thông số). Loại phòng được đoán từ mã: bed/ngu → phòng ngủ, bath/wc → phòng tắm, kitchen/bep → bếp …</p>
		<p><a class="button" href="<?php echo esc_url( LT_URL . 'samples/sample-apartment.glb' ); ?>" download>Tải file GLB mẫu</a> — mở bằng Blender để xem cách đặt tên.</p>
		<h2>4. Chèn vào trang</h2>
		<p><code>[lumiere_tower]</code> — tuỳ chọn: <code>height="100vh"</code> (chiều cao khung), <code>header="0"</code> (ẩn thanh tiêu đề riêng nếu theme đã có header), <code>floor="7"</code> (mở sẵn tầng 7). Mỗi trang chỉ chèn 1 lần.</p>
	</div>
	<?php
}
