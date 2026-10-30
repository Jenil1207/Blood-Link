const mongoose = require('mongoose');
const { bloodTypes } = require('./shared');
const schema = new mongoose.Schema({
  donorBLId: { type: String, required: true, index: true }, donorName: { type: String, required: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalNGO', required: true },
  facilityName: { type: String, required: true }, facilityType: { type: String, enum: ['hospital', 'ngo'], required: true },
  campId: { type: mongoose.Schema.Types.ObjectId, ref: 'Camp', default: null },
  date: { type: Date, required: true }, dateString: String,
  bloodTypeCollected: { type: String, enum: bloodTypes },
  donationType: { type: String, enum: ['Whole Blood', 'Plasma', 'Platelets', 'Event Attendance Only'], default: 'Whole Blood' },
  quantityMl: { type: Number, min: 0, default: 0 }, collectionCenter: String, attendingStaff: String,
  hemoglobin: Number, bloodPressure: String,
  screeningStatus: { type: String, enum: ['Passed', 'Deferred'], required: true },
  isDonation: { type: Boolean, default: false }, isCampAttendance: { type: Boolean, default: false },
  isEndorsement: { type: Boolean, default: false }, coinsAwarded: { type: Number, min: 0, required: true },
  status: { type: String, default: 'Verified', enum: ['Verified', 'Deferred'] },
  idempotencyKey: { type: String, required: true }, requestHash: { type: String, required: true },
  donorBalanceAfter: { type: Number, required: true },
  attendanceKey: String, endorsementKey: String
}, { timestamps: true });
schema.index({ facilityId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ attendanceKey: 1 }, { unique: true, sparse: true });
schema.index({ endorsementKey: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('DonationRecord', schema);
