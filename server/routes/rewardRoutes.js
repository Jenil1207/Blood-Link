const mongoose = require('mongoose');
const router = require('express').Router();
const RewardItem = require('../models/RewardItem');
const Redemption = require('../models/Redemption');
const User = require('../models/User');
const { authenticate, roles } = require('../middleware/auth');
const { asyncRoute, parse, fail, objectId, page, idempotencyKey } = require('../lib/http');
const v = require('../lib/validation');
const { notify, publish } = require('../services/notifications');
router.use(authenticate);
router.get('/', asyncRoute(async (req, res) => {
  const query = { isActive: true };
  const { limit, before } = page(req.query);
  if (before) query._id = { $lt: before };
  res.json(await RewardItem.find(query).sort({ _id: -1 }).limit(limit));
}));
router.get('/redemptions', roles('donor'), asyncRoute(async (req, res) => {
  const { limit, before } = page(req.query);
  res.json(await Redemption.find({ donorId: req.auth.account._id, ...(before ? { _id: { $lt: before } } : {}) }).select('-idempotencyKey').sort({ _id: -1 }).limit(limit));
}));
router.post('/redeem', roles('donor'), asyncRoute(async (req, res) => {
  const { rewardItemId } = parse(v.z.object({ rewardItemId: v.requiredText(), donorId: v.text().optional() }).strict(), req.body);
  objectId(rewardItemId);
  const key = idempotencyKey(req);
  const priorQuery = { donorId: req.auth.account._id, idempotencyKey: key };
  const replay = redemption => {
    if (String(redemption.rewardItemId) !== rewardItemId) fail(409, 'Idempotency-Key was used for a different reward');
    return { redemption, replayed: true, notifications: [] };
  };
  let result;
  try {
    result = await mongoose.connection.transaction(async session => {
      const existing = await Redemption.findOne(priorQuery).session(session);
      if (existing) return replay(existing);
      const reward = await RewardItem.findOneAndUpdate({ _id: rewardItemId, isActive: true, stock: { $gt: 0 } }, { $inc: { stock: -1 } }, { new: true, session });
      if (!reward) fail(409, 'Reward is unavailable or out of stock');
      const donor = await User.findOneAndUpdate({ _id: req.auth.account._id, isActive: true, coins: { $gte: reward.costCoins } }, { $inc: { coins: -reward.costCoins } }, { new: true, session });
      if (!donor) fail(409, 'Insufficient Blood Coins');
      const [redemption] = await Redemption.create([{
        donorId: donor._id, rewardItemId: reward._id, title: reward.title, provider: reward.provider,
        costCoins: reward.costCoins, balanceAfter: donor.coins, idempotencyKey: key
      }], { session });
      const notification = await notify(session, 'donor', donor._id, 'reward', `Redeemed ${reward.title} for ${reward.costCoins} Blood Coins.`, redemption._id);
      return { redemption, replayed: false, notifications: [notification] };
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    const existing = await Redemption.findOne(priorQuery);
    if (!existing) throw err;
    result = replay(existing);
  }
  publish(result.notifications);
  res.status(result.replayed ? 200 : 201).json({
    message: 'Voucher issued', newBalance: result.redemption.balanceAfter,
    voucherCode: result.redemption.voucherCode, redemptionId: result.redemption._id, replayed: result.replayed
  });
}));
router.post('/', roles('admin'), asyncRoute(async (req, res) => res.status(201).json(await RewardItem.create(parse(v.reward, req.body)))));
router.put('/:id', roles('admin'), asyncRoute(async (req, res) => {
  const reward = await RewardItem.findByIdAndUpdate(objectId(req.params.id), { $set: parse(v.reward, req.body) }, { new: true, runValidators: true });
  if (!reward) fail(404, 'Reward not found');
  res.json(reward);
}));
router.post('/redemptions/:id/use', roles('admin'), asyncRoute(async (req, res) => {
  const redemption = await Redemption.findOneAndUpdate({ _id: objectId(req.params.id), status: 'Issued' }, { status: 'Used', usedAt: new Date() }, { new: true });
  if (!redemption) fail(409, 'Voucher does not exist or has already been used');
  res.json({ message: 'Voucher marked as used', redemptionId: redemption._id });
}));
module.exports = router;
