<?php
/**
 * Loại căn hộ (CPT lt_unit): thông tin căn, tầng áp dụng, file GLB, danh sách phòng.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'lt_register_post_types' );

function lt_register_post_types() {
	register_post_type( 'lt_unit', array(
		'labels'       => array(
			'name'          => 'Loại căn hộ',
			'singular_name' => 'Loại căn hộ',
			'menu_name'     => 'Tòa nhà 3D',
			'all_items'     => 'Loại căn hộ',
			'add_new'       => 'Thêm loại căn',
			'add_new_item'  => 'Thêm loại căn hộ',
			'edit_item'     => 'Sửa loại căn hộ',
			'search_items'  => 'Tìm loại căn',
			'not_found'     => 'Chưa có loại căn nào',
		),
		'public'       => false,
		'show_ui'      => true,
		'show_in_menu' => true,
		'menu_icon'    => 'dashicons-building',
		'menu_position'=> 26,
		'supports'     => array( 'title', 'page-attributes' ),
		'capability_type' => 'post',
	) );

	register_post_type( 'lt_lead', array(
		'labels'       => array(
			'name'          => 'Khách đăng ký',
			'singular_name' => 'Khách đăng ký',
			'all_items'     => 'Khách đăng ký',
			'edit_item'     => 'Chi tiết khách đăng ký',
			'not_found'     => 'Chưa có khách đăng ký',
		),
		'public'       => false,
		'show_ui'      => true,
		'show_in_menu' => 'edit.php?post_type=lt_unit',
		'supports'     => array( 'title' ),
		'capability_type' => 'post',
		'capabilities' => array( 'create_posts' => 'do_not_allow' ),
		'map_meta_cap' => true,
	) );
}

/* ---------- Meta box ---------- */
add_action( 'add_meta_boxes_lt_unit', function () {
	add_meta_box( 'lt_unit_info', 'Thông tin căn hộ', 'lt_unit_box_info', 'lt_unit', 'normal', 'high' );
	add_meta_box( 'lt_unit_model', 'Mô hình 3D (GLB)', 'lt_unit_box_model', 'lt_unit', 'normal', 'high' );
	add_meta_box( 'lt_unit_rooms', 'Danh sách phòng', 'lt_unit_box_rooms', 'lt_unit', 'normal', 'default' );
	add_meta_box( 'lt_unit_help', 'Hướng dẫn', 'lt_unit_box_help', 'lt_unit', 'side', 'default' );
} );

function lt_unit_box_info( $post ) {
	$m = lt_unit_meta( $post->ID );
	wp_nonce_field( 'lt_unit_save', 'lt_unit_nonce' );
	?>
	<table class="form-table lt-form">
		<tr>
			<th><label for="lt_floors">Tầng áp dụng</label></th>
			<td><input type="text" id="lt_floors" name="lt[floors]" value="<?php echo esc_attr( $m['floors'] ); ?>" class="regular-text" placeholder="VD: 1-6, 8, TOP">
				<p class="description">Dùng dấu gạch cho khoảng tầng, dấu phẩy để ngăn cách. <code>TOP</code> là tầng mái/penthouse.</p></td>
		</tr>
		<tr>
			<th>Cấu hình</th>
			<td class="lt-inline">
				<label>Phòng ngủ <input type="number" min="0" max="20" name="lt[beds]" value="<?php echo esc_attr( $m['beds'] ); ?>"></label>
				<label>Phòng tắm <input type="number" min="0" max="20" name="lt[baths]" value="<?php echo esc_attr( $m['baths'] ); ?>"></label>
				<label>Diện tích (m²) <input type="number" min="0" step="0.1" name="lt[area]" value="<?php echo esc_attr( $m['area'] ); ?>" placeholder="tự tính"></label>
				<label>Trần cao (m) <input type="number" min="0" step="0.1" name="lt[ceiling]" value="<?php echo esc_attr( $m['ceiling'] ); ?>"></label>
			</td>
		</tr>
		<tr>
			<th><label for="lt_price">Giá từ (tỷ đồng)</label></th>
			<td><input type="number" id="lt_price" min="0" step="0.01" name="lt[price]" value="<?php echo esc_attr( $m['price'] ); ?>">
				<p class="description">Giá của tầng thấp nhất. Mỗi tầng cao hơn tăng theo "Bước giá mỗi tầng" trong Cài đặt (có thể đặt giá riêng từng tầng ở đó).</p></td>
		</tr>
		<tr>
			<th><label for="lt_extra">Điểm nổi bật</label></th>
			<td><input type="text" id="lt_extra" name="lt[extra]" value="<?php echo esc_attr( $m['extra'] ); ?>" class="regular-text" placeholder="VD: Ban công góc chữ L"></td>
		</tr>
		<tr>
			<th><label for="lt_desc">Mô tả ngắn</label></th>
			<td><textarea id="lt_desc" name="lt[desc]" rows="3" class="large-text"><?php echo esc_textarea( $m['desc'] ); ?></textarea></td>
		</tr>
	</table>
	<?php
}

