const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { bloodTypes, pointSchema, accountPlugin } = require('./shared');
const medicalSchema = new mongoose.Schema({
  conditions: { type: [String], default: [] }, medications: { type: [String], default: [] },
  allergies: { type: [String], default: [] }, surgeries: { type: [String], default: [] },
  notes: { type: String, default: '' }
}, { _id: false });
const schema = new mongoose.Schema({
  donorId: { type: String, unique: true, default: () => `BL-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}` },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  bloodType: { type: String, required: true, enum: bloodTypes },
  dob: { type: Date, required: true }, address: { type: String, default: '' }, phone: { type: String, default: '' },
  location: { type: pointSchema, default: undefined },
  healthProblems: { type: String, default: '' },
  medicalHistory: { type: medicalSchema, default: () => ({}) },
  knownAbnormalities: { type: [String], default: [] },
  shareMedicalHistory: { type: Boolean, default: false },
  availableForSOS: { type: Boolean, default: true },
  coins: { type: Number, min: 0, default: 0 }, totalDonations: { type: Number, min: 0, default: 0 },
  badgesCount: { type: Number, min: 0, default: 0 },
  lastDonationDate: { type: Date, default: null }, hemoglobin: { type: Number, default: null },
  bloodPressure: { type: String, default: '' },
  screeningStatus: { type: String, enum: ['Passed', 'Deferred', 'Pending'], default: 'Pending' },
  verifyingInstitutions: { type: [String], default: [] }
}, { timestamps: true });
schema.plugin(accountPlugin);
schema.index({ location: '2dsphere' });
module.exports = mongoose.model('User', schema);
