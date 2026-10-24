const express = require('express');
const router = express.Router();
const RewardItem = require('../models/RewardItem');
const User = require('../models/User');

// Get all reward vouchers
router.get('/', async (req, res) => {
  try {
    const items = await RewardItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Redeem a voucher using Blood Coins
router.post('/redeem', async (req, res) => {
  try {
    const { donorId, rewardItemId } = req.body;

    const donor = await User.findById(donorId);
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    const reward = await RewardItem.findById(rewardItemId);
    if (!reward) {
      return res.status(404).json({ error: 'Reward item not found' });
    }

    if (donor.coins < reward.costCoins) {
      return res.status(400).json({
        error: `Insufficient coins. You have ${donor.coins} coins, but this voucher costs ${reward.costCoins} coins.`
      });
    }

    // Deduct coins and decrement stock
    donor.coins -= reward.costCoins;
    await donor.save();

    if (reward.stock > 0) {
      reward.stock -= 1;
      await reward.save();
    }

    res.json({
      message: `Successfully redeemed "${reward.title}"!`,
      newBalance: donor.coins,
      voucherCode: 'VCH-' + Math.floor(100000 + Math.random() * 900000)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
