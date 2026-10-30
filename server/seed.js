const mongoose = require('mongoose');
const { getConfig } = require('./config');
const { connectDatabase } = require('./db');
const { parse } = require('./lib/http');
const { password } = require('./lib/validation');
const User = require('./models/User');
const HospitalNGO = require('./models/HospitalNGO');
const Camp = require('./models/Camp');
const RewardItem = require('./models/RewardItem');
async function seed() {
  const config = getConfig();
  if (config.production) throw new Error('Demo seeding is disabled in production');
  const demoPassword = parse(password, process.env.DEMO_PASSWORD);
  await connectDatabase(config.mongoUri);
  // Insert missing demo rows only. Never delete or reset existing records or balances.
  let donor = await User.findOne({ email: 'donor@bloodlink.local' });
  if (!donor) donor = await User.create({
    donorId: 'BL-DEMO-00001', name: 'Demo Donor', email: 'donor@bloodlink.local', password: demoPassword,
    bloodType: 'O+', dob: '2000-05-15', address: 'Mumbai', location: { type: 'Point', coordinates: [72.8777, 19.076] },
    medicalHistory: { conditions: [], medications: [], allergies: [], surgeries: [], notes: 'Demo profile' },
    knownAbnormalities: [], shareMedicalHistory: true
  });
  const orgs = [];
  for (const [role, name, email, longitude] of [
    ['hospital', 'Demo Hospital', 'hospital@bloodlink.local', 72.88],
    ['hospital', 'Partner Hospital', 'partner@bloodlink.local', 72.89],
    ['ngo', 'Demo NGO', 'ngo@bloodlink.local', 72.87]
  ]) {
    let org = await HospitalNGO.findOne({ email });
    if (!org) org = await HospitalNGO.create({
      name, email, password: demoPassword, role, registrationNumber: `DEMO-${email}`, address: 'Mumbai',
      location: { type: 'Point', coordinates: [longitude, 19.076] }, isVerified: true,
      ...(role === 'hospital' ? { inventory: { 'O+': 20, 'O-': 10 } } : {})
    });
    orgs.push(org);
  }
  if (!await Camp.exists({ title: 'BloodLink Demo Camp' })) await Camp.create({
    title: 'BloodLink Demo Camp', organizerId: orgs[2]._id, organizerName: orgs[2].name, organizerRole: 'ngo',
    date: new Date(Date.now() + 7 * 86400000), endDate: new Date(Date.now() + 7 * 86400000 + 4 * 3600000),
    address: 'Mumbai Community Hall', location: { type: 'Point', coordinates: [72.875, 19.077] }
  });
  for (const [title, provider, costCoins] of [
    ['Health Check Voucher', 'Demo Clinic', 300], ['Movie Ticket', 'Demo Cinema', 150], ['Fitness Accessory', 'Demo Fitness', 200]
  ]) if (!await RewardItem.exists({ title })) await RewardItem.create({ title, provider, costCoins, stock: 20 });
  console.log('Demo data ready. Accounts: donor@bloodlink.local, hospital@bloodlink.local, partner@bloodlink.local, ngo@bloodlink.local');
  console.log('All use DEMO_PASSWORD from your .env. Admins are created separately with npm run create-admin.');
}
seed().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
