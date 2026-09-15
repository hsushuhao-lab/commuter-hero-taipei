const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'QA_V9_8_4');
let nextId = 1;
const pending = new Map();

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => resolve(socket));
    socket.addEventListener('error', reject);
  });
}

function send(socket, method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(socket, expression) {
  const result = await send(socket, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function capture(socket, name) {
  await new Promise(resolve => setTimeout(resolve, 180));
  const result = await send(socket, 'Page.captureScreenshot', { format: 'png' });
  const output = path.join(outputDir, name);
  fs.writeFileSync(output, Buffer.from(result.data, 'base64'));
  console.log(`Captured ${output}`);
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const tabs = await fetch('http://127.0.0.1:9222/json/list').then(response => response.json());
  const page = tabs.find(tab => tab.type === 'page' && tab.url.includes('127.0.0.1:8765'));
  if (!page) throw new Error('v9.8.4 Chrome page not found on DevTools port 9222');
  const socket = await connect(page.webSocketDebuggerUrl);
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  });
  await send(socket, 'Page.enable');
  await send(socket, 'Runtime.enable');
  await send(socket, 'Page.navigate', { url: 'http://127.0.0.1:8765/?qa=1&v=9.8.3-final' });
  await new Promise(resolve => setTimeout(resolve, 1200));
  await send(socket, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await evaluate(socket, `(() => { const g = window.activeGame; if (!g) throw new Error('activeGame missing'); g.state = 'PLAYING'; g.levelIntroTimer = 0; g.player.x = 15100; g.boss.entranceDone = true; g.boss.entranceTriggered = false; g.boss.isTransforming = false; g.boss.phase = 1; g.boss.isDead = false; })()`);
  await capture(socket, 'hud_topright_no_tab.png');
  await evaluate(socket, `(() => { const g = window.activeGame; g.boss.phase = 2; g.boss.isTransforming = false; })()`);
  await capture(socket, 'boss_p2_dense_v984.png');
  await evaluate(socket, `(() => { const g = window.activeGame; g.state = 'VICTORY_RUN'; g.victorySubState = 'GROUP_SPRINT'; g.companions = []; g._prepareVictoryCompanions(); })()`);
  await capture(socket, 'victory_exactly_three.png');
  await evaluate(socket, `(() => { const g = window.activeGame; g._finishVictory(); return window.debugRuntime(); })()`);
  await capture(socket, 'victory_final_clean_result.png');
  const runtime = await evaluate(socket, 'window.debugRuntime()');
  fs.writeFileSync(path.join(outputDir, 'BROWSER_RUNTIME_QA.json'), JSON.stringify(runtime, null, 2));
  socket.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
