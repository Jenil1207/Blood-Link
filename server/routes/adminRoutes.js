const mongoose = require('mongoose');
const router = require('express').Router();
const HospitalNGO = require('../models/HospitalNGO');
const Camp = require('../models/Camp');
const SOSAlert = require('../models/SOSAlert');
const AuditLog = require('../models/AuditLog');
const { authenticate, roles } = require('../middleware/auth');
const { asyncRoute, parse, objectId, fail, page } = require('../lib/http');
const v = require('../lib/validation');
router.use(authenticate, roles('admin'));
router.get('/organizations', asyncRoute(async (req, res) => {
  const { limit, before } = page(req.query);
  const query = before ? { _id: { $lt: before } } : {};
  if (req.query.pending === 'true') Object.assign(query, { isVerified: false, isActive: true });
  res.json(await HospitalNGO.find(query).sort({ _id: -1 }).limit(limit));
}));
async function moderate(req, action, update, closeResources = false) {
  return mongoose.connection.transaction(async session => {
    const org = await HospitalNGO.findById(objectId(req.params.id)).session(session);
    if (!org) fail(404, 'Organization not found');
    if (action === 'verify' && !org.isActive) fail(409, 'A disabled organization cannot be verified');
    Object.assign(org, update);
    // Every moderation action revokes previously issued organization tokens.
    org.tokenVersion = (await HospitalNGO.findById(org._id).select('+tokenVersion').session(session)).tokenVersion + 1;
    await org.save({ session });
    if (closeResources) {
      await Camp.updateMany({ organizerId: org._id, status: 'Scheduled' }, { status: 'Cancelled' }, { session });
      await SOSAlert.updateMany({ hospitalId: org._id, status: { $ne: 'Resolved' } }, { status: 'Resolved', resolvedBy: 'BloodLink moderation', resolvedDate: new Date() }, { session });
    }
    await AuditLog.create([{ actorId: req.auth.account._id, action, targetId: org._id }], { session });
    return org;
  });
}
router.put('/verify/:id', asyncRoute(async (req, res) => {
  const org = await moderate(req, 'verify', { isVerified: true, isScamReported: false, scamReportReason: '' });
  res.json({ message: 'Organization verified', org });
}));
router.put('/report-scam/:id', asyncRoute(async (req, res) => {
  const { reason } = parse(v.z.object({ reason: v.requiredText(1000) }).strict(), req.body);
  const org = await moderate(req, 'report-scam', { isScamReported: true, scamReportReason: reason, isVerified: false }, true);
  res.json({ message: 'Organization suspended for review', org });
}));
router.delete('/org/:id', asyncRoute(async (req, res) => {
  const org = await moderate(req, 'disable', { isActive: false, isVerified: false }, true);
  res.json({ message: `${org.name} disabled. Donation and audit history retained.` });
}));
router.get('/audit', asyncRoute(async (req, res) => {
  const { limit, before } = page(req.query);
  res.json(await AuditLog.find(before ? { _id: { $lt: before } } : {}).sort({ _id: -1 }).limit(limit));
}));
module.exports = router;