function lt_unit_box_model( $post ) {
	$m    = lt_unit_meta( $post->ID );
	$file = $m['glb_id'] ? get_attached_file( (int) $m['glb_id'] ) : '';
	$name = $file ? basename( $file ) : '';
	$size = $file && file_exists( $file ) ? size_format( filesize( $file ), 1 ) : '';
	?>
	<table class="form-table lt-form">
		<tr>
			<th>File GLB</th>
			<td>
				<div class="lt-glb">
					<input type="hidden" name="lt[glb_id]" id="lt_glb_id" value="<?php echo esc_attr( (int) $m['glb_id'] ); ?>">
					<span class="lt-glb-name" id="lt_glb_name"><?php echo $name ? esc_html( $name . ( $size ? " ($size)" : '' ) ) : '<em>Chưa có — đang dùng mô hình dựng sẵn bên dưới</em>'; ?></span>
					<button type="button" class="button" id="lt_glb_pick">Chọn / upload GLB</button>
					<button type="button" class="button-link-delete" id="lt_glb_clear" <?php echo $m['glb_id'] ? '' : 'hidden'; ?>>Gỡ file</button>
				</div>
				<p class="description">Xuất từ Blender / 3ds Max / SketchUp / Revit dưới dạng <strong>.glb</strong>, đơn vị <strong>mét</strong>, nên nén Draco (&lt; 10 MB). Đặt tên node sàn mỗi phòng là <code>room_&lt;mã&gt;</code> (VD <code>room_kitchen</code>) để tự tạo vùng hover và hotspot.</p>
			</td>
		</tr>
		<tr>
			<th><label for="lt_rotation">Xoay model</label></th>
			<td><input type="number" id="lt_rotation" step="1" min="-360" max="360" name="lt[rotation]" value="<?php echo esc_attr( $m['rotation'] ); ?>"> độ
				<p class="description">Xoay để ban công/mặt kính hướng về phía người xem (thường 0, 90, 180 hoặc -90).</p></td>
		</tr>
		<tr>
			<th><label for="lt_preset">Mô hình dựng sẵn</label></th>
			<td><select id="lt_preset" name="lt[preset]">
				<?php foreach ( lt_presets() as $k => $label ) : ?>
					<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $m['preset'], $k ); ?>><?php echo esc_html( $label ); ?></option>
				<?php endforeach; ?>
			</select>
				<p class="description">Dùng khi chưa có file GLB, hoặc khi file GLB lỗi không tải được.</p></td>
		</tr>
	</table>
	<?php
}

function lt_unit_box_rooms( $post ) {
	$m     = lt_unit_meta( $post->ID );
	$rooms = array();
	foreach ( (array) $m['rooms'] as $r ) {
		$previews = array();
		foreach ( (array) ( $r['imgs'] ?? array() ) as $img ) {
			if ( is_numeric( $img ) ) {
				$previews[] = array( 'id' => (int) $img, 'url' => (string) wp_get_attachment_image_url( (int) $img, 'thumbnail' ) );
			} elseif ( is_string( $img ) && ! preg_match( '#[/.]#', $img ) ) {
				$previews[] = array( 'id' => $img, 'url' => LT_URL . 'public/assets/interiors/thumbs/' . $img . '.jpg' );
			} elseif ( is_string( $img ) ) {
				$previews[] = array( 'id' => $img, 'url' => $img );
			}
		}
		$r['imgs'] = $previews;
		$rooms[]   = $r;
	}
	?>
	<p class="description lt-rooms-help">
		<strong>Mã phòng</strong> phải trùng tên node trong file GLB (bỏ tiền tố <code>room_</code>), VD node <code>room_master</code> → mã <code>master</code>.
		Phòng có trong GLB nhưng không khai báo ở đây vẫn hiện, dùng ảnh & thông số mặc định. Để trống danh sách này để dùng toàn bộ phòng mặc định.
		Kéo thả <span class="dashicons dashicons-move"></span> để sắp xếp thứ tự hiển thị.
	</p>
	<div id="lt-rooms" data-types="<?php echo esc_attr( wp_json_encode( lt_room_types() ) ); ?>"></div>
	<textarea name="lt[rooms_json]" id="lt_rooms_json" hidden><?php echo esc_textarea( wp_json_encode( $rooms, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) ); ?></textarea>
	<p><button type="button" class="button" id="lt-room-add">+ Thêm phòng</button>
		<button type="button" class="button-link" id="lt-room-defaults">Điền danh sách phòng mặc định</button></p>
	<?php
}

