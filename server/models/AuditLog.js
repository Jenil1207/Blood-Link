const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, required: true }, targetId: { type: mongoose.Schema.Types.ObjectId, required: true }
}, { timestamps: true });
module.exports = mongoose.model('AuditLog', schema);
