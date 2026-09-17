import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const PORT = 8799;
const DATA_DIR = mkdtempSync(path.join(os.tmpdir(), 'anywhere-e2e-'));
const serverUrl = `ws://127.0.0.1:${PORT}`;

let serverProc = null;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProc = spawn(process.execPath, ['server/dist/index.js'], {
      env: { ...process.env, ANYWHERE_PORT: String(PORT), DATA_DIR },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    serverProc.on('error', reject);
    serverProc.stdout?.on('data', (d) => {
      if (d.toString().includes('listening')) resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!serverProc) return resolve();
    serverProc.on('exit', () => resolve());
    serverProc.kill('SIGTERM');
  });
}

function openClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(serverUrl);
    const messages = [];
    ws.on('message', (data) => messages.push(JSON.parse(data.toString())));
    ws.on('open', () => resolve({ ws, messages }));
    ws.on('error', reject);
  });
}

async function expect(received, predicate, label, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = received.find(predicate);
    if (found) return found;
    await delay(50);
  }
  throw new Error(`FAIL: timed out waiting for ${label}`);
}

function send(client, msg) {
  client.ws.send(JSON.stringify(msg));
}

function assert(cond, label) {
  if (!cond) throw new Error(`FAIL: ${label}`);
  console.log(`  ok  ${label}`);
}

async function run() {
  await startServer();
  console.log('-- live broadcast & pull --');

  const a = await openClient();
  const b = await openClient();
  await expect(a.messages, (m) => m.kind === 'welcome', 'welcome to A');
  await expect(b.messages, (m) => m.kind === 'welcome', 'welcome to B');

  send(a, { kind: 'push', payload: { text: 'hello from A', ts: 1, src: 'a' } });
  const toB = await expect(b.messages, (m) => m.kind === 'clipboard' && m.payload?.src === 'a', 'A push reaches B');
  assert(toB.payload?.text === 'hello from A', 'payload content is intact');
  assert(typeof toB.payload?.ts === 'number', 'server sets a receive timestamp');

  send(b, { kind: 'get' });
  const pulled = await expect(b.messages, (m) => m.kind === 'clipboard' && m.payload?.src === 'a', 'pull returns latest value', 1500);
  assert(pulled.payload?.text === 'hello from A', 'latest value is A\'s push');

  console.log('-- persistence across restart --');
  a.ws.close();
  b.ws.close();
  await stopServer();
  await startServer();

  const c = await openClient();
  await expect(c.messages, (m) => m.kind === 'welcome', 'welcome after restart');
  send(c, { kind: 'get' });
  const restored = await expect(c.messages, (m) => m.kind === 'clipboard' && m.payload !== null, 'clipboard restored after restart');
  assert(restored.payload?.text === 'hello from A', 'value persisted to disk');

  send(c, { kind: 'ping' });
  await expect(c.messages, (m) => m.kind === 'pong', 'ping/pong works');

  c.ws.close();
  await stopServer();
  console.log('\nALL E2E CHECKS PASSED');
}

run().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
}).finally(async () => {
  serverProc?.kill();
  await delay(100);
  rmSync(DATA_DIR, { recursive: true, force: true });
});