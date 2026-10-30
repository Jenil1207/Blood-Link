const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { getConfig } = require('./config');
const { errorHandler, HttpError } = require('./lib/http');
function createApp(config = getConfig()) {
  const app = express();
  app.locals.config = config;
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.origins.includes(origin)) return callback(null, true);
      callback(new HttpError(403, 'Origin is not allowed'));
    },
    exposedHeaders: ['Retry-After'], allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Last-Event-ID']
  }));
  app.use(express.json({ limit: '32kb', strict: true }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/docs', (_req, res) => res.json(require('./openapi.json')));
  app.get('/api/health', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: ready ? 'connected' : 'disconnected', timestamp: new Date() });
  });
  app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please try again shortly.' } }));
  app.use('/api', (_req, res, next) => mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: 'Database unavailable' }));
  for (const [path, file] of Object.entries({ auth: 'auth', donors: 'donor', hospitals: 'hospital', camps: 'camp', sos: 'sos', records: 'record', rewards: 'reward', admin: 'admin' })) app.use(`/api/${path}`, require(`./routes/${file}Routes`));
  const notifications = require('./routes/notificationRoutes');
  app.use('/api/notifications', notifications.router);
  app.locals.closeStreams = notifications.closeStreams;
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
