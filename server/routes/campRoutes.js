const mongoose = require('mongoose');
const router = require('express').Router();
const Camp = require('../models/Camp');
const HospitalNGO = require('../models/HospitalNGO');
const { authenticate, roles, owner } = require('../middleware/auth');
const { asyncRoute, parse, fail, objectId, page } = require('../lib/http');
const v = require('../lib/validation');
const { point, searchLocation, radius, near, distanceKm } = require('../lib/geo');
const { eligibility } = require('../lib/eligibility');
const { notify, publish } = require('../services/notifications');
router.use(authenticate);
function publicCamp(camp, auth, origin) {
  const data = camp.toObject();
  const manager = String(camp.organizerId) === String(auth.account._id) && auth.type === 'organization';
  const registrationCount = data.registeredDonors.length;
  const myRegistration = auth.type === 'donor' ? data.registeredDonors.find(d => d.donorId === auth.account.donorId) || null : null;
  if (!manager) delete data.registeredDonors;
  return { ...data, registrationCount, myRegistration, distanceKm: distanceKm(origin, camp.location) };
}
router.get('/', asyncRoute(async (req, res) => {
  const location = searchLocation(req.query, req.auth.account.location);
  const query = { status: 'Scheduled', endDate: { $gt: new Date() } };
  const activeOrgs = await HospitalNGO.find({ isActive: true, isVerified: true, isScamReported: false }).distinct('_id');
  query.organizerId = { $in: activeOrgs };
  if (location) query.location = near(location, radius(req.query)); else radius(req.query);
  if (req.query.bloodType && req.query.bloodType !== 'All') query.demands = { $in: [parse(v.bloodType, req.query.bloodType), 'All', 'All Types Accepted'] };
  if (req.query.mine === 'true') query.organizerId = req.auth.account._id;
  const camps = await Camp.find(query).limit(page(req.query).limit);
  res.json(camps.map(c => publicCamp(c, req.auth, location)));
}));
router.post('/', roles('hospital', 'ngo'), asyncRoute(async (req, res) => {
  const data = parse(v.camp, req.body);
  if (+new Date(data.date) <= Date.now() || +new Date(data.endDate) <= +new Date(data.date)) fail(400, 'Camp start must be in the future and endDate must follow date');
  const camp = await Camp.create({
    ...data, location: point(data.longitude, data.latitude),
    organizerId: req.auth.account._id, organizerName: req.auth.account.name, organizerRole: req.auth.role
  });
  res.status(201).json({ message: 'Donation camp created', camp: publicCamp(camp, req.auth) });
}));
router.get('/:id', asyncRoute(async (req, res) => {
  const camp = await Camp.findById(objectId(req.params.id));
  if (!camp) fail(404, 'Camp not found');
  res.json(publicCamp(camp, req.auth, req.auth.account.location));
}));
router.patch('/:id/status', roles('hospital', 'ngo'), asyncRoute(async (req, res) => {
  const { status } = parse(v.z.object({ status: v.z.enum(['Cancelled', 'Completed']) }).strict(), req.body);
  const result = await mongoose.connection.transaction(async session => {
    const camp = await Camp.findById(objectId(req.params.id)).session(session);
    if (!camp) fail(404, 'Camp not found');
    owner(req, camp.organizerId);
    if (camp.status !== 'Scheduled') fail(409, 'Camp is already closed');
    if (status === 'Completed' && camp.endDate > new Date()) fail(409, 'Camp has not ended yet');
    camp.status = status; await camp.save({ session });
    const notifications = [];
    for (const registration of camp.registeredDonors) {
      const donor = await require('../models/User').findOne({ donorId: registration.donorId }).session(session);
      if (donor) notifications.push(await notify(session, 'donor', donor._id, 'camp', `${camp.title} was ${status.toLowerCase()}`, camp._id));
    }
    return { camp, notifications };
  });
  publish(result.notifications);
  res.json(publicCamp(result.camp, req.auth));
}));
router.post('/:id/register', roles('donor'), asyncRoute(async (req, res) => {
  const { timeSlot } = parse(v.z.object({ timeSlot: v.requiredText(80), donorId: v.text().optional(), name: v.text().optional() }).strict(), req.body);
  const donor = req.auth.account;
  if (!eligibility(donor, req.app.locals.config).scheduleEligible || donor.screeningStatus === 'Deferred') fail(409, 'Donor is currently deferred or outside the scheduling eligibility window');
  const camp = await Camp.findById(objectId(req.params.id));
  if (!camp) fail(404, 'Camp not found');
  const org = await HospitalNGO.findOne({ _id: camp.organizerId, isVerified: true, isActive: true, isScamReported: false });
  if (!org) fail(409, 'Camp organizer is not active');
  if (!camp.slots.includes(timeSlot)) fail(400, 'Select one of the camp slots');
  const updated = await Camp.findOneAndUpdate({
    _id: camp._id, status: 'Scheduled', date: { $gt: new Date() },
    'registeredDonors.donorId': { $ne: donor.donorId },
    $expr: { $lt: [{ $size: '$registeredDonors' }, '$capacity'] }
  }, { $push: { registeredDonors: { donorId: donor.donorId, name: donor.name, timeSlot } } }, { new: true });
  if (!updated) fail(409, 'Camp has started, is closed/full, or you are already registered');
  res.json({ message: 'Camp slot booked', camp: publicCamp(updated, req.auth) });
}));
router.delete('/:id/register', roles('donor'), asyncRoute(async (req, res) => {
  const camp = await Camp.findOneAndUpdate({ _id: objectId(req.params.id), status: 'Scheduled', date: { $gt: new Date() }, 'registeredDonors.donorId': req.auth.account.donorId }, { $pull: { registeredDonors: { donorId: req.auth.account.donorId } } }, { new: true });
  if (!camp) fail(409, 'No upcoming booking available to cancel');
  res.json({ message: 'Booking cancelled' });
}));
module.exports = router;
