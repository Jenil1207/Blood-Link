const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const schema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rewardItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RewardItem', required: true },
  title: String, provider: String, costCoins: { type: Number, required: true }, balanceAfter: { type: Number, required: true },
  voucherCode: { type: String, unique: true, default: () => `VCH-${randomUUID().toUpperCase()}` },
  idempotencyKey: { type: String, required: true },
  status: { type: String, enum: ['Issued', 'Used'], default: 'Issued' }, usedAt: Date
}, { timestamps: true });
schema.index({ donorId: 1, idempotencyKey: 1 }, { unique: true });
module.exports = mongoose.model('Redemption', schema);
