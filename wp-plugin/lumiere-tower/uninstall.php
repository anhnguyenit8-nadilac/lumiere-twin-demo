<?php
/**
 * Gỡ plugin: xoá cài đặt. Giữ lại dữ liệu loại căn & khách đăng ký để không mất dữ liệu ngoài ý muốn.
 */
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;
delete_option( 'lt_settings' );
