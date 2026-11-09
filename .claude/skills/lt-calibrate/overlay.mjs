#!/usr/bin/env node
/**
 * Vẽ lưới toạ độ và/hoặc các tầng (tower_geo) chồng lên ảnh tòa nhà, chụp ra PNG bằng Chrome headless.
 *
 *   node overlay.mjs <ảnh> <out.png> [--geo geo.json] [--grid 50] [--crop x,y,w,h] [--scale 2]
 *
 * --geo    file JSON dạng tower (base, floorH, count, towers, top, topPolys, anchorX). Bỏ qua = chỉ vẽ lưới.
 * --grid   khoảng cách lưới (px ảnh gốc), 0 = tắt. Mặc định 50 (100 khi không crop).
 * --crop   chỉ chụp vùng x,y,w,h (px ảnh gốc) để đo chi tiết.
 * --scale  phóng vùng crop (mặc định: tự chọn để ảnh ra ~1600px rộng).
 * Hình học tầng tính y hệt js/data.js để kết quả khớp với web.
 */
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';

const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [imgPath, outPath] = pos;
if (!imgPath || !outPath) { console.error('Dùng: node overlay.mjs <ảnh> <out.png> [--geo geo.json] [--grid 50] [--crop x,y,w,h] [--scale 2]'); process.exit(1); }

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) { console.error('Không thấy Google Chrome tại ' + CHROME); process.exit(1); }

// Kích thước ảnh (macOS sips)
const sips = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imgPath]).toString();
const W = +sips.match(/pixelWidth: (\d+)/)[1], H = +sips.match(/pixelHeight: (\d+)/)[1];

const crop = opt('crop') ? opt('crop').split(',').map(Number) : [0, 0, W, H];
const [cx, cy, cw, ch] = crop;
const scale = +opt('scale', 0) || Math.min(4, Math.max(0.5, 1600 / cw));
const grid = +opt('grid', opt('crop') ? 50 : 100);
const tower = opt('geo') ? JSON.parse(readFileSync(opt('geo'), 'utf8')) : null;

// --- Hình học tầng: giống js/data.js ---
const shapes = [];
if (tower) {
  for (let n = 1; n <= tower.count; n++) {
    const y2 = tower.base - (n - 1) * tower.floorH, y1 = tower.base - n * tower.floorH;
    (tower.towers || []).forEach((t) => {
      const top = Math.max(y1, t.top);
      if (y2 - top > 4) shapes.push({ n, rect: [t.x1, top, t.x2 - t.x1, y2 - top] });
    });
  }
  if (tower.top && tower.topPolys) tower.topPolys.forEach((p) => shapes.push({ n: 'TOP', poly: p }));
}

const mime = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' }[extname(imgPath).toLowerCase()] || 'jpeg';
const dataUrl = `data:image/${mime};base64,` + readFileSync(imgPath).toString('base64');
const sw = 1 / scale; // nét 1px màn hình
let svg = '';
if (grid > 0) {
  for (let x = Math.ceil(cx / grid) * grid; x <= cx + cw; x += grid) {
    const major = x % (grid * 2) === 0;
    svg += `<line x1="${x}" y1="${cy}" x2="${x}" y2="${cy + ch}" stroke="${major ? '#ff0' : '#0ff'}" stroke-opacity=".55" stroke-width="${sw}"/>`;
    svg += `<text x="${x + 2 * sw}" y="${cy + 12 * sw}" font-size="${11 * sw}" fill="#ff0" stroke="#000" stroke-width="${2.5 * sw}" paint-order="stroke">${x}</text>`;
  }
  for (let y = Math.ceil(cy / grid) * grid; y <= cy + ch; y += grid) {
    const major = y % (grid * 2) === 0;
    svg += `<line x1="${cx}" y1="${y}" x2="${cx + cw}" y2="${y}" stroke="${major ? '#ff0' : '#0ff'}" stroke-opacity=".55" stroke-width="${sw}"/>`;
    svg += `<text x="${cx + 2 * sw}" y="${y - 2 * sw}" font-size="${11 * sw}" fill="#ff0" stroke="#000" stroke-width="${2.5 * sw}" paint-order="stroke">${y}</text>`;
  }
}
shapes.forEach((s, i) => {
  const c = s.n === 'TOP' ? '#ff3df2' : (s.n % 2 ? '#ff4d4d' : '#3dff7a');
  if (s.rect) {
    const [x, y, w, h] = s.rect;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width="${sw * 1.2}"/>`;
    if (i === 0 || shapes[i - 1].n !== s.n) svg += `<text x="${x - 4 * sw}" y="${y + h / 2 + 4 * sw}" text-anchor="end" font-size="${Math.min(12 * sw, h * 0.8)}" fill="#fff" stroke="#000" stroke-width="${2.5 * sw}" paint-order="stroke">${s.n}</text>`;
  } else {
    svg += `<polygon points="${s.poly}" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="${sw * 1.2}"/>`;
  }
});
if (tower && tower.anchorX) svg += `<line x1="${tower.anchorX}" y1="${cy}" x2="${tower.anchorX}" y2="${cy + ch}" stroke="#fff" stroke-dasharray="${6 * sw}" stroke-width="${sw}"/>`;

const outW = Math.round(cw * scale), outH = Math.round(ch * scale);
const html = `<!doctype html><html><body style="margin:0;background:#000;overflow:hidden">
<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="${cx} ${cy} ${cw} ${ch}" style="display:block">
<image href="${dataUrl}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>${svg}</svg></body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'lt-overlay-'));
const htmlPath = join(dir, 'o.html');
writeFileSync(htmlPath, html);
execFileSync(CHROME, ['--headless=new', '--hide-scrollbars', '--user-data-dir=' + join(dir, 'prof'), `--window-size=${outW},${outH}`,
  '--screenshot=' + resolve(outPath), 'file://' + htmlPath], { stdio: 'ignore' });
console.log(JSON.stringify({ image: { w: W, h: H }, out: resolve(outPath), crop, scale: +scale.toFixed(3), floors: tower ? tower.count : 0 }));
