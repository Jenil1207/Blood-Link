const mongoose = require('mongoose');
const { bloodTypes, pointSchema } = require('./shared');
const schema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalNGO', required: true },
  hospitalName: { type: String, required: true }, targetBloodType: { type: String, required: true, enum: bloodTypes },
  requiredQuantity: { type: Number, min: 1, required: true },
  urgencyLevel: { type: String, enum: ['Critical (24h)', 'Urgent', 'Standard'], default: 'Critical (24h)' },
  location: { type: pointSchema, required: true }, radiusKm: { type: Number, default: 50 },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'In Transit', 'Resolved'], default: 'Active' },
  responders: [{ donorId: String, name: String, acceptedAt: { type: Date, default: Date.now } }],
  resolvedBy: { type: String, default: 'NA' }, resolvedDate: Date,
  // Set when a hospital asks one specific partner hospital for a stock transfer.
  targetHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalNGO', default: null },
  fulfillment: { sourceHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalNGO' }, units: Number }
}, { timestamps: true });
schema.index({ location: '2dsphere' });
schema.index({ hospitalId: 1, createdAt: -1 });
module.exports = mongoose.model('SOSAlert', schema);
