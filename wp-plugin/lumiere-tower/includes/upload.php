<?php
/**
 * Cho phép upload file .glb (model 3D) vào Media Library.
 * WordPress mặc định chặn loại file này.
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'upload_mimes', function ( $mimes ) {
	if ( current_user_can( 'edit_posts' ) ) {
		$mimes['glb'] = 'model/gltf-binary';
	}
	return $mimes;
} );

/**
 * PHP thường nhận diện .glb là application/octet-stream nên WordPress từ chối.
 * Kiểm tra 4 byte đầu "glTF" (chữ ký chuẩn của GLB) rồi mới cho phép.
 */
add_filter( 'wp_check_filetype_and_ext', function ( $data, $file, $filename ) {
	if ( 'glb' !== strtolower( pathinfo( (string) $filename, PATHINFO_EXTENSION ) ) || ! current_user_can( 'edit_posts' ) ) {
		return $data;
	}
	$magic = '';
	$fh    = @fopen( $file, 'rb' ); // phpcs:ignore
	if ( $fh ) {
		$magic = fread( $fh, 4 ); // phpcs:ignore
		fclose( $fh ); // phpcs:ignore
	}
	if ( 'glTF' === $magic ) {
		return array( 'ext' => 'glb', 'type' => 'model/gltf-binary', 'proper_filename' => false );
	}
	return $data;
}, 10, 3 );

/** Biểu tượng cho file GLB trong Media Library */
add_filter( 'wp_mime_type_icon', function ( $icon, $mime ) {
	return 'model/gltf-binary' === $mime ? includes_url( 'images/media/interactive.png' ) : $icon;
}, 10, 2 );
