<?php
/**
 * Form "Đặt lịch tham quan": lưu khách vào CPT lt_lead + gửi email.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_ajax_lt_lead', 'lt_handle_lead' );
add_action( 'wp_ajax_nopriv_lt_lead', 'lt_handle_lead' );

function lt_handle_lead() {
	// Chỉ bắt nonce với người đã đăng nhập (chống CSRF). Khách vãng lai: trang hay bị cache
	// (WP Rocket, LiteSpeed…) làm nonce hết hạn sau ~24h → mất khách. Đã có bẫy bot + giới hạn theo IP.
	if ( is_user_logged_in() && ! check_ajax_referer( 'lt_lead', 'nonce', false ) ) {
		wp_send_json_error( array( 'message' => 'Phiên đã hết hạn, vui lòng tải lại trang.' ), 403 );
	}
	// bẫy bot: ô ẩn "website" phải để trống
	if ( ! empty( $_POST['website'] ) ) {
		wp_send_json_success();
	}
	$name     = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$phone    = preg_replace( '/[^0-9+ ]/', '', sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) ) );
	$interest = sanitize_text_field( wp_unslash( $_POST['interest'] ?? '' ) );
	$floor    = sanitize_text_field( wp_unslash( $_POST['floor'] ?? '' ) );

	if ( '' === $name || strlen( preg_replace( '/\D/', '', $phone ) ) < 9 ) {
		wp_send_json_error( array( 'message' => 'Vui lòng nhập họ tên và số điện thoại hợp lệ.' ), 400 );
	}

	// giới hạn 5 lần / 10 phút / IP
	$ip  = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ) );
	$key = 'lt_lead_' . md5( $ip );
	$cnt = (int) get_transient( $key );
	if ( $cnt >= 5 ) {
		wp_send_json_error( array( 'message' => 'Bạn đã gửi nhiều lần, vui lòng thử lại sau ít phút.' ), 429 );
	}
	set_transient( $key, $cnt + 1, 10 * MINUTE_IN_SECONDS );

	$page = esc_url_raw( wp_get_referer() ?: '' );
	$id   = wp_insert_post( array(
		'post_type'   => 'lt_lead',
		'post_status' => 'private',
		'post_title'  => $name . ' – ' . $phone,
	) );
	if ( $id && ! is_wp_error( $id ) ) {
		update_post_meta( $id, '_lt_lead', compact( 'name', 'phone', 'interest', 'floor', 'page' ) );
	}

	$to = lt_settings()['contact_email'] ?: get_option( 'admin_email' );
	if ( $to ) {
		$body = "Khách đăng ký tham quan mới:\n\n"
			. "Họ tên: $name\nĐiện thoại: $phone\nQuan tâm: $interest\nĐang xem: $floor\nTrang: $page\n\n"
			. 'Xem tất cả: ' . admin_url( 'edit.php?post_type=lt_lead' );
		wp_mail( $to, '[' . lt_settings()['project_name'] . '] Khách đăng ký: ' . $name, $body );
	}
	wp_send_json_success( array( 'message' => 'ok' ) );
}

/* ---------- Danh sách khách trong admin ---------- */
add_filter( 'manage_lt_lead_posts_columns', function () {
	return array(
		'cb'          => '<input type="checkbox">',
		'title'       => 'Khách',
		'lt_phone'    => 'Điện thoại',
		'lt_interest' => 'Quan tâm',
		'lt_floor'    => 'Đang xem',
		'date'        => 'Thời gian',
	);
} );
add_action( 'manage_lt_lead_posts_custom_column', function ( $col, $post_id ) {
	$m = (array) get_post_meta( $post_id, '_lt_lead', true );
	if ( 'lt_phone' === $col && ! empty( $m['phone'] ) ) {
		echo '<a href="tel:' . esc_attr( preg_replace( '/\s/', '', $m['phone'] ) ) . '">' . esc_html( $m['phone'] ) . '</a>';
	} elseif ( 'lt_interest' === $col ) {
		echo esc_html( $m['interest'] ?? '' );
	} elseif ( 'lt_floor' === $col ) {
		echo esc_html( $m['floor'] ?? '' );
	}
}, 10, 2 );

add_action( 'add_meta_boxes_lt_lead', function () {
	add_meta_box( 'lt_lead_info', 'Thông tin khách', function ( $post ) {
		$m = (array) get_post_meta( $post->ID, '_lt_lead', true );
		echo '<table class="form-table">';
		foreach ( array( 'name' => 'Họ tên', 'phone' => 'Điện thoại', 'interest' => 'Quan tâm', 'floor' => 'Đang xem', 'page' => 'Trang' ) as $k => $label ) {
			echo '<tr><th>' . esc_html( $label ) . '</th><td>' . esc_html( $m[ $k ] ?? '' ) . '</td></tr>';
		}
		echo '</table>';
	}, 'lt_lead', 'normal', 'high' );
} );
