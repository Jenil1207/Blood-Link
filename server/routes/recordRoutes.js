const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const router = require('express').Router();
const DonationRecord = require('../models/DonationRecord');
const HospitalNGO = require('../models/HospitalNGO');
const Camp = require('../models/Camp');
const { authenticate, roles } = require('../middleware/auth');
const { asyncRoute, parse, fail, page, idempotencyKey } = require('../lib/http');
const v = require('../lib/validation');
const { findDonor, donorAccess } = require('../services/donors');
const { eligibility } = require('../lib/eligibility');
const { notify, publish } = require('../services/notifications');
router.use(authenticate);
router.get('/donor/:donorBLId', asyncRoute(async (req, res) => {
  const donor = await findDonor(req.params.donorBLId);
  donorAccess(req, donor);
  const query = { donorBLId: donor.donorId };
  if (req.auth.type === 'organization' && (req.auth.role === 'ngo' || !donor.shareMedicalHistory)) query.facilityId = req.auth.account._id;
  const { limit, before } = page(req.query);
  if (before) query._id = { $lt: before };
  const records = await DonationRecord.find(query).select('-requestHash -idempotencyKey -attendanceKey -endorsementKey -donorBalanceAfter').sort({ _id: -1 }).limit(limit);
  if (req.auth.role === 'ngo') return res.json(records.map(r => ({
    _id: r._id, donorBLId: r.donorBLId, donorName: r.donorName, facilityName: r.facilityName,
    date: r.date, dateString: r.dateString, isCampAttendance: r.isCampAttendance, coinsAwarded: r.coinsAwarded, status: r.status
  })));
  res.json(records);
}));
router.post('/', roles('hospital', 'ngo'), asyncRoute(async (req, res) => {
  const data = parse(v.record, req.body);
  const key = idempotencyKey(req);
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const facility = req.auth.account;
  if (req.auth.role === 'ngo' && (data.isDonation || data.isEndorsement)) fail(403, 'Only verified hospitals may log clinical donations or endorsements');
  if (req.auth.role === 'ngo' && (data.hemoglobin !== undefined || data.bloodPressure !== undefined)) fail(403, 'NGOs cannot update clinical screening values');
  if (data.screeningStatus === 'Deferred' && (data.isDonation || data.isEndorsement)) fail(400, 'A deferred screening cannot record donation or endorsement');
  if (data.isDonation && data.donationType === 'Event Attendance Only') fail(400, 'Choose a clinical donation type');
  if (data.isCampAttendance && !data.campId) fail(400, 'campId is required for attendance credit');
  if (!data.isDonation && !data.isCampAttendance && !data.isEndorsement && data.screeningStatus !== 'Deferred') fail(400, 'Select a donation, camp attendance, endorsement, or deferred screening');
  const priorQuery = { facilityId: facility._id, idempotencyKey: key };
  const replay = record => {
    if (record.requestHash !== hash) fail(409, 'Idempotency-Key was already used for a different record');
    return { record, replayed: true, notifications: [] };
  };
  let result;
  try {
    result = await mongoose.connection.transaction(async session => {
      const existing = await DonationRecord.findOne(priorQuery).session(session);
      if (existing) return replay(existing);
      const donor = await findDonor(data.donorBLId, session);
      const now = new Date();
      if (data.isDonation && !eligibility(donor, req.app.locals.config, now).scheduleEligible) fail(409, 'Donor does not meet the scheduling interval or age rules');
      if (data.bloodTypeCollected && data.bloodTypeCollected !== donor.bloodType) fail(400, 'Collected blood type must match the donor profile');
      if (data.isDonation && (data.quantityMl === undefined || data.hemoglobin === undefined || !data.bloodPressure)) fail(400, 'Donation requires quantityMl, hemoglobin and bloodPressure from clinical screening');
      if (data.isCampAttendance) {
        const camp = await Camp.findById(data.campId).session(session);
        if (!camp || String(camp.organizerId) !== String(facility._id)) fail(403, 'You may only verify attendance at your own camp');
        if (camp.status === 'Cancelled' || camp.date > now || !camp.registeredDonors.some(r => r.donorId === donor.donorId)) fail(409, 'Attendance needs a registered donor and a camp that has started');
      }
      const coinsAwarded = (data.isDonation ? 100 : 0) + (data.isCampAttendance ? 50 : 0) + (data.isEndorsement ? 75 : 0);
      donor.coins += coinsAwarded;
      if (data.isDonation) { donor.totalDonations++; donor.lastDonationDate = now; }
      if (data.isEndorsement) {
        donor.badgesCount++;
        if (!donor.verifyingInstitutions.includes(facility.name)) donor.verifyingInstitutions.push(facility.name);
      }
      if (req.auth.role === 'hospital') {
        donor.screeningStatus = data.screeningStatus;
        if (data.hemoglobin !== undefined) donor.hemoglobin = data.hemoglobin;
        if (data.bloodPressure !== undefined) donor.bloodPressure = data.bloodPressure;
      }
      await donor.save({ session });
      const [record] = await DonationRecord.create([{
        ...data, facilityId: facility._id, facilityName: facility.name, facilityType: req.auth.role,
        donorName: donor.name, date: now, dateString: now.toISOString().slice(0, 10),
        bloodTypeCollected: donor.bloodType, quantityMl: data.isDonation ? data.quantityMl : 0,
        donationType: data.isDonation ? data.donationType : 'Event Attendance Only',
        coinsAwarded, donorBalanceAfter: donor.coins, idempotencyKey: key, requestHash: hash,
        status: data.screeningStatus === 'Deferred' ? 'Deferred' : 'Verified',
        ...(data.isCampAttendance ? { attendanceKey: `${data.campId}:${donor.donorId}` } : {}),
        ...(data.isEndorsement ? { endorsementKey: `${facility._id}:${donor.donorId}` } : {})
      }], { session });
      // Inventory uses whole blood units; plasma/platelets have no stock bucket in this lab.
      if (data.isDonation && data.donationType === 'Whole Blood') await HospitalNGO.updateOne({ _id: facility._id }, { $inc: { [`inventory.${donor.bloodType}`]: 1 } }, { session });
      const notification = await notify(session, 'donor', donor._id, 'donation', `${facility.name} recorded your visit. ${coinsAwarded} Blood Coins awarded.`, record._id);
      return { record, replayed: false, notifications: [notification] };
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    const existing = await DonationRecord.findOne(priorQuery);
    if (!existing) fail(409, 'Attendance or endorsement has already been credited');
    result = replay(existing);
  }
  publish(result.notifications);
  const publicRecord = result.record.toObject();
  for (const field of ['requestHash', 'idempotencyKey', 'attendanceKey', 'endorsementKey', 'donorBalanceAfter']) delete publicRecord[field];
  res.status(result.replayed ? 200 : 201).json({ message: 'Record saved', record: publicRecord, donorCoins: result.record.donorBalanceAfter, replayed: result.replayed });
}));
module.exports = router;
