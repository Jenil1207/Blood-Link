const mongoose = require('mongoose');
const { bloodTypes, pointSchema } = require('./shared');
const schema = new mongoose.Schema({
  title: { type: String, required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalNGO', required: true },
  organizerName: { type: String, required: true }, organizerRole: { type: String, enum: ['hospital', 'ngo'], required: true },
  date: { type: Date, required: true }, endDate: { type: Date, required: true },
  timeString: { type: String, default: '' }, address: { type: String, required: true },
  location: { type: pointSchema, required: true },
  demands: { type: [String], enum: [...bloodTypes, 'All', 'All Types Accepted'], default: ['All'] },
  status: { type: String, enum: ['Scheduled', 'Cancelled', 'Completed'], default: 'Scheduled' },
  capacity: { type: Number, min: 1, default: 100 },
  slots: { type: [String], default: ['09:00-10:00', '10:00-11:00', '11:00-12:00'] },
  registeredDonors: [{
    donorId: { type: String, required: true }, name: { type: String, required: true },
    timeSlot: { type: String, required: true }, registeredAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });
schema.index({ location: '2dsphere' });
schema.index({ organizerId: 1, date: -1 });
module.exports = mongoose.model('Camp', schema);
