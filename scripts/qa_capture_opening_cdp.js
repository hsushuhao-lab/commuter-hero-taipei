const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'QA_SCREENSHOTS', 'v9.7.9');
const targetTimes = {
  375: [
    ['opening_shot1', 0.9],
    ['opening_shot2_yu', 2.35],
    ['opening_monsters', 7.6],
    ['opening_final', 12.9]
  ],
  768: [
    ['opening_shot1', 0.9],
    ['opening_boss', 9.5],
    ['opening_final', 12.9]
  ],
  1280: [
    ['opening_shot1', 0.9],
    ['opening_heroes', 3.0],
    ['opening_monsters', 7.6],
    ['opening_boss', 9.5],
    ['opening_final', 12.9]
  ]
};

let nextId = 1;
const pending = new Map();

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    socket.addEventListener('open', () => resolve(socket));
    socket.addEventListener('error', reject);
  });
}

function send(socket, method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function capture(socket, width, height, name, seconds) {
  await send(socket, 'Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false
  });
  await send(socket, 'Runtime.evaluate', {
    expression: `window.activeGame.state = 'OPENING'; window.CommuterGame.introCinematic.time = ${seconds}; window.CommuterGame.introCinematic.isActive = true;`,
    awaitPromise: true
  });
  await new Promise(resolve => setTimeout(resolve, 120));
  const result = await send(socket, 'Page.captureScreenshot', { format: 'png' });
  const file = path.join(outputDir, `${width === 667 ? 375 : width}_${name}.png`);
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  console.log(`Captured ${file}`);
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const tabs = await fetch('http://127.0.0.1:9222/json/list').then(response => response.json());
  const page = tabs.find(tab => tab.type === 'page' && tab.url.includes('08workbattle-v8_0-COMMUTER-HERO'));
  if (!page) throw new Error('Opening Chrome page not found on DevTools port 9222');
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
  for (const [shortWidth, shots] of Object.entries(targetTimes)) {
    const width = Number(shortWidth) === 375 ? 667 : Number(shortWidth);
    const height = Number(shortWidth) === 375 ? 375 : Math.round(width * 9 / 16);
    for (const [name, seconds] of shots) await capture(socket, width, height, name, seconds);
  }
  socket.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
