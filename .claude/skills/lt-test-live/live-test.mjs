#!/usr/bin/env node
/**
 * Kiểm tra plugin Lumière Tower trên một trang WordPress thật bằng Chrome headless (DevTools protocol).
 *
 *   node live-test.mjs <url> <thư-mục-ra> [--patch] [--floor 7] [--width 1440] [--height 900]
 *
 * --patch   thay file của plugin trên site bằng bản trong repo (js/*.js, css/style.css) NGAY TRONG trình duyệt,
 *           để thử bản sửa trước khi cài lên site. Không đụng gì tới server.
 * --floor   tầng để rê chuột + bấm vào (mặc định 7).
 * Ra: tower.png (lúc mới tải), hover.png, apt.png (sau khi bấm vào tầng), report.json (lỗi JS + trạng thái).
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const [url, outDir] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--floor', '--width', '--height'].includes(args[i - 1])));
if (!url || !outDir) { console.error('Dùng: node live-test.mjs <url> <thư-mục-ra> [--patch] [--floor 7]'); process.exit(1); }
const PATCH = args.includes('--patch');
const FLOOR = opt('floor', '7');
const VW = +opt('width', 1440), VH = +opt('height', 900);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(CHROME)) { console.error('Không thấy Google Chrome'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const PATCHES = {
  'js/app.js': 'application/javascript', 'js/data.js': 'application/javascript', 'js/scene3d.js': 'application/javascript',
  'js/demo-data.js': 'application/javascript', 'css/style.css': 'text/css',
};
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--user-data-dir=' + mkdtempSync(join(tmpdir(), 'lt-live-')),
  `--window-size=${VW},${VH}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 20 && !tabs; i++) { await sleep(500); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {} }
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
let id = 0; const pend = {};
const report = { url, patched: [], errors: [], console: [], failedRequests: [] };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pend[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); return r.result ? r.result.value : r; };
const shot = async (name) => writeFileSync(join(outDir, name), Buffer.from((await send('Page.captureScreenshot')).data, 'base64'));

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; }
  if (m.method === 'Fetch.requestPaused') {
    const u = m.params.request.url;
    const key = Object.keys(PATCHES).find((k) => u.includes('/lumiere-tower/public/' + k));
    if (key) {
      report.patched.push(key);
      ws.send(JSON.stringify({ id: ++id, method: 'Fetch.fulfillRequest', params: { requestId: m.params.requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: PATCHES[key] }], body: readFileSync(join(REPO, key)).toString('base64') } }));
    } else ws.send(JSON.stringify({ id: ++id, method: 'Fetch.continueRequest', params: { requestId: m.params.requestId } }));
  }
  if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; report.errors.push((d.exception && d.exception.description) || d.text); }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) report.console.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) report.failedRequests.push(m.params.response.status + ' ' + m.params.response.url);
};

ws.onopen = async () => {
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  if (PATCH) await send('Fetch.enable', { patterns: [{ urlPattern: '*lumiere-tower/public/*' }] });
  await send('Page.navigate', { url });
  await sleep(10000);
  report.state = await ev(`(() => { const a = document.getElementById('lt-app'); return {
    ltApp: !!a, ready: !!(a && a.dataset.ltReady), floors: document.querySelectorAll('#floors > *').length,
    rail: document.querySelectorAll('#floorRail li').length, three: typeof THREE, ltData: typeof LT_DATA,
    pluginScripts: [...document.scripts].filter(s => /lumiere-tower/.test(s.src)).map(s => s.src.split('/public/')[1]),
    width: a && Math.round(a.getBoundingClientRect().width), viewport: innerWidth,
    reactTheme: !!document.querySelector('[data-navite-root],[data-reactroot],#__next,#app[data-v-app]') }; })()`);
  if (report.state.ltApp) {
    await ev(`document.getElementById('lt-app').scrollIntoView()`); await sleep(600);
    await shot('tower.png');
    const r = await ev(`(() => { const p = document.querySelector('#floors [data-id="${FLOOR}"]'); if (!p) return null; const b = p.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`);
    if (r) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await sleep(900);
      report.hover = await ev(`document.getElementById('callout').className`);
      await shot('hover.png');
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
      await sleep(4500);
      report.apartment = await ev(`({ view: document.getElementById('aptView').className, canvas: !!document.querySelector('#three canvas'), name: (document.getElementById('pName')||{}).textContent })`);
      await shot('apt.png');
    } else report.hover = 'không tìm thấy tầng ' + FLOOR;
  } else await shot('tower.png');
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  ws.close(); chrome.kill(); process.exit(0);
};
