const mongoose = require('mongoose');
const router = require('express').Router();
const SOSAlert = require('../models/SOSAlert');
const HospitalNGO = require('../models/HospitalNGO');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, roles, owner } = require('../middleware/auth');
const { asyncRoute, parse, fail, objectId, page } = require('../lib/http');
const v = require('../lib/validation');
const { searchLocation, radius, near, distanceKm } = require('../lib/geo');
const { canVolunteer } = require('../lib/eligibility');
const { notify, publish } = require('../services/notifications');
router.use(authenticate);
function alertView(alert, auth, origin) {
  const data = alert.toObject();
  const responseCount = data.responders.length;
  const hasResponded = auth.type === 'donor' && data.responders.some(r => r.donorId === auth.account.donorId);
  if (String(alert.hospitalId) !== String(auth.account._id)) delete data.responders;
  return { ...data, responseCount, hasResponded, distanceKm: distanceKm(origin, alert.location) };
}
router.get('/nearby', asyncRoute(async (req, res) => {
  const location = searchLocation(req.query, req.auth.account.location);
  if (!location) fail(400, 'Set your profile location or supply lat and lng');
  const query = { status: { $in: ['Active', 'In Transit'] }, expiresAt: { $gt: new Date() }, location: near(location, radius(req.query)) };
  if (req.auth.type === 'donor') query.targetBloodType = req.auth.account.bloodType;
  if (req.query.bloodType) query.targetBloodType = parse(v.bloodType, req.query.bloodType);
  const alerts = await SOSAlert.find(query).limit(page(req.query).limit);
  res.json(alerts.map(a => alertView(a, req.auth, location)));
}));
router.get('/mine', roles('hospital'), asyncRoute(async (req, res) => {
  const { limit, before } = page(req.query);
  const query = { hospitalId: req.auth.account._id, ...(before ? { _id: { $lt: before } } : {}) };
  const alerts = await SOSAlert.find(query).sort({ _id: -1 }).limit(limit);
  res.json(alerts.map(a => alertView(a, req.auth, req.auth.account.location)));
}));
router.get('/stock-matches/:hospitalId', roles('hospital'), asyncRoute(async (req, res) => {
  objectId(req.params.hospitalId); owner(req, req.params.hospitalId);
  const origin = req.auth.account.location;
  const query = { _id: { $ne: req.auth.account._id }, role: 'hospital', isVerified: true, isActive: true, isScamReported: false, location: near(origin, radius(req.query)) };
  if (req.query.bloodType) {
    const bloodType = parse(v.bloodType, req.query.bloodType);
    const units = req.query.units === undefined ? 1 : Number(req.query.units);
    if (!Number.isInteger(units) || units < 1 || units > 1000) fail(400, 'units must be an integer from 1 to 1000');
    query[`inventory.${bloodType}`] = { $gte: units };
  }
  const hospitals = await HospitalNGO.find(query).limit(page(req.query).limit);
  res.json(hospitals.map(h => ({ hospitalId: h._id, name: h.name, address: h.address, inventory: h.inventory,
    distanceKm: distanceKm(origin, h.location), surplus: Object.entries(h.inventory.toObject()).filter(([, count]) => count >= 10).map(([type, count]) => ({ type, count })) })));
}));
router.post('/', roles('hospital'), asyncRoute(async (req, res) => {
  const data = parse(v.sos, req.body);
  const facility = req.auth.account;
  const result = await mongoose.connection.transaction(async session => {
    const [alert] = await SOSAlert.create([{
      ...data, hospitalId: facility._id, hospitalName: facility.name, location: facility.location,
      expiresAt: new Date(Date.now() + data.expiresInHours * 3600000)
    }], { session });
    // $nearSphere is not supported inside MongoDB transactions; $geoWithin is.
    const donors = await User.find({ isActive: true, availableForSOS: true, bloodType: data.targetBloodType,
      location: { $geoWithin: { $centerSphere: [facility.location.coordinates, data.radiusKm / 6378.1] } } }).session(session);
    const notifications = [];
    for (const donor of donors) if (canVolunteer(donor, req.app.locals.config)) {
      notifications.push(await notify(session, 'donor', donor._id, 'sos', `${facility.name} needs ${data.requiredQuantity} units of ${data.targetBloodType} blood.`, alert._id));
    }
    const partners = await HospitalNGO.find({
      _id: { $ne: facility._id }, role: 'hospital', isActive: true, isVerified: true, isScamReported: false,
      [`inventory.${data.targetBloodType}`]: { $gte: data.requiredQuantity },
      location: { $geoWithin: { $centerSphere: [facility.location.coordinates, data.radiusKm / 6378.1] } }
    }).session(session);
    for (const partner of partners) notifications.push(await notify(session, 'organization', partner._id, 'sos', `${facility.name} requests ${data.requiredQuantity} units of ${data.targetBloodType}. Your hospital has matching stock.`, alert._id));
    return { alert, notifications };
  });
  publish(result.notifications);
  res.status(201).json({ message: 'SOS broadcast created', alert: alertView(result.alert, req.auth, facility.location), notifiedDonors: result.notifications.filter(n => n.recipientType === 'donor').length, notifiedHospitals: result.notifications.filter(n => n.recipientType === 'organization').length });
}));
router.put('/:id/accept', roles('donor'), asyncRoute(async (req, res) => {
  const donor = req.auth.account;
  if (!donor.location || !canVolunteer(donor, req.app.locals.config)) fail(409, 'An available donor with a location and valid scheduling window is required');
  const result = await mongoose.connection.transaction(async session => {
    const alert = await SOSAlert.findById(objectId(req.params.id)).session(session);
    if (!alert) fail(404, 'SOS alert not found');
    if (alert.status === 'Resolved' || alert.expiresAt <= new Date()) fail(409, 'SOS alert is closed or expired');
    if (alert.targetBloodType !== donor.bloodType) fail(409, 'This alert targets a different blood type');
    if (distanceKm(alert.location, donor.location) > alert.radiusKm) fail(409, 'You are outside the SOS radius');
    if (alert.responders.some(r => r.donorId === donor.donorId)) fail(409, 'You already responded to this SOS');
    alert.responders.push({ donorId: donor.donorId, name: donor.name }); alert.status = 'In Transit';
    await alert.save({ session });
    const n = await notify(session, 'organization', alert.hospitalId, 'sos-response', `${donor.name} (${donor.donorId}) volunteered for your SOS. Clinical screening is still required.`, alert._id);
    return { alert, notifications: [n] };
  });
  publish(result.notifications);
  res.json(alertView(result.alert, req.auth, donor.location));
}));
async function closeNotifications(session, alert) {
  const targets = await Notification.find({ resourceId: alert._id, type: 'sos' }).select('recipientId recipientType').session(session);
  const notifications = [];
  for (const target of targets) notifications.push(await notify(session, target.recipientType, target.recipientId, 'sos-resolved', `${alert.hospitalName}'s SOS has been resolved.`, alert._id));
  notifications.push(await notify(session, 'organization', alert.hospitalId, 'sos-resolved', 'Your SOS has been resolved.', alert._id));
  return notifications;
}
router.put('/:id/resolve', roles('hospital'), asyncRoute(async (req, res) => {
  const result = await mongoose.connection.transaction(async session => {
    const alert = await SOSAlert.findById(objectId(req.params.id)).session(session);
    if (!alert) fail(404, 'SOS alert not found');
    owner(req, alert.hospitalId);
    if (alert.status === 'Resolved') fail(409, 'SOS already resolved');
    alert.status = 'Resolved'; alert.resolvedBy = req.auth.account.name; alert.resolvedDate = new Date();
    await alert.save({ session });
    return { alert, notifications: await closeNotifications(session, alert) };
  });
  publish(result.notifications); res.json(alertView(result.alert, req.auth));
}));
router.put('/:id/fulfill', roles('hospital'), asyncRoute(async (req, res) => {
  const result = await mongoose.connection.transaction(async session => {
    const alert = await SOSAlert.findById(objectId(req.params.id)).session(session);
    if (!alert) fail(404, 'SOS alert not found');
    if (alert.status === 'Resolved' || alert.expiresAt <= new Date()) fail(409, 'SOS already closed or expired');
    if (String(alert.hospitalId) === String(req.auth.account._id)) fail(400, 'Use resolve for your own SOS; fulfill transfers stock from another hospital');
    const field = `inventory.${alert.targetBloodType}`;
    const source = await HospitalNGO.findOneAndUpdate({ _id: req.auth.account._id, role: 'hospital', isVerified: true, isActive: true, isScamReported: false, [field]: { $gte: alert.requiredQuantity } }, { $inc: { [field]: -alert.requiredQuantity } }, { new: true, session });
    if (!source) fail(409, 'Insufficient source hospital stock');
    const target = await HospitalNGO.findOneAndUpdate({ _id: alert.hospitalId, isVerified: true, isActive: true, isScamReported: false }, { $inc: { [field]: alert.requiredQuantity } }, { new: true, session });
    if (!target) fail(409, 'Requesting hospital is no longer active');
    alert.status = 'Resolved'; alert.resolvedBy = source.name; alert.resolvedDate = new Date();
    alert.fulfillment = { sourceHospitalId: source._id, units: alert.requiredQuantity };
    await alert.save({ session });
    return { alert, notifications: await closeNotifications(session, alert) };
  });
  publish(result.notifications); res.json(alertView(result.alert, req.auth));
}));
module.exports = router;
