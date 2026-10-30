const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true },
  recipientType: { type: String, enum: ['donor', 'organization', 'admin'], required: true },
  type: { type: String, enum: ['sos', 'sos-response', 'sos-resolved', 'donation', 'reward', 'camp'], required: true },
  message: { type: String, required: true }, resourceId: mongoose.Schema.Types.ObjectId,
  readAt: { type: Date, default: null }
}, { timestamps: true });
schema.index({ recipientId: 1, recipientType: 1, _id: -1 });
module.exports = mongoose.model('Notification', schema);
