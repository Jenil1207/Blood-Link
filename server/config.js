const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
function getConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || /replace-with|change-me/i.test(jwtSecret)) throw new Error('Set JWT_SECRET to a random string of at least 32 characters in server/.env');
  const positive = (name, fallback, max) => {
    const value = Number(process.env[name] || fallback);
    if (!Number.isInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${name}`);
    return value;
  };
  const origins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(v => v.trim()).filter(Boolean);
  if (origins.includes('*')) throw new Error('CLIENT_ORIGINS must list explicit frontend origins');
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 5');
  return {
    port: positive('PORT', 5000, 65535),
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bloodlink?replicaSet=rs0',
    jwtSecret, tokenHours: positive('TOKEN_HOURS', 8, 24),
    donationIntervalDays: positive('DONATION_INTERVAL_DAYS', 90, 365),
    origins, trustProxyHops, production: process.env.NODE_ENV === 'production'
  };
}
module.exports = { getConfig };
