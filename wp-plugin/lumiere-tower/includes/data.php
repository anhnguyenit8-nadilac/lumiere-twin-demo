<?php
/**
 * Dữ liệu: cài đặt, dữ liệu mẫu, và gói dữ liệu xuất ra front-end (window.LT_DATA).
 */

defined( 'ABSPATH' ) || exit;

/** Dữ liệu mẫu dùng chung với bản demo tĩnh (public/js/demo-data.js). */
function lt_demo() {
	static $demo = null;
	if ( null !== $demo ) {
		return $demo;
	}
	$demo = array();
	$file = LT_DIR . 'public/js/demo-data.js';
	if ( is_readable( $file ) ) {
		$raw   = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$start = strpos( $raw, '{' );
		$end   = strrpos( $raw, '}' );
		if ( false !== $start && false !== $end ) {
			$demo = json_decode( substr( $raw, $start, $end - $start + 1 ), true ) ?: array();
		}
	}
	return $demo;
}

function lt_default_settings() {
	$demo  = lt_demo();
	$tower = $demo['tower'] ?? array();
	unset( $tower['image'], $tower['w'], $tower['h'] );
	$status = array();
	foreach ( (array) ( $demo['floorStatus'] ?? array() ) as $f => $st ) {
		$status[] = $f . ' = ' . $st;
	}
	return array(
		'project_name'   => $demo['project']['name'] ?? 'LUMIÈRE TWIN',
		'location'       => $demo['project']['location'] ?? '',
		'eyebrow'        => $demo['project']['eyebrow'] ?? '',
		'title'          => $demo['project']['title'] ?? '',
		'credit'         => $demo['project']['credit'] ?? '',
		'cta_label'      => 'Đặt lịch tham quan',
		'tower_image_id' => 0,
		'tower_geo'      => wp_json_encode( $tower, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ),
		'price_step'     => $demo['priceStep'] ?? 0.018,
		'floor_status'   => implode( "\n", $status ),
		'floor_price'    => '',
		'contact_email'  => get_option( 'admin_email' ),
	);
}

function lt_settings() {
	return wp_parse_args( (array) get_option( 'lt_settings', array() ), lt_default_settings() );
}

/** "1-6, 8, TOP" → [1,2,3,4,5,6,8,"TOP"] */
function lt_parse_floors( $str ) {
	$out = array();
	foreach ( preg_split( '/[\s,;]+/', (string) $str ) as $part ) {
		$part = trim( $part );
		if ( '' === $part ) {
			continue;
		}
		if ( 'TOP' === strtoupper( $part ) ) {
			$out[] = 'TOP';
		} elseif ( preg_match( '/^(\d+)\s*-\s*(\d+)$/', $part, $m ) ) {
			$a = min( (int) $m[1], (int) $m[2] );
			$b = min( max( (int) $m[1], (int) $m[2] ), $a + 500 );
			for ( $i = $a; $i <= $b; $i++ ) {
				$out[] = $i;
			}
		} elseif ( ctype_digit( $part ) ) {
			$out[] = (int) $part;
		}
	}
	return array_values( array_unique( $out, SORT_REGULAR ) );
}

/** [1,2,3,5,"TOP"] → "1-3, 5, TOP" */
function lt_floors_to_string( $floors ) {
	$nums = array_filter( (array) $floors, 'is_numeric' );
	sort( $nums );
	$parts = array();
	$start = $prev = null;
	foreach ( $nums as $n ) {
		if ( null === $start ) {
			$start = $prev = $n;
		} elseif ( $n === $prev + 1 ) {
			$prev = $n;
		} else {
			$parts[] = $start === $prev ? "$start" : "$start-$prev";
			$start   = $prev = $n;
		}
	}
	if ( null !== $start ) {
		$parts[] = $start === $prev ? "$start" : "$start-$prev";
	}
	if ( in_array( 'TOP', (array) $floors, true ) ) {
		$parts[] = 'TOP';
	}
	return implode( ', ', $parts );
}

/** Dòng "7 = Đã bán" / "4-6: Đã bán" → map tầng => giá trị */
function lt_parse_floor_map( $text, $numeric = false ) {
	$map = array();
	foreach ( preg_split( '/\r?\n/', (string) $text ) as $line ) {
		if ( ! preg_match( '/^\s*([0-9TOPtop,\s-]+?)\s*[=:]\s*(.+?)\s*$/', $line, $m ) ) {
			continue;
		}
		$val = $numeric ? (float) str_replace( ',', '.', $m[2] ) : sanitize_text_field( $m[2] );
		foreach ( lt_parse_floors( $m[1] ) as $f ) {
			$map[ (string) $f ] = $val;
		}
	}
	return $map;
}

/** ID ảnh hoặc chuỗi (tên ảnh demo / URL) → dữ liệu ảnh cho front-end */
function lt_image_entry( $img ) {
	if ( is_numeric( $img ) && (int) $img > 0 ) {
		$src = wp_get_attachment_image_url( (int) $img, '2048x2048' ) ?: wp_get_attachment_image_url( (int) $img, 'full' );
		if ( ! $src ) {
			return null;
		}
		$thumb = wp_get_attachment_image_url( (int) $img, 'medium_large' ) ?: $src;
		return array( 'src' => $src, 'thumb' => $thumb );
	}
	return is_string( $img ) && '' !== $img ? $img : null;
}

