const mongoose = require('mongoose');

// Schema for Rewards Store Vouchers & Items
const rewardItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      required: true
    },
    costCoins: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      default: ''
    },
    stock: {
      type: Number,
      default: 50
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RewardItem', rewardItemSchema);
