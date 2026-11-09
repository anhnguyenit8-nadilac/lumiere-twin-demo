<?php
/**
 * Shortcode [lumiere_tower height="100vh" header="1" floor=""]
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_enqueue_scripts', function () {
	$v = LT_VERSION;
	$p = LT_URL . 'public/';
	wp_register_style( 'lt-fonts', 'https://fonts.googleapis.com/css2?family=Noto+Serif+Display:wght@400;500;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap', array(), null );
	wp_register_style( 'lt-style', $p . 'css/style.css', array( 'lt-fonts' ), $v );
	wp_register_script( 'lt-three', $p . 'vendor/three.min.js', array(), '0.147.0', true );
	wp_register_script( 'lt-orbit', $p . 'vendor/OrbitControls.js', array( 'lt-three' ), '0.147.0', true );
	wp_register_script( 'lt-bgu', $p . 'vendor/BufferGeometryUtils.js', array( 'lt-three' ), '0.147.0', true );
	wp_register_script( 'lt-gltf', $p . 'vendor/GLTFLoader.js', array( 'lt-three' ), '0.147.0', true );
	wp_register_script( 'lt-draco', $p . 'vendor/DRACOLoader.js', array( 'lt-three' ), '0.147.0', true );
	wp_register_script( 'lt-demo', $p . 'js/demo-data.js', array(), $v, true );
	wp_register_script( 'lt-data', $p . 'js/data.js', array( 'lt-demo' ), $v, true );
	wp_register_script( 'lt-scene', $p . 'js/scene3d.js', array( 'lt-three', 'lt-orbit', 'lt-bgu', 'lt-gltf', 'lt-draco', 'lt-data' ), $v, true );
	wp_register_script( 'lt-app', $p . 'js/app.js', array( 'lt-scene' ), $v, true );

	$post = get_post();
	if ( is_singular() && $post && has_shortcode( $post->post_content, 'lumiere_tower' ) ) {
		wp_enqueue_style( 'lt-style' );
	}
}, 20 );

add_shortcode( 'lumiere_tower', 'lt_render_shortcode' );

function lt_render_shortcode( $atts ) {
	$atts = shortcode_atts( array(
		'height' => '100vh',
		'header' => '1',
		'floor'  => '',
	), $atts, 'lumiere_tower' );

	$height = preg_match( '/^\d+(\.\d+)?(px|vh|svh|dvh|rem|em|%)$/', trim( $atts['height'] ) ) ? trim( $atts['height'] ) : '100vh';
	$data   = lt_build_data();

	wp_enqueue_style( 'lt-style' );
	wp_enqueue_script( 'lt-app' );
	static $inlined = false;
	if ( ! $inlined ) {
		$inlined = true;
		wp_add_inline_script( 'lt-demo', 'window.LT_DATA = ' . wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG ) . ';', 'before' );
	}

	$s      = lt_settings();
	$tower  = $data['tower'];
	$img    = preg_match( '#^(https?:)?//#', $tower['image'] ) ? $tower['image'] : $data['base'] . $tower['image'];
	$header = '0' !== (string) $atts['header'];
	$floor  = sanitize_text_field( $atts['floor'] );

	// Menu: mỗi loại căn → tầng đầu tiên của loại đó
	$nav = array();
	foreach ( array_slice( $data['units'] ?: ( lt_demo()['units'] ?? array() ), 0, 4 ) as $u ) {
		if ( ! empty( $u['floors'] ) ) {
			$nav[] = array( 'label' => $u['name'], 'floor' => (string) $u['floors'][0] );
		}
	}

	ob_start();
	include LT_DIR . 'templates/app.php';
	return ob_get_clean();
}
