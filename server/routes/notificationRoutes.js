const router = require('express').Router();
const Notification = require('../models/Notification');
const { authenticate, authenticateToken } = require('../middleware/auth');
const { asyncRoute, page, objectId, fail } = require('../lib/http');
const { events, channel } = require('../services/notifications');
router.use(authenticate);
const connections = new Map();
const activeStreams = new Set();
function closeStreams() { for (const close of [...activeStreams]) close(); }
router.get('/stream', asyncRoute(async (req, res) => {
  const key = channel(req.auth.type, req.auth.account._id);
  if ((connections.get(key) || 0) >= 5) fail(429, 'Maximum of five live notification connections per account');
  const lastId = req.get('Last-Event-ID');
  if (lastId) objectId(lastId);
  connections.set(key, (connections.get(key) || 0) + 1);
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let closed = false, ready = false, checking = false;
  const pending = [], sent = new Set();
  const send = notification => {
    if (closed || sent.has(String(notification._id))) return;
    sent.add(String(notification._id));
    if (sent.size > 1000) sent.delete(sent.values().next().value);
    if (!res.write(`id: ${notification._id}\nevent: notification\ndata: ${JSON.stringify(notification)}\n\n`)) close();
  };
  const listener = notification => { if (ready) send(notification); else pending.push(notification); };
  let heartbeat, expiry;
  const close = () => {
    if (closed) return;
    closed = true; clearInterval(heartbeat); clearTimeout(expiry);
    events.off(key, listener); activeStreams.delete(close);
    const remaining = (connections.get(key) || 1) - 1;
    if (remaining) connections.set(key, remaining); else connections.delete(key);
    res.end();
  };
  activeStreams.add(close);
  events.on(key, listener);
  res.on('close', close);
  expiry = setTimeout(close, Math.max(1, req.auth.expiresAt - Date.now()));
  heartbeat = setInterval(async () => {
    if (closed || checking) return;
    checking = true;
    try {
      await authenticateToken(req.get('Authorization').slice(7), req.app.locals.config);
      if (!closed) res.write(': heartbeat\n\n');
    } catch { close(); }
    finally { checking = false; }
  }, 15000);
  try {
    const query = { recipientId: req.auth.account._id, recipientType: req.auth.type, ...(lastId ? { _id: { $gt: lastId } } : {}) };
    const backlog = await Notification.find(query).sort({ _id: -1 }).limit(101);
    res.write('event: connected\ndata: {}\n\n');
    if (backlog.length > 100) res.write('event: sync-required\ndata: {"message":"Fetch notification history for older messages"}\n\n');
    for (const notification of backlog.slice(0, 100).reverse()) send(notification);
    ready = true;
    for (const notification of pending) send(notification);
  } catch { close(); }
}));
router.get('/', asyncRoute(async (req, res) => {
  const { limit, before } = page(req.query);
  const query = { recipientId: req.auth.account._id, recipientType: req.auth.type, ...(before ? { _id: { $lt: before } } : {}) };
  if (req.query.unread === 'true') query.readAt = null;
  res.json(await Notification.find(query).sort({ _id: -1 }).limit(limit));
}));
router.put('/:id/read', asyncRoute(async (req, res) => {
  const notification = await Notification.findOneAndUpdate({ _id: objectId(req.params.id), recipientId: req.auth.account._id, recipientType: req.auth.type }, { readAt: new Date() }, { new: true });
  if (!notification) fail(404, 'Notification not found');
  res.json(notification);
}));
module.exports = { router, closeStreams };
