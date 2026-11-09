<?php
/**
 * Giao diện tòa nhà 3D. Biến có sẵn: $s (cài đặt), $data, $tower, $img, $header, $floor, $full, $nav, $height.
 */
defined( 'ABSPATH' ) || exit;
$tw = (int) $tower['w'];
$th = (int) $tower['h'];
?>
<div id="lt-app"<?php echo $full ? ' class="lt-full"' : ''; ?> style="--lt-height: <?php echo esc_attr( $height ); ?>" data-floor="<?php echo esc_attr( $floor ); ?>">

	<?php if ( $header ) : ?>
	<header class="topbar">
		<a class="brand" href="#" data-action="home">
			<span class="brand-name"><?php echo esc_html( $s['project_name'] ); ?></span>
			<?php if ( $s['location'] ) : ?><span class="brand-sep"></span><span class="brand-loc"><?php echo esc_html( $s['location'] ); ?></span><?php endif; ?>
		</a>
		<nav class="nav">
			<?php foreach ( $nav as $n ) : ?>
				<a href="#" data-goto="<?php echo esc_attr( $n['floor'] ); ?>"><?php echo esc_html( $n['label'] ); ?></a>
			<?php endforeach; ?>
			<button type="button" class="btn-outline" data-action="contact"><?php echo esc_html( $s['cta_label'] ); ?></button>
		</nav>
	</header>
	<?php endif; ?>

	<section id="towerView" class="view is-active" aria-label="Chọn tầng">
		<div class="stage" id="stage">
			<img class="tower-bg" src="<?php echo esc_url( $img ); ?>" alt="<?php echo esc_attr( $s['project_name'] ); ?>" decoding="async" fetchpriority="high">
			<svg id="towerSvg" viewBox="0 0 <?php echo esc_attr( $tw ); ?> <?php echo esc_attr( $th ); ?>" preserveAspectRatio="xMidYMid slice" role="img" aria-label="<?php echo esc_attr( $s['project_name'] ); ?>">
				<defs>
					<linearGradient id="lit" x1="0" x2="1">
						<stop offset="0" stop-color="#ffd58a" stop-opacity=".55"/>
						<stop offset=".5" stop-color="#fff1cf" stop-opacity=".8"/>
						<stop offset="1" stop-color="#ffd58a" stop-opacity=".55"/>
					</linearGradient>
					<mask id="dimMask"><rect width="<?php echo esc_attr( $tw ); ?>" height="<?php echo esc_attr( $th ); ?>" fill="#fff"/><g id="dimHole" fill="#000"></g></mask>
				</defs>
				<rect class="dim" width="<?php echo esc_attr( $tw ); ?>" height="<?php echo esc_attr( $th ); ?>" mask="url(#dimMask)"/>
				<g id="floors"></g>
			</svg>
		</div>

		<div class="tower-hero">
			<?php if ( $s['eyebrow'] ) : ?><p class="eyebrow"><?php echo esc_html( $s['eyebrow'] ); ?></p><?php endif; ?>
			<?php if ( $s['title'] ) : ?><h1><?php echo wp_kses( $s['title'], array( 'br' => array(), 'em' => array(), 'strong' => array() ) ); ?></h1><?php endif; ?>
		</div>

		<ol class="floor-rail" id="floorRail" aria-label="Danh sách tầng"></ol>

		<div class="callout" id="callout" aria-live="polite">
			<div class="callout-num"><small>TẦNG</small><b id="coNum"></b></div>
			<div class="callout-body">
				<h3 id="coName"></h3>
				<p id="coMeta"></p>
				<span class="pill" id="coStatus"></span>
			</div>
		</div>
		<svg class="callout-line" id="calloutLine"><line x1="0" y1="0" x2="0" y2="0"/><circle r="3"/></svg>

		<p class="hint hint-tower"><span class="dot"></span>Di chuột vào một tầng để khám phá · nhấn để vào căn hộ</p>
		<?php if ( $s['credit'] ) : ?><p class="credit"><?php echo esc_html( $s['credit'] ); ?></p><?php endif; ?>
	</section>

	<section id="aptView" class="view" aria-label="Mô hình 3D căn hộ">
		<div id="three" class="three"></div>
		<div id="hotspots" class="hotspots"></div>

		<aside class="panel" id="panel">
			<div class="panel-grip" data-action="toggle-panel"></div>
			<div class="panel-head">
				<p class="eyebrow" id="pFloor"></p>
				<div class="floor-step">
					<button type="button" data-action="floor-up" aria-label="Tầng trên">▲</button>
					<button type="button" data-action="floor-down" aria-label="Tầng dưới">▼</button>
				</div>
			</div>
			<h2 id="pName"></h2>
			<div class="stats">
				<div><b id="pBeds"></b><span>Phòng ngủ</span></div>
				<div><b id="pBaths"></b><span>Phòng tắm</span></div>
				<div><b id="pArea"></b><span>m² sử dụng</span></div>
			</div>
			<p class="price"><small>TỪ</small> <b id="pPrice"></b></p>
			<p class="desc" id="pDesc"></p>
			<p class="extra" id="pExtra"></p>
			<ul class="room-list" id="roomList"></ul>
			<div class="panel-actions">
				<button type="button" class="btn-dark" data-action="back">← Về tòa nhà</button>
				<button type="button" class="btn-light" data-action="contact">Nhận bảng giá</button>
			</div>
		</aside>

		<div class="view-tools"><button type="button" data-action="reset-view" title="Góc nhìn mặc định">⟲ Góc nhìn</button></div>
		<p class="hint hint-apt"><span class="dot"></span>Kéo để xoay · cuộn để phóng to · nhấn vào phòng để xem nội thất</p>
	</section>

	<section id="gallery" class="gallery" aria-hidden="true" aria-label="Hình ảnh nội thất">
		<div class="g-slides" id="gSlides"></div>
		<div class="g-shade"></div>
		<div class="g-top">
			<div class="g-rooms" id="gRooms"></div>
			<button type="button" class="g-close" data-action="close-gallery" aria-label="Đóng">✕</button>
		</div>
		<div class="g-info">
			<p class="eyebrow" id="gEyebrow"></p>
			<h2 id="gTitle"></h2>
			<dl class="g-specs" id="gSpecs"></dl>
			<ul class="g-features" id="gFeatures"></ul>
		</div>
		<div class="g-nav">
			<button type="button" data-action="prev" aria-label="Ảnh trước">←</button>
			<span class="g-count"><b id="gIdx">01</b> / <span id="gTotal">01</span></span>
			<button type="button" data-action="next" aria-label="Ảnh sau">→</button>
		</div>
		<div class="g-thumbs" id="gThumbs"></div>
		<div class="g-progress"><i id="gProg"></i></div>
	</section>

	<div class="modal" id="contact" aria-hidden="true">
		<form class="modal-card" id="contactForm">
			<button type="button" class="g-close" data-action="close-contact" aria-label="Đóng">✕</button>
			<p class="eyebrow" id="cEyebrow"><?php echo esc_html( $s['project_name'] ); ?></p>
			<h2><?php echo esc_html( $s['cta_label'] ); ?></h2>
			<p class="muted">Chuyên viên tư vấn sẽ liên hệ trong thời gian sớm nhất.</p>
			<label>Họ và tên<input required name="name" autocomplete="name" maxlength="80"></label>
			<label>Số điện thoại<input required name="phone" type="tel" autocomplete="tel" pattern="[0-9 +]{9,14}"></label>
			<label>Quan tâm<select name="interest" id="cInterest"></select></label>
			<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">
			<button class="btn-light wide" type="submit">Gửi yêu cầu</button>
			<p class="ok" id="cOk" hidden>Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.</p>
		</form>
	</div>

	<div class="flash" id="flash"></div>
</div>
