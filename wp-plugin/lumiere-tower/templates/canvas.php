<?php
/**
 * Mẫu trang "Tòa nhà 3D – Toàn màn hình": chỉ hiển thị nội dung trang (shortcode),
 * bỏ header/footer/banner của theme để tòa nhà chiếm trọn màn hình.
 */
defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
	<style>
		html, body.lt-canvas { margin: 0 !important; padding: 0 !important; background: #0b1424 !important; min-height: 0 !important; }
		body.lt-canvas .lt-canvas-main > *:not(#lt-app) { max-width: 1100px; margin: 24px auto; padding: 0 16px; color: #fff; }
		body.lt-canvas #lt-app { --lt-height: 100vh; height: 100vh; height: 100svh; }
		body.admin-bar.lt-canvas #lt-app { height: calc(100vh - 32px); height: calc(100svh - 32px); }
		@media (max-width: 782px) { body.admin-bar.lt-canvas #lt-app { height: calc(100vh - 46px); height: calc(100svh - 46px); } }
	</style>
</head>
<body <?php body_class( 'lt-canvas' ); ?>>
<?php wp_body_open(); ?>
<main class="lt-canvas-main">
	<?php
	while ( have_posts() ) {
		the_post();
		the_content();
	}
	?>
</main>
<?php wp_footer(); ?>
</body>
</html>
