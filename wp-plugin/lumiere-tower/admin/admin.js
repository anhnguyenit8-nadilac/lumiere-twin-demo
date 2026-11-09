/* Lumière Tower 3D — admin: chọn GLB, danh sách phòng, ảnh tòa nhà */
(function ($) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- File GLB ---------- */
  let glbFrame;
  $('#lt_glb_pick').on('click', function (e) {
    e.preventDefault();
    if (!glbFrame) {
      glbFrame = wp.media({ title: 'Chọn file mô hình 3D (.glb)', button: { text: 'Dùng file này' }, multiple: false });
      glbFrame.on('select', function () {
        const a = glbFrame.state().get('selection').first().toJSON();
        if (!/\.glb$/i.test(a.filename || a.url || '')) { window.alert('Vui lòng chọn file .glb'); return; }
        $('#lt_glb_id').val(a.id);
        $('#lt_glb_name').text(a.filename + (a.filesizeHumanReadable ? ' (' + a.filesizeHumanReadable + ')' : ''));
        $('#lt_glb_clear').prop('hidden', false);
      });
    }
    glbFrame.open();
  });
  $('#lt_glb_clear').on('click', function (e) {
    e.preventDefault();
    $('#lt_glb_id').val(0);
    $('#lt_glb_name').html('<em>Chưa có — đang dùng mô hình dựng sẵn bên dưới</em>');
    $(this).prop('hidden', true);
  });

  /* ---------- Ảnh tòa nhà (trang Cài đặt) ---------- */
  let towerFrame;
  $('#lt_tower_pick').on('click', function (e) {
    e.preventDefault();
    if (!towerFrame) {
      towerFrame = wp.media({ title: 'Ảnh phối cảnh tòa nhà', library: { type: 'image' }, button: { text: 'Dùng ảnh này' }, multiple: false });
      towerFrame.on('select', function () {
        const a = towerFrame.state().get('selection').first().toJSON();
        $('#lt_tower_image_id').val(a.id);
        $('#lt_tower_preview').attr('src', (a.sizes && a.sizes.medium ? a.sizes.medium.url : a.url));
      });
    }
    towerFrame.open();
  });
  $('#lt_tower_clear').on('click', function (e) {
    e.preventDefault();
    $('#lt_tower_image_id').val(0);
    $('#lt_tower_preview').attr('src', $(this).data('default'));
  });

  /* ---------- Danh sách phòng ---------- */
  const $wrap = $('#lt-rooms');
  if (!$wrap.length) return;
  const $json = $('#lt_rooms_json');
  const types = $wrap.data('types') || {};
  let rooms = [];
  try { rooms = JSON.parse($json.val() || '[]') || []; } catch (e) { rooms = []; }

  const typeOptions = (sel) => '<option value="">— tự đoán từ mã —</option>' +
    Object.keys(types).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(types[k])}</option>`).join('');

  function rowHtml(r) {
    const imgs = (r.imgs || []).map((im) => `<li data-id="${esc(im.id)}"><img src="${esc(im.url)}" alt=""><button type="button" class="lt-img-x" title="Bỏ ảnh">×</button></li>`).join('');
    return `
      <div class="lt-room">
        <div class="lt-room-head">
          <span class="dashicons dashicons-move lt-handle" title="Kéo để sắp xếp"></span>
          <strong class="lt-room-title">${esc(r.name || r.key || 'Phòng mới')}</strong>
          <code class="lt-room-key">${r.key ? 'room_' + esc(r.key) : ''}</code>
          <button type="button" class="button-link lt-toggle">Thu gọn</button>
          <button type="button" class="button-link-delete lt-remove">Xoá</button>
        </div>
        <div class="lt-room-body">
          <div class="lt-grid">
            <label>Mã phòng <input data-f="key" value="${esc(r.key)}" placeholder="vd: kitchen"></label>
            <label>Tên hiển thị <input data-f="name" value="${esc(r.name)}" placeholder="vd: Bếp đảo"></label>
            <label>Loại phòng <select data-f="type">${typeOptions(r.type)}</select></label>
            <label>Diện tích (m²) <input data-f="area" type="number" step="0.1" min="0" value="${esc(r.area)}" placeholder="tự tính từ model"></label>
            <label>Kích thước <input data-f="dims" value="${esc(r.dims)}" placeholder="vd: 4,2 × 5,6 m"></label>
            <label>Hướng / View <input data-f="view" value="${esc(r.view)}" placeholder="vd: Hướng Nam · view sông"></label>
            <label>Vật liệu sàn <input data-f="floor" value="${esc(r.floor)}" placeholder="vd: Gỗ sồi Châu Âu"></label>
            <label class="lt-wide">Tiện ích (mỗi dòng 1 ý) <textarea data-f="features" rows="3">${esc(r.features)}</textarea></label>
          </div>
          <div class="lt-imgs">
            <span class="lt-imgs-label">Ảnh nội thất</span>
            <ul class="lt-img-list">${imgs}</ul>
            <button type="button" class="button lt-img-add">+ Thêm ảnh</button>
            <span class="description">Để trống sẽ dùng ảnh mẫu theo loại phòng. Kéo ảnh để sắp xếp.</span>
          </div>
        </div>
      </div>`;
  }

  function render() {
    $wrap.html(rooms.map(rowHtml).join(''));
    $wrap.sortable({ handle: '.lt-handle', axis: 'y', update: sync });
    $wrap.find('.lt-img-list').sortable({ update: sync });
  }
  function sync() {
    rooms = $wrap.children('.lt-room').map(function () {
      const $r = $(this), r = { imgs: [] };
      $r.find('[data-f]').each(function () { r[this.dataset.f] = $(this).val(); });
      $r.find('.lt-img-list li').each(function () { r.imgs.push({ id: $(this).data('id'), url: $(this).find('img').attr('src') }); });
      return r;
    }).get();
    $json.val(JSON.stringify(rooms));
  }

  $wrap.on('input change', '[data-f]', function () {
    const $r = $(this).closest('.lt-room');
    const key = $r.find('[data-f="key"]').val().toLowerCase().replace(/^room_/, '').replace(/[^a-z0-9_-]/g, '');
    if (this.dataset.f === 'key' && this.value !== key) this.value = key;
    $r.find('.lt-room-title').text($r.find('[data-f="name"]').val() || key || 'Phòng mới');
    $r.find('.lt-room-key').text(key ? 'room_' + key : '');
    sync();
  });
  $wrap.on('click', '.lt-remove', function () {
    if (window.confirm('Xoá phòng này?')) { $(this).closest('.lt-room').remove(); sync(); }
  });
  $wrap.on('click', '.lt-toggle', function () {
    const $r = $(this).closest('.lt-room').toggleClass('collapsed');
    $(this).text($r.hasClass('collapsed') ? 'Mở rộng' : 'Thu gọn');
  });
  $wrap.on('click', '.lt-img-x', function () { $(this).closest('li').remove(); sync(); });
  $wrap.on('click', '.lt-img-add', function () {
    const $list = $(this).siblings('.lt-img-list');
    const frame = wp.media({ title: 'Chọn ảnh nội thất', library: { type: 'image' }, button: { text: 'Thêm ảnh' }, multiple: 'add' });
    frame.on('select', function () {
      frame.state().get('selection').each(function (m) {
        const a = m.toJSON();
        const url = a.sizes && a.sizes.thumbnail ? a.sizes.thumbnail.url : a.url;
        $list.append(`<li data-id="${a.id}"><img src="${esc(url)}" alt=""><button type="button" class="lt-img-x" title="Bỏ ảnh">×</button></li>`);
      });
      sync();
    });
    frame.open();
  });

  $('#lt-room-add').on('click', function () {
    sync(); rooms.push({ key: '', name: '', imgs: [] }); render();
    $wrap.children().last().find('[data-f="key"]').trigger('focus');
  });
  $('#lt-room-defaults').on('click', function () {
    sync();
    if (rooms.length && !window.confirm('Thêm các phòng mặc định vào cuối danh sách?')) return;
    const have = new Set(rooms.map((r) => r.key));
    (window.LT_ADMIN && LT_ADMIN.defaults || []).forEach((d) => { if (!have.has(d.key)) rooms.push(Object.assign({ imgs: [] }, d)); });
    render(); sync();
  });

  // lưu chắc chắn trước khi submit
  $('#post').on('submit', sync);
  render();
})(jQuery);