/** Đọc meta của 1 loại căn (đã chuẩn hoá) */
function lt_unit_meta( $post_id ) {
	return wp_parse_args( (array) get_post_meta( $post_id, '_lt_unit', true ), array(
		'preset'   => '3br',
		'beds'     => 2,
		'baths'    => 2,
		'area'     => '',
		'ceiling'  => 3.0,
		'price'    => 0,
		'extra'    => '',
		'desc'     => '',
		'floors'   => '',
		'glb_id'   => 0,
		'rotation' => 0,
		'rooms'    => array(),
	) );
}

/** Danh sách loại căn đã xuất bản, theo thứ tự */
function lt_get_units() {
	$posts = get_posts( array(
		'post_type'   => 'lt_unit',
		'post_status' => 'publish',
		'numberposts' => 100,
		'orderby'     => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
	) );
	$units = array();
	foreach ( $posts as $p ) {
		$m     = lt_unit_meta( $p->ID );
		$rooms = array();
		foreach ( (array) $m['rooms'] as $r ) {
			$imgs = array_values( array_filter( array_map( 'lt_image_entry', (array) ( $r['imgs'] ?? array() ) ) ) );
			$rooms[] = array(
				'key'      => $r['key'] ?? '',
				'name'     => $r['name'] ?? '',
				'type'     => $r['type'] ?? '',
				'area'     => $r['area'] ?? '',
				'dims'     => $r['dims'] ?? '',
				'view'     => $r['view'] ?? '',
				'floor'    => $r['floor'] ?? '',
				'features' => array_values( array_filter( array_map( 'trim', preg_split( '/\r?\n/', (string) ( $r['features'] ?? '' ) ) ) ) ),
				'imgs'     => $imgs,
			);
		}
		$units[] = array(
			'slug'     => 'u' . $p->ID,
			'name'     => html_entity_decode( $p->post_title, ENT_QUOTES, 'UTF-8' ),
			'preset'   => $m['preset'],
			'beds'     => (int) $m['beds'],
			'baths'    => (int) $m['baths'],
			'area'     => (float) $m['area'],
			'ceiling'  => (float) $m['ceiling'],
			'price'    => (float) $m['price'],
			'extra'    => $m['extra'],
			'desc'     => $m['desc'],
			'floors'   => lt_parse_floors( $m['floors'] ),
			'glb'      => $m['glb_id'] ? (string) wp_get_attachment_url( (int) $m['glb_id'] ) : '',
			'rotation' => (float) $m['rotation'],
			'rooms'    => $rooms,
		);
	}
	return $units;
}

/** Toàn bộ dữ liệu cho front-end */
function lt_build_data() {
	$s     = lt_settings();
	$demo  = lt_demo();
	$tower = json_decode( (string) $s['tower_geo'], true );
	if ( ! is_array( $tower ) ) {
		$tower = $demo['tower'] ?? array();
	}
	$tower = array_merge( $demo['tower'] ?? array(), $tower );
	if ( $s['tower_image_id'] ) {
		$meta = wp_get_attachment_metadata( (int) $s['tower_image_id'] );
		$src  = wp_get_attachment_image_url( (int) $s['tower_image_id'], 'full' );
		if ( $src ) {
			$tower['image'] = $src;
			if ( ! empty( $meta['width'] ) ) {
				$tower['w'] = (int) $meta['width'];
				$tower['h'] = (int) $meta['height'];
			}
		}
	}

	return array(
		'base'        => LT_URL . 'public/',
		'project'     => array(
			'name'     => $s['project_name'],
			'location' => $s['location'],
			'eyebrow'  => $s['eyebrow'],
			'title'    => $s['title'],
			'credit'   => $s['credit'],
		),
		'tower'       => $tower,
		'units'       => lt_get_units(),
		'priceStep'   => (float) $s['price_step'],
		'floorStatus' => lt_parse_floor_map( $s['floor_status'] ),
		'floorPrice'  => lt_parse_floor_map( $s['floor_price'], true ),
		'contact'     => array(
			'ajax'  => admin_url( 'admin-ajax.php' ),
			'nonce' => wp_create_nonce( 'lt_lead' ),
		),
	);
}

/** Loại phòng dùng trong form admin */
function lt_room_types() {
	return array(
		'living'  => 'Phòng khách',
		'kitchen' => 'Bếp',
		'dining'  => 'Phòng ăn',
		'master'  => 'Phòng ngủ master',
		'bedroom' => 'Phòng ngủ',
		'study'   => 'Phòng làm việc',
		'bath'    => 'Phòng tắm / WC',
		'foyer'   => 'Sảnh vào',
		'terrace' => 'Ban công / sân vườn',
		'other'   => 'Khác',
	);
}

function lt_presets() {
	return array(
		'2br' => '2 phòng ngủ · ban công thẳng',
		'3br' => '3 phòng ngủ · ban công chữ L',
		'sky' => 'Sky villa · có jacuzzi',
		'ph'  => 'Penthouse · hồ bơi + jacuzzi',
	);
}