function lt_unit_box_help() {
	?>
	<ol class="lt-help">
		<li>Nhập <strong>tầng áp dụng</strong> cho loại căn.</li>
		<li>Upload <strong>file GLB</strong> (không bắt buộc).</li>
		<li>Khai báo <strong>phòng</strong>: tên, ảnh nội thất, thông số.</li>
		<li>Chèn shortcode <code>[lumiere_tower]</code> vào trang bất kỳ.</li>
	</ol>
	<p>Thứ tự loại căn: ô <em>Thứ tự</em> trong khung "Thuộc tính".</p>
	<?php
}

/* ---------- Lưu ---------- */
add_action( 'save_post_lt_unit', function ( $post_id ) {
	if ( ! isset( $_POST['lt_unit_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['lt_unit_nonce'] ) ), 'lt_unit_save' ) ) {
		return;
	}
	if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	$in = isset( $_POST['lt'] ) ? wp_unslash( (array) $_POST['lt'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- từng trường được làm sạch bên dưới

	$preset = sanitize_key( $in['preset'] ?? '3br' );
	$glb_id = absint( $in['glb_id'] ?? 0 );
	if ( $glb_id && 'glb' !== strtolower( pathinfo( (string) get_attached_file( $glb_id ), PATHINFO_EXTENSION ) ) ) {
		$glb_id = 0;
	}

	$rooms = array();
	$raw   = json_decode( (string) ( $in['rooms_json'] ?? '[]' ), true );
	foreach ( (array) $raw as $r ) {
		if ( ! is_array( $r ) ) {
			continue;
		}
		$key  = sanitize_key( $r['key'] ?? '' );
		$name = sanitize_text_field( $r['name'] ?? '' );
		if ( '' === $key && '' === $name ) {
			continue;
		}
		if ( '' === $key ) {
			$key = sanitize_key( remove_accents( $name ) );
		}
		$imgs = array();
		foreach ( (array) ( $r['imgs'] ?? array() ) as $img ) {
			$v = is_array( $img ) ? ( $img['id'] ?? '' ) : $img;
			if ( is_numeric( $v ) && (int) $v > 0 ) {
				$imgs[] = (int) $v;
			} elseif ( is_string( $v ) && preg_match( '/^[a-z0-9-]+$/', $v ) ) {
				$imgs[] = $v; // ảnh mẫu đi kèm plugin
			} elseif ( is_string( $v ) && wp_http_validate_url( $v ) ) {
				$imgs[] = esc_url_raw( $v );
			}
		}
		$type    = sanitize_key( $r['type'] ?? '' );
		$rooms[] = array(
			'key'      => $key,
			'name'     => $name,
			'type'     => array_key_exists( $type, lt_room_types() ) ? $type : '',
			'area'     => '' === ( $r['area'] ?? '' ) ? '' : (float) $r['area'],
			'dims'     => sanitize_text_field( $r['dims'] ?? '' ),
			'view'     => sanitize_text_field( $r['view'] ?? '' ),
			'floor'    => sanitize_text_field( $r['floor'] ?? '' ),
			'features' => sanitize_textarea_field( $r['features'] ?? '' ),
			'imgs'     => $imgs,
		);
	}

	update_post_meta( $post_id, '_lt_unit', array(
		'preset'   => array_key_exists( $preset, lt_presets() ) ? $preset : '3br',
		'beds'     => absint( $in['beds'] ?? 0 ),
		'baths'    => absint( $in['baths'] ?? 0 ),
		'area'     => '' === ( $in['area'] ?? '' ) ? '' : (float) $in['area'],
		'ceiling'  => (float) ( $in['ceiling'] ?? 3 ),
		'price'    => (float) ( $in['price'] ?? 0 ),
		'extra'    => sanitize_text_field( $in['extra'] ?? '' ),
		'desc'     => sanitize_textarea_field( $in['desc'] ?? '' ),
		'floors'   => lt_floors_to_string( lt_parse_floors( sanitize_text_field( $in['floors'] ?? '' ) ) ),
		'glb_id'   => $glb_id,
		'rotation' => max( -360, min( 360, (float) ( $in['rotation'] ?? 0 ) ) ),
		'rooms'    => $rooms,
	) );
} );

/* ---------- Cột danh sách ---------- */
add_filter( 'manage_lt_unit_posts_columns', function ( $cols ) {
	return array(
		'cb'        => $cols['cb'],
		'title'     => 'Loại căn',
		'lt_floors' => 'Tầng',
		'lt_config' => 'Cấu hình',
		'lt_price'  => 'Giá từ',
		'lt_glb'    => 'Mô hình 3D',
		'lt_rooms'  => 'Phòng',
	);
} );
add_action( 'manage_lt_unit_posts_custom_column', function ( $col, $post_id ) {
	$m = lt_unit_meta( $post_id );
	switch ( $col ) {
		case 'lt_floors':
			echo esc_html( $m['floors'] ?: '—' );
			break;
		case 'lt_config':
			echo esc_html( sprintf( '%d PN · %d WC', $m['beds'], $m['baths'] ) );
			break;
		case 'lt_price':
			echo $m['price'] ? esc_html( rtrim( rtrim( number_format( (float) $m['price'], 2, ',', '.' ), '0' ), ',' ) . ' tỷ' ) : '—';
			break;
		case 'lt_glb':
			$file = $m['glb_id'] ? get_attached_file( (int) $m['glb_id'] ) : '';
			echo $file ? '<span class="dashicons dashicons-yes" style="color:#2a8"></span> ' . esc_html( basename( $file ) ) : '<span style="color:#888">Dựng sẵn (' . esc_html( lt_presets()[ $m['preset'] ] ?? $m['preset'] ) . ')</span>';
			break;
		case 'lt_rooms':
			echo $m['rooms'] ? esc_html( count( $m['rooms'] ) . ' phòng' ) : '<span style="color:#888">Mặc định</span>';
			break;
	}
}, 10, 2 );

/* ---------- Script admin ---------- */
add_action( 'admin_enqueue_scripts', function ( $hook ) {
	$screen = get_current_screen();
	if ( ! $screen ) {
		return;
	}
	$is_unit     = 'lt_unit' === $screen->post_type && in_array( $hook, array( 'post.php', 'post-new.php' ), true );
	$is_settings = 'lt_unit_page_lt-settings' === $screen->id;
	if ( ! $is_unit && ! $is_settings ) {
		return;
	}
	wp_enqueue_media();
	wp_enqueue_script( 'jquery-ui-sortable' );
	wp_enqueue_style( 'lt-admin', LT_URL . 'admin/admin.css', array(), LT_VERSION );
	wp_enqueue_script( 'lt-admin', LT_URL . 'admin/admin.js', array( 'jquery', 'jquery-ui-sortable' ), LT_VERSION, true );
	wp_localize_script( 'lt-admin', 'LT_ADMIN', array(
		'thumbBase' => LT_URL . 'public/assets/interiors/thumbs/',
		'defaults'  => array_map( function ( $r ) {
			return array( 'key' => $r[0], 'name' => $r[1], 'type' => $r[2] );
		}, array(
			// trùng mã phòng của mô hình dựng sẵn
			array( 'living', 'Phòng khách', 'living' ),
			array( 'kitchen', 'Bếp đảo', 'kitchen' ),
			array( 'dining', 'Phòng ăn', 'dining' ),
			array( 'master', 'Phòng ngủ Master', 'master' ),
			array( 'mbath', 'Spa Bath', 'bath' ),
			array( 'bed2', 'Phòng ngủ 2', 'bedroom' ),
			array( 'bed3', 'Phòng ngủ 3', 'bedroom' ),
			array( 'bath2', 'Phòng tắm 2', 'bath' ),
			array( 'foyer', 'Sảnh vào', 'foyer' ),
			array( 'terrace', 'Ban công', 'terrace' ),
		) ),
	) );
} );
