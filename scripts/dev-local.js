const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { MongoClient } = require('../server/node_modules/mongodb');
const { getConfig } = require('../server/config');

const root = path.join(__dirname, '..');
const local = path.join(root, '.local');
const children = [];
let stopping = false;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function portIsOpen(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = net.connect({ port, host });
    const finish = open => { socket.destroy(); resolve(open); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });
}

function launch(name, command, args, cwd, quiet = false) {
  const child = spawn(command, args, { cwd, stdio: quiet ? ['ignore', 'ignore', 'pipe'] : 'inherit' });
  children.push({ name, child });
  if (quiet) child.stderr.on('data', data => process.stderr.write(`[${name}] ${data}`));
  child.on('error', err => {
    if (!stopping) { console.error(`${name}: ${err.message}`); shutdown(1); }
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${name} exited (${signal || code}). Stopping the local stack.`);
      shutdown(code || (signal ? 1 : 0));
    }
  });
  return child;
}

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\nStopping BloodLink. Database files are preserved in .local/mongodb.');
  const stop = async entries => {
    for (const { child } of entries) if (child.exitCode === null && !child.signalCode) child.kill('SIGTERM');
    const deadline = Date.now() + 8000;
    while (entries.some(({ child }) => child.exitCode === null && !child.signalCode) && Date.now() < deadline) await pause(100);
    for (const { child } of entries) if (child.exitCode === null && !child.signalCode) child.kill('SIGKILL');
  };
  await stop(children.filter(entry => entry.name !== 'MongoDB'));
  await stop(children.filter(entry => entry.name === 'MongoDB'));
  process.exit(code);
}

async function prepareMongo(uri) {
  const parsed = new URL(uri);
  if (parsed.protocol !== 'mongodb:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    console.log('Using the MongoDB server configured in server/.env.');
    return;
  }
  const port = Number(parsed.port || 27017);
  const replicaSet = parsed.searchParams.get('replicaSet') || 'rs0';
  const dbPath = path.join(local, 'mongodb');
  const logs = path.join(local, 'logs');
  fs.mkdirSync(dbPath, { recursive: true, mode: 0o700 });
  fs.mkdirSync(logs, { recursive: true, mode: 0o700 });
  const mongoConfig = path.join(local, 'mongod.conf');
  if (!await portIsOpen(port)) {
    const candidates = [process.env.MONGOD_BINARY, '/opt/homebrew/opt/mongodb-community@8.0/bin/mongod', '/usr/local/opt/mongodb-community@8.0/bin/mongod', '/opt/homebrew/bin/mongod', '/usr/local/bin/mongod'].filter(Boolean);
    const binary = candidates.find(file => fs.existsSync(file));
    if (!binary) throw new Error('MongoDB is not installed. Install mongodb-community@8.0 with Homebrew or set MONGOD_BINARY.');
    fs.writeFileSync(mongoConfig, JSON.stringify({
      storage: { dbPath }, systemLog: { destination: 'file', path: path.join(logs, 'mongodb.log'), logAppend: true },
      net: { bindIp: '127.0.0.1', port }, replication: { replSetName: replicaSet }
    }, null, 2) + '\n', { mode: 0o600 });
    launch('MongoDB', binary, ['--config', mongoConfig], root, true);
    const deadline = Date.now() + 30000;
    while (!await portIsOpen(port)) {
      if (stopping) return;
      if (Date.now() > deadline) throw new Error('MongoDB did not start. Check .local/logs/mongodb.log.');
      await pause(250);
    }
  }
  if (stopping) return;
  const client = new MongoClient(`mongodb://127.0.0.1:${port}/admin?directConnection=true`, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const options = await client.db().command({ getCmdLineOpts: 1 });
    if (path.resolve(options.parsed?.storage?.dbPath || '') !== path.resolve(dbPath)) {
      throw new Error(`Port ${port} belongs to another MongoDB installation. Its database and configuration were left untouched.`);
    }
    try { await client.db().command({ replSetGetStatus: 1 }); }
    catch (err) {
      if (err.code !== 94) throw err;
      await client.db().command({ replSetInitiate: { _id: replicaSet, members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
    }
    const deadline = Date.now() + 30000;
    while (!(await client.db().command({ hello: 1 })).isWritablePrimary) {
      if (Date.now() > deadline) throw new Error('MongoDB replica set did not elect a primary in time.');
      await pause(250);
    }
    console.log(`MongoDB ready: ${replicaSet}, local port ${port}, persistent data in .local/mongodb`);
  } finally { await client.close(); }
}

async function waitForAPI(port) {
  const deadline = Date.now() + 30000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch { /* Wait for Express to finish connecting and indexing. */ }
    await pause(250);
  }
  if (!stopping) throw new Error('Backend did not become ready within 30 seconds.');
}

async function main() {
  if (!fs.existsSync(path.join(root, 'server/.env'))) throw new Error('Missing server/.env. Follow server/README.md first.');
  const config = getConfig();
  for (const port of [config.port, 5173]) {
    if (await portIsOpen(port)) throw new Error(`Port ${port} is already in use. If BloodLink is running, open http://localhost:5173.`);
  }
  await prepareMongo(config.mongoUri);
  if (stopping) return;
  launch('API', process.execPath, ['server.js'], path.join(root, 'server'));
  await waitForAPI(config.port);
  if (stopping) return;
  launch('React', process.execPath, [path.join(root, 'client/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'], path.join(root, 'client'));
  console.log(`\nBloodLink: http://localhost:5173\nAPI: http://127.0.0.1:${config.port}/api\nLocal login details: .local/credentials.txt\nPress Ctrl+C to stop all three services.\n`);
}

process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
main().catch(err => { console.error(`Setup/startup failed: ${err.message}`); shutdown(1); });
