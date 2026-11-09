<?php
/**
 * Plugin Name:       Lumière Tower 3D
 * Description:       Tòa nhà tương tác cho dự án BĐS: hover từng tầng, zoom vào mô hình 3D căn hộ (upload file GLB cho từng loại căn), slide ảnh nội thất toàn màn hình. Chèn bằng shortcode [lumiere_tower].
 * Version:           1.0.1
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Lumière
 * License:           GPL-2.0-or-later
 * Text Domain:       lumiere-tower
 */

defined( 'ABSPATH' ) || exit;

define( 'LT_VERSION', '1.0.1' );
define( 'LT_FILE', __FILE__ );
define( 'LT_DIR', plugin_dir_path( __FILE__ ) );
define( 'LT_URL', plugin_dir_url( __FILE__ ) );

require_once LT_DIR . 'includes/data.php';
require_once LT_DIR . 'includes/upload.php';
require_once LT_DIR . 'includes/admin-units.php';
require_once LT_DIR . 'includes/admin-settings.php';
require_once LT_DIR . 'includes/leads.php';
require_once LT_DIR . 'includes/shortcode.php';

register_activation_hook( __FILE__, 'lt_activate' );

/**
 * Kích hoạt: tạo cài đặt mặc định + 4 loại căn mẫu (nếu chưa có) để admin sửa lại.
 */
function lt_activate() {
	lt_register_post_types();
	if ( false === get_option( 'lt_settings' ) ) {
		add_option( 'lt_settings', lt_default_settings() );
	}
	$existing = get_posts( array( 'post_type' => 'lt_unit', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ) );
	if ( ! $existing ) {
		$demo = lt_demo();
		foreach ( (array) ( $demo['units'] ?? array() ) as $i => $u ) {
			$id = wp_insert_post( array(
				'post_type'   => 'lt_unit',
				'post_status' => 'publish',
				'post_title'  => $u['name'],
				'menu_order'  => $i,
			) );
			if ( $id && ! is_wp_error( $id ) ) {
				update_post_meta( $id, '_lt_unit', array(
					'preset'   => $u['preset'],
					'beds'     => $u['beds'],
					'baths'    => $u['baths'],
					'area'     => '',
					'ceiling'  => $u['ceiling'],
					'price'    => $u['price'],
					'extra'    => $u['extra'],
					'desc'     => $u['desc'],
					'floors'   => lt_floors_to_string( $u['floors'] ),
					'glb_id'   => 0,
					'rotation' => 0,
					'rooms'    => array(),
				) );
			}
		}
	}
	flush_rewrite_rules();
}

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), function ( $links ) {
	array_unshift(
		$links,
		'<a href="' . esc_url( admin_url( 'edit.php?post_type=lt_unit&page=lt-settings' ) ) . '">Cài đặt</a>'
	);
	return $links;
} );
