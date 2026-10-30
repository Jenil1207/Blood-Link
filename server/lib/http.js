const mongoose = require('mongoose');
class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, 'Validation failed', result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })));
  return result.data;
}
function objectId(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) fail(400, 'Invalid resource ID');
  return value;
}
function identifierQuery(identifier) {
  return identifier.startsWith('BL-') ? { donorId: identifier } : { _id: objectId(identifier) };
}
function page(query) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'limit must be an integer between 1 and 100');
  return { limit, ...(query.before ? { before: new mongoose.Types.ObjectId(objectId(query.before)) } : {}) };
}
function idempotencyKey(req) {
  const key = req.get('Idempotency-Key');
  if (!key || !/^[a-zA-Z0-9_-]{8,128}$/.test(key)) fail(400, 'Provide an Idempotency-Key header (8-128 letters, numbers, underscores or hyphens)');
  return key;
}
function errorHandler(err, req, res, _next) {
  if (res.headersSent) return res.end();
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ error: 'Invalid JSON body' });
  if (err.code === 11000) return res.status(409).json({ error: 'A conflicting account or record already exists' });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: 'Invalid data', details: err.message });
  if (err.code === 20 || err.codeName === 'IllegalOperation') return res.status(503).json({ error: 'This operation requires MongoDB Atlas or a replica set. See server/README.md.' });
  const status = err.status || 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') console.error(`[${req.method} ${req.path}] ${err.name}: ${err.message}`);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Internal server error' : err.message, ...(err.details ? { details: err.details } : {}) });
}
module.exports = { HttpError, fail, asyncRoute, parse, objectId, identifierQuery, page, idempotencyKey, errorHandler };
