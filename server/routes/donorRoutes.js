const router = require('express').Router();
const { authenticate, roles, owner } = require('../middleware/auth');
const { asyncRoute, parse } = require('../lib/http');
const { donorUpdate } = require('../lib/validation');
const { point } = require('../lib/geo');
const { findDonor, donorView, donorAccess } = require('../services/donors');
router.use(authenticate);
router.get('/:identifier', asyncRoute(async (req, res) => {
  const donor = await findDonor(req.params.identifier);
  donorAccess(req, donor);
  res.json(donorView(donor, req.auth, req.app.locals.config));
}));
router.put('/:id', roles('donor'), asyncRoute(async (req, res) => {
  const donor = await findDonor(req.params.id);
  owner(req, donor._id);
  const { latitude, longitude, ...data } = parse(donorUpdate, req.body);
  // A changed disclosure needs fresh review by clinical staff.
  const clinical = ['healthProblems', 'medicalHistory', 'knownAbnormalities', 'dob', 'bloodType'];
  if (clinical.some(k => Object.hasOwn(data, k))) donor.screeningStatus = 'Pending';
  Object.assign(donor, data);
  if (latitude !== undefined) donor.location = point(longitude, latitude);
  await donor.save();
  res.json(donorView(donor, req.auth, req.app.locals.config));
}));
module.exports = router;
