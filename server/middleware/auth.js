const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HospitalNGO = require('../models/HospitalNGO');
const Admin = require('../models/Admin');
const { asyncRoute, fail } = require('../lib/http');
const models = { donor: User, organization: HospitalNGO, admin: Admin };
function signToken(account, type, config) {
  return jwt.sign({ type, version: account.tokenVersion || 0 }, config.jwtSecret, {
    subject: String(account._id), expiresIn: `${config.tokenHours}h`, issuer: 'bloodlink', audience: 'bloodlink-web', algorithm: 'HS256'
  });
}
async function authenticateToken(token, config) {
  let claims;
  try { claims = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: 'bloodlink', audience: 'bloodlink-web' }); }
  catch { fail(401, 'Session expired or invalid. Please sign in again.'); }
  if (!models[claims.type] || !/^[a-f\d]{24}$/i.test(claims.sub)) fail(401, 'Invalid session');
  const account = await models[claims.type].findById(claims.sub).select('+tokenVersion');
  if (!account || !account.isActive || account.tokenVersion !== claims.version) fail(401, 'Session is no longer active');
  if (claims.type === 'organization' && (!account.isVerified || account.isScamReported)) fail(403, 'Institution access requires active admin verification');
  return { account, type: claims.type, role: claims.type === 'organization' ? account.role : claims.type, expiresAt: claims.exp * 1000 };
}
const authenticate = asyncRoute(async (req, _res, next) => {
  const header = req.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) fail(401, 'Authentication required');
  req.auth = await authenticateToken(header.slice(7), req.app.locals.config);
  next();
});
const roles = (...allowed) => (req, _res, next) => {
  if (!allowed.includes(req.auth.role)) return next(Object.assign(new Error('You do not have permission for this action'), { status: 403 }));
  next();
};
function owner(req, id) {
  if (req.auth.role !== 'admin' && String(req.auth.account._id) !== String(id)) fail(403, 'You can only manage your own account or resources');
}
module.exports = { signToken, authenticateToken, authenticate, roles, owner, models };
