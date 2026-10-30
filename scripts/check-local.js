const fs = require('node:fs');
const path = require('node:path');
const { getConfig } = require('../server/config');

async function main() {
  const config = getConfig();
  const base = `http://127.0.0.1:${config.port}/api`;
  const health = await fetch(base + '/health', { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error('The API or MongoDB is unavailable');
  const frontend = await fetch('http://127.0.0.1:5173', { signal: AbortSignal.timeout(5000) });
  if (!frontend.ok) throw new Error('The React app is unavailable');
  console.log('MongoDB + Express + React: healthy');
  const accounts = [
    [process.env.ADMIN_EMAIL, 'admin', process.env.ADMIN_PASSWORD],
    ['donor@bloodlink.local', 'donor', process.env.DEMO_PASSWORD],
    ['hospital@bloodlink.local', 'hospital-ngo', process.env.DEMO_PASSWORD],
    ['partner@bloodlink.local', 'hospital-ngo', process.env.DEMO_PASSWORD],
    ['ngo@bloodlink.local', 'hospital-ngo', process.env.DEMO_PASSWORD]
  ];
  for (const [email, accountType, password] of accounts) {
    if (!email || !password) throw new Error('Local admin/demo credentials are missing from server/.env');
    const login = await fetch(base + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify({ email, accountType, password }), signal: AbortSignal.timeout(5000)
    });
    const result = await login.json();
    if (!login.ok || !result.token) throw new Error(`Login failed: ${email}`);
    console.log(`Account ready: ${email} (${result.role})`);
    if (result.role === 'donor') {
      for (const endpoint of ['/camps', '/rewards', '/notifications', '/sos/nearby']) {
        const response = await fetch(base + endpoint, { headers: { Authorization: `Bearer ${result.token}` }, signal: AbortSignal.timeout(5000) });
        const rows = await response.json();
        if (!response.ok || !Array.isArray(rows)) throw new Error(`Donor endpoint failed: ${endpoint}`);
        console.log(`${endpoint}: ${rows.length} rows`);
      }
    }
  }
  for (const file of ['server/.env', 'client/.env', '.local/credentials.txt']) {
    const mode = fs.statSync(path.join(__dirname, '..', file)).mode & 0o777;
    if (mode !== 0o600) throw new Error(`${file} should be readable only by your user (mode 600)`);
  }
  console.log('Local setup verified. Passwords and access tokens were not printed.');
}

main().catch(err => { console.error(err.message); process.exitCode = 1; });
