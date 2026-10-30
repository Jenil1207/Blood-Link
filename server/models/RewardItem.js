const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  title: { type: String, required: true }, provider: { type: String, required: true },
  costCoins: { type: Number, required: true, min: 1, validate: Number.isInteger },
  image: { type: String, default: '' }, stock: { type: Number, min: 0, default: 0, validate: Number.isInteger },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('RewardItem', schema);
