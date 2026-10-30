const mongoose = require('mongoose');
const { bloodTypes, pointSchema, accountPlugin } = require('./shared');
const inventory = Object.fromEntries(bloodTypes.map(type => [type, { type: Number, min: 0, default: 0, validate: Number.isInteger }]));
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['hospital', 'ngo'], required: true },
  registrationNumber: { type: String, required: true, unique: true, trim: true },
  licenseInfo: { type: String, default: '' }, address: { type: String, required: true },
  location: { type: pointSchema, required: true },
  isVerified: { type: Boolean, default: false }, isScamReported: { type: Boolean, default: false },
  scamReportReason: { type: String, default: '' }, inventory
}, { timestamps: true });
schema.plugin(accountPlugin);
schema.index({ location: '2dsphere' });
module.exports = mongoose.model('HospitalNGO', schema);
