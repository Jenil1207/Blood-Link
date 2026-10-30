const router = require('express').Router();
const HospitalNGO = require('../models/HospitalNGO');
const User = require('../models/User');
const { authenticate, roles, owner } = require('../middleware/auth');
const { asyncRoute, objectId, parse, fail, page } = require('../lib/http');
const { inventory, bloodType } = require('../lib/validation');
const { searchLocation, radius, near, distanceKm } = require('../lib/geo');
const { donorView } = require('../services/donors');
router.use(authenticate, roles('hospital', 'ngo'));
router.get('/donors/search', asyncRoute(async (req, res) => {
  const location = searchLocation(req.query, req.auth.account.location);
  const query = { isActive: true, location: near(location, radius(req.query)) };
  if (req.query.bloodType) query.bloodType = parse(bloodType, req.query.bloodType);
  if (req.query.donorId !== undefined) {
    if (typeof req.query.donorId !== 'string' || req.query.donorId.length > 120) fail(400, 'Invalid donor search');
    const search = req.query.donorId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [{ donorId: { $regex: search, $options: 'i' } }, { name: { $regex: search, $options: 'i' } }];
  }
  const donors = await User.find(query).limit(page(req.query).limit);
  const result = donors.map(d => {
    const view = donorView(d, req.auth, req.app.locals.config);
    return { ...view, distanceKm: distanceKm(location, d.location), isEligible: view.eligibility.isEligible, eligibilityStatus: view.eligibility.statusText };
  });
  res.json(result);
}));
router.get('/:id', asyncRoute(async (req, res) => {
  objectId(req.params.id); owner(req, req.params.id);
  const org = await HospitalNGO.findById(req.params.id);
  if (!org) fail(404, 'Organization not found');
  res.json(org);
}));
router.put('/:id/inventory', roles('hospital'), asyncRoute(async (req, res) => {
  objectId(req.params.id); owner(req, req.params.id);
  const data = parse(inventory, req.body.inventory);
  const update = Object.fromEntries(Object.entries(data).map(([type, count]) => [`inventory.${type}`, count]));
  const org = await HospitalNGO.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!org) fail(404, 'Organization not found');
  res.json(org);
}));
module.exports = router;
