const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const HospitalNGO = require('../models/HospitalNGO');
const { asyncRoute, parse, fail } = require('../lib/http');
const v = require('../lib/validation');
const { point } = require('../lib/geo');
const { signToken, authenticate, models } = require('../middleware/auth');
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many authentication attempts. Try again in 15 minutes.' } });
router.use(['/login', '/register-donor', '/register-hospital-ngo'], authLimit);
router.post('/register-donor', asyncRoute(async (req, res) => {
  const data = parse(v.donorRegistration, req.body);
  const { latitude, longitude, ...fields } = data;
  const donor = await User.create({ ...fields, ...(latitude !== undefined ? { location: point(longitude, latitude) } : {}) });
  res.status(201).json({ message: 'Donor account registered successfully', user: donor, token: signToken(donor, 'donor', req.app.locals.config), role: 'donor' });
}));
router.post('/register-hospital-ngo', asyncRoute(async (req, res) => {
  const { latitude, longitude, ...data } = parse(v.orgRegistration, req.body);
  const organization = await HospitalNGO.create({ ...data, location: point(longitude, latitude) });
  res.status(201).json({ message: 'Registration submitted. An admin must verify your institution before login.', organization });
}));
router.post('/login', asyncRoute(async (req, res) => {
  const data = parse(v.login, req.body);
  const type = data.accountType === 'hospital-ngo' ? 'organization' : data.accountType;
  const account = await models[type].findOne({ email: data.email }).select('+password +tokenVersion');
  if (!account) {
    const roleLabels = { donor: 'Donor Account', organization: 'NGO / Hospital', admin: 'Admin' };
    for (const [otherType, Model] of Object.entries(models)) {
      if (otherType !== type) {
        const otherAccount = await Model.findOne({ email: data.email }).select('+password');
        if (otherAccount) {
          const target = otherType === 'organization'
            ? (otherAccount.role === 'hospital' ? 'a Hospital' : 'an NGO')
            : `a ${roleLabels[otherType]}`;
          fail(401, `This account is registered as ${target} account. Please select the ${otherType === 'organization' ? 'NGO / Hospital' : roleLabels[otherType]} login option.`);
        }
      }
    }
    fail(401, 'Invalid email or password');
  }
  if (!await account.comparePassword(data.password)) fail(401, 'Invalid email or password');
  if (!account.isActive) fail(403, 'Account is disabled');
  if (type === 'organization' && (!account.isVerified || account.isScamReported)) fail(403, 'Your institution is awaiting admin verification or has been suspended');
  res.json({ message: 'Login successful', token: signToken(account, type, req.app.locals.config), userType: type, role: type === 'organization' ? account.role : type, data: account });
}));
router.get('/me', authenticate, (req, res) => res.json({ data: req.auth.account, userType: req.auth.type, role: req.auth.role }));
router.post('/logout', authenticate, asyncRoute(async (req, res) => {
  await models[req.auth.type].updateOne({ _id: req.auth.account._id }, { $inc: { tokenVersion: 1 } });
  res.json({ message: 'Signed out of all sessions' });
}));
router.put('/password', authenticate, asyncRoute(async (req, res) => {
  const data = parse(v.z.object({ currentPassword: v.z.string().min(1).max(200), newPassword: v.password }).strict(), req.body);
  const account = await models[req.auth.type].findById(req.auth.account._id).select('+password +tokenVersion');
  if (!await account.comparePassword(data.currentPassword)) fail(401, 'Current password is incorrect');
  account.password = data.newPassword;
  account.tokenVersion++;
  await account.save();
  res.json({ message: 'Password changed. Please sign in again.' });
}));
module.exports = router;
