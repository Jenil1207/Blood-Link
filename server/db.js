const mongoose = require('mongoose');
async function connectDatabase(uri) {
  mongoose.set('bufferCommands', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  for (const name of ['User', 'HospitalNGO', 'Admin', 'Camp', 'SOSAlert', 'DonationRecord', 'RewardItem', 'Redemption', 'Notification', 'AuditLog']) require(`./models/${name}`);
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}
module.exports = { connectDatabase };
