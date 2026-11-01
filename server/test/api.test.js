const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { randomUUID } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const { createApp } = require('../app');
const { connectDatabase } = require('../db');
const { signToken } = require('../middleware/auth');
const { eligibility } = require('../lib/eligibility');
const User = require('../models/User');
const HospitalNGO = require('../models/HospitalNGO');
const Admin = require('../models/Admin');
const Camp = require('../models/Camp');
const SOSAlert = require('../models/SOSAlert');
const DonationRecord = require('../models/DonationRecord');
const RewardItem = require('../models/RewardItem');
const Redemption = require('../models/Redemption');
const Notification = require('../models/Notification');
process.env.NODE_ENV = 'test';
const config = { jwtSecret: 'test-only-secret-with-at-least-32-characters', tokenHours: 8, donationIntervalDays: 90, origins: ['http://localhost:5173'] };
let replica, app, admin, hospital, partner, ngo, donor, other, adminToken, hospitalToken, partnerToken, ngoToken, donorToken, otherToken;
const password = 'StrongLabPassword123';
const loc = { type: 'Point', coordinates: [72.8777, 19.076] };
const bearer = token => `Bearer ${token}`;
const key = () => randomUUID();
const token = (account, type) => signToken(account, type, config);
async function makeDonor(fields = {}) {
  return User.create({ name: 'Test Donor', email: `${key()}@example.com`, password, bloodType: 'O+', dob: '2000-01-01', location: loc, ...fields });
}
async function makeOrg(role, fields = {}) {
  return HospitalNGO.create({ name: `Test ${role}`, email: `${key()}@example.com`, password, role, registrationNumber: key(), address: 'Mumbai', location: loc, isVerified: true, ...fields });
}
function api(method, path, auth) {
  const req = request(app)[method](`/api${path}`);
  return auth ? req.set('Authorization', bearer(auth)) : req;
}
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ ip: '127.0.0.1' }] });
  await connectDatabase(replica.getUri());
  app = createApp(config);
  admin = await Admin.create({ name: 'Admin', email: 'admin@example.com', password });
  hospital = await makeOrg('hospital', { name: 'Receiving Hospital' });
  partner = await makeOrg('hospital', { name: 'Partner Hospital', location: { type: 'Point', coordinates: [72.89, 19.076] }, inventory: { 'O+': 10 } });
  ngo = await makeOrg('ngo');
  donor = await makeDonor({ shareMedicalHistory: true, medicalHistory: { conditions: ['Asthma'], medications: ['Prescribed inhaler'], allergies: ['Pollen'] }, knownAbnormalities: ['Reported irregular pulse'] });
  other = await makeDonor();
  adminToken = token(admin, 'admin'); hospitalToken = token(hospital, 'organization'); partnerToken = token(partner, 'organization'); ngoToken = token(ngo, 'organization'); donorToken = token(donor, 'donor'); otherToken = token(other, 'donor');
}, { timeout: 180000 });
after(async () => { app?.locals.closeStreams(); await mongoose.disconnect(); await replica?.stop(); });

test('health readiness, CORS and malformed requests', async () => {
  await api('get', '/health').expect(200);
  await api('get', '/health/live').expect(200);
  await api('get', '/docs').expect(200).then(r => assert.equal(r.body.openapi, '3.1.0'));
  await api('get', '/health').set('Origin', 'https://untrusted.example').expect(403);
  await api('get', '/missing').expect(404);
  await api('post', '/auth/login').set('Content-Type', 'application/json').send('{broken').expect(400);
});
test('hosting proxy rate limits separate visitors and ignore forged earlier IPs', async () => {
  assert.equal(app.get('trust proxy'), 0);
  const proxiedApp = createApp({ ...config, trustProxyHops: 1 });
  const remaining = response => Number(/remaining=(\d+)/.exec(response.headers.ratelimit)[1]);
  const first = await request(proxiedApp).get('/api/missing').set('X-Forwarded-For', '192.0.2.1, 203.0.113.10').expect(404);
  const sameVisitor = await request(proxiedApp).get('/api/missing').set('X-Forwarded-For', '192.0.2.99, 203.0.113.10').expect(404);
  const otherVisitor = await request(proxiedApp).get('/api/missing').set('X-Forwarded-For', '192.0.2.1, 203.0.113.11').expect(404);
  assert.equal(remaining(sameVisitor), remaining(first) - 1);
  assert.equal(remaining(otherVisitor), remaining(first));
});
test('registration stores medical disclosure, hashes passwords, and has honest defaults', async () => {
  const res = await api('post', '/auth/register-donor').send({
    name: 'New Donor', email: '  NEW@example.com ', password, bloodType: 'AB-', dob: '2002-02-02',
    medicalHistory: { conditions: ['Migraine'], medications: ['Medicine'], allergies: [], surgeries: [], notes: 'For review' },
    knownAbnormalities: ['Self-reported abnormality'], latitude: 0, longitude: 0
  }).expect(201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'new@example.com');
  assert.equal(res.body.user.password, undefined);
  assert.equal(res.body.user.coins, 0);
  assert.equal(res.body.user.totalDonations, 0);
  assert.equal(res.body.user.screeningStatus, 'Pending');
  assert.equal(res.body.user.hemoglobin, null);
  assert.deepEqual(res.body.user.location.coordinates, [0, 0]);
  assert.deepEqual(res.body.user.knownAbnormalities, ['Self-reported abnormality']);
  const saved = await User.findOne({ email: 'new@example.com' }).select('+password');
  assert.notEqual(saved.password, password); assert.ok(await saved.comparePassword(password));
  await api('post', '/auth/register-donor').send({ name: 'Duplicate', email: 'NEW@example.com', password, bloodType: 'O+', dob: '2000-01-01' }).expect(409);
});
test('validation rejects escalation, query operators and invalid dates/coordinates', async () => {
  const base = { name: 'Bad', email: 'bad@example.com', password, bloodType: 'O+', dob: '2000-01-01' };
  await api('post', '/auth/register-donor').send({ ...base, coins: 9999, role: 'admin' }).expect(400);
  await api('post', '/auth/register-donor').send({ ...base, latitude: 91, longitude: 0 }).expect(400);
  await api('post', '/auth/register-donor').send({ ...base, latitude: 0 }).expect(400);
  await api('post', '/auth/register-donor').send({ ...base, dob: '2000-02-31' }).expect(400);
  await api('post', '/auth/login').send({ email: { $ne: null }, password: { $ne: null } }).expect(400);
});
test('authentication protects private routes and tokens exclude secrets', async () => {
  await api('get', '/donors/' + donor.donorId).expect(401);
  await api('get', '/admin/organizations', donorToken).expect(403);
  const res = await api('post', '/auth/login').send({ email: donor.email.toUpperCase(), password, accountType: 'donor' }).expect(200);
  assert.equal(res.body.data.password, undefined); assert.equal(res.body.data.tokenVersion, undefined);
  await api('post', '/auth/login').send({ email: donor.email, password: 'wrong' }).expect(401);
  await api('get', '/auth/me', res.body.token).expect(200);
  await api('get', '/auth/me', donorToken + 'tamper').expect(401);
});
test('donor ownership and consent prevent medical and location leakage', async () => {
  await api('get', '/donors/' + donor.donorId, otherToken).expect(403);
  await api('get', '/donors/not-an-id', donorToken).expect(400);
  const clinical = await api('get', '/donors/' + donor.donorId, hospitalToken).expect(200);
  assert.deepEqual(clinical.body.medicalHistory.conditions, ['Asthma']);
  assert.equal(clinical.body.email, undefined); assert.equal(clinical.body.location, undefined);
  const limited = await api('get', '/donors/' + donor.donorId, ngoToken).expect(200);
  for (const field of ['medicalHistory', 'knownAbnormalities', 'healthProblems', 'dob', 'phone', 'hemoglobin', 'bloodPressure']) assert.equal(limited.body[field], undefined);
  const notShared = await api('get', '/donors/' + other.donorId, hospitalToken).expect(200);
  assert.equal(notShared.body.medicalHistory, undefined);
  await api('put', '/donors/' + donor._id, otherToken).send({ name: 'Intruder' }).expect(403);
  await api('put', '/donors/' + donor._id, donorToken).send({ coins: 1000 }).expect(400);
  await api('get', '/donors/' + donor.donorId, adminToken).expect(403);
});
test('medical edits reset clinical screening without modifying rewards', async () => {
  await User.updateOne({ _id: other._id }, { screeningStatus: 'Passed' });
  const res = await api('put', '/donors/' + other._id, otherToken).send({ medicalHistory: { notes: 'New disclosure' }, knownAbnormalities: ['For review'] }).expect(200);
  assert.equal(res.body.screeningStatus, 'Pending'); assert.equal(res.body.coins, 0);
});
test('saving only donor location preserves clinical screening and validates coordinate pairs', async () => {
  const account = await makeDonor({ screeningStatus: 'Passed', coins: 20 });
  const auth = token(account, 'donor');
  const saved = await api('put', '/donors/' + account._id, auth).send({ latitude: 0, longitude: 0 }).expect(200);
  assert.deepEqual(saved.body.location.coordinates, [0, 0]);
  assert.equal(saved.body.screeningStatus, 'Passed');
  assert.equal(saved.body.coins, 20);
  const reloaded = await api('get', '/donors/' + account.donorId, auth).expect(200);
  assert.deepEqual(reloaded.body.location.coordinates, [0, 0]);
  await api('put', '/donors/' + account._id, auth).send({ latitude: 0 }).expect(400);
  await api('put', '/donors/' + account._id, auth).send({ latitude: 0, longitude: 181 }).expect(400);
});
test('organization registration requires real location and admin verification', async () => {
  const data = { name: 'Pending Hospital', email: 'pending@example.com', password, role: 'hospital', registrationNumber: key(), address: 'Mumbai' };
  await api('post', '/auth/register-hospital-ngo').send(data).expect(400);
  const res = await api('post', '/auth/register-hospital-ngo').send({ ...data, latitude: 0, longitude: 0 }).expect(201);
  assert.equal(res.body.organization.isVerified, false);
  assert.equal(res.body.organization.password, undefined);
  await api('post', '/auth/login').send({ email: data.email, password, accountType: 'hospital-ngo' }).expect(403);
  await api('put', '/admin/verify/' + res.body.organization._id, donorToken).expect(403);
  await api('put', '/admin/verify/' + res.body.organization._id, adminToken).expect(200);
  await api('post', '/auth/login').send({ email: data.email, password, accountType: 'hospital-ngo' }).expect(200);
  const list = await api('get', '/admin/organizations', adminToken).expect(200);
  for (const row of list.body) assert.equal(row.password, undefined);
});
test('inventory updates are bounded, owner-only and hospital-only', async () => {
  await api('put', '/hospitals/' + hospital._id + '/inventory', ngoToken).send({ inventory: { 'O+': 10 } }).expect(403);
  await api('put', '/hospitals/' + hospital._id + '/inventory', partnerToken).send({ inventory: { 'O+': 10 } }).expect(403);
  await api('put', '/hospitals/' + hospital._id + '/inventory', hospitalToken).send({ inventory: { 'O+': -1 } }).expect(400);
  await api('put', '/hospitals/' + hospital._id + '/inventory', hospitalToken).send({ inventory: { 'O+': 0, 'A+': 2 } }).expect(200);
});
test('donor discovery uses radius indexes, validates coordinates and escapes regex', async () => {
  const near = await api('get', '/hospitals/donors/search?lat=19.076&lng=72.8777&radiusKm=5', hospitalToken).expect(200);
  assert.ok(near.body.some(d => d.donorId === donor.donorId));
  assert.equal(near.body.find(d => d.donorId === donor.donorId).distanceKm, 0);
  const far = await api('get', '/hospitals/donors/search?lat=0&lng=0&radiusKm=1', hospitalToken).expect(200);
  assert.ok(!far.body.some(d => d.donorId === donor.donorId));
  await api('get', '/hospitals/donors/search?lat=abc&lng=0', hospitalToken).expect(400);
  await api('get', '/hospitals/donors/search?radiusKm=-1', hospitalToken).expect(400);
  const regex = await api('get', '/hospitals/donors/search?donorId=%5B', hospitalToken).expect(200);
  assert.deepEqual(regex.body, []);
});
test('camp booking is atomic under duplicate and capacity races and hides rosters', async () => {
  const created = await api('post', '/camps', ngoToken).send({
    title: 'One Seat Camp', date: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 + 3600000).toISOString(), address: 'Mumbai',
    latitude: 19.076, longitude: 72.8777, capacity: 1, slots: ['Morning']
  }).expect(201);
  const id = created.body.camp._id;
  const responses = await Promise.all([
    api('post', '/camps/' + id + '/register', donorToken).send({ timeSlot: 'Morning', donorId: other.donorId }),
    api('post', '/camps/' + id + '/register', donorToken).send({ timeSlot: 'Morning' })
  ]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  await api('post', '/camps/' + id + '/register', otherToken).send({ timeSlot: 'Morning' }).expect(409);
  const view = await api('get', '/camps/' + id, otherToken).expect(200);
  assert.equal(view.body.registeredDonors, undefined); assert.equal(view.body.registrationCount, 1);
  assert.equal((await Camp.findById(id)).registeredDonors[0].donorId, donor.donorId);
  await api('patch', '/camps/' + id + '/status', hospitalToken).send({ status: 'Cancelled' }).expect(403);
  await api('delete', '/camps/' + id + '/register', donorToken).expect(200);
  await api('post', '/camps/' + id + '/register', otherToken).send({ timeSlot: 'Unknown' }).expect(400);
  await api('patch', '/camps/' + id + '/status', ngoToken).send({ status: 'Cancelled' }).expect(200);
});
test('donation writes, coin awards and whole blood inventory commit once', async () => {
  const body = { donorBLId: donor.donorId, isDonation: true, isEndorsement: true, screeningStatus: 'Passed', quantityMl: 450, hemoglobin: 14, bloodPressure: '120/80', attendingStaff: 'Lab clinician' };
  const idempotency = key();
  const results = await Promise.all([
    api('post', '/records', hospitalToken).set('Idempotency-Key', idempotency).send(body),
    api('post', '/records', hospitalToken).set('Idempotency-Key', idempotency).send(body)
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 201], JSON.stringify(results.map(r => r.body)));
  assert.equal(await DonationRecord.countDocuments({ donorBLId: donor.donorId }), 1);
  const saved = await User.findById(donor._id);
  assert.equal(saved.coins, 175); assert.equal(saved.totalDonations, 1); assert.equal(saved.badgesCount, 1);
  assert.equal((await HospitalNGO.findById(hospital._id)).inventory['O+'], 1);
  await api('post', '/records', hospitalToken).set('Idempotency-Key', idempotency).send({ ...body, quantityMl: 400 }).expect(409);
  await api('post', '/records', hospitalToken).set('Idempotency-Key', key()).send(body).expect(409);
  await api('post', '/records', hospitalToken).send(body).expect(400);
  await api('post', '/records', ngoToken).set('Idempotency-Key', key()).send({ ...body, facilityType: 'hospital' }).expect(403);
  await api('post', '/records', donorToken).set('Idempotency-Key', key()).send(body).expect(403);
});
test('standalone endorsement cannot be farmed and duplicate failure rolls back donor balance', async () => {
  const body = { donorBLId: other.donorId, isEndorsement: true, screeningStatus: 'Passed', attendingStaff: 'Clinician' };
  await api('post', '/records', hospitalToken).set('Idempotency-Key', key()).send(body).expect(201);
  await api('post', '/records', hospitalToken).set('Idempotency-Key', key()).send(body).expect(409);
  assert.equal((await User.findById(other._id)).coins, 75);
});
test('deferred screening awards no donation coins and records are donor-scoped', async () => {
  const res = await api('post', '/records', hospitalToken).set('Idempotency-Key', key()).send({ donorBLId: other.donorId, screeningStatus: 'Deferred', attendingStaff: 'Clinician' }).expect(201);
  assert.equal(res.body.record.coinsAwarded, 0);
  await api('post', '/records', hospitalToken).set('Idempotency-Key', key()).send({ donorBLId: other.donorId, isDonation: true, screeningStatus: 'Deferred', attendingStaff: 'Clinician' }).expect(400);
  await api('get', '/records/donor/' + donor.donorId, otherToken).expect(403);
  const own = await api('get', '/records/donor/' + donor.donorId, donorToken).expect(200);
  assert.equal(own.body.length, 1); assert.equal(own.body[0].requestHash, undefined);
  const thirdParty = await api('get', '/records/donor/' + other.donorId, partnerToken).expect(200);
  assert.deepEqual(thirdParty.body, []);
});
test('camp attendance requires an owned camp and credits a donor only once', async () => {
  const camp = await Camp.create({ title: 'Started Camp', organizerId: ngo._id, organizerName: ngo.name, organizerRole: 'ngo',
    date: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000), address: 'Mumbai', location: loc,
    registeredDonors: [{ donorId: donor.donorId, name: donor.name, timeSlot: 'Morning' }] });
  const body = { donorBLId: donor.donorId, campId: String(camp._id), isCampAttendance: true, screeningStatus: 'Passed', attendingStaff: 'Volunteer' };
  await api('post', '/records', ngoToken).set('Idempotency-Key', key()).send(body).expect(201);
  await api('post', '/records', ngoToken).set('Idempotency-Key', key()).send(body).expect(409);
  await api('post', '/records', hospitalToken).set('Idempotency-Key', key()).send(body).expect(403);
  const records = await api('get', '/records/donor/' + donor.donorId, ngoToken).expect(200);
  assert.equal(records.body[0].hemoglobin, undefined);
  assert.equal((await User.findById(donor._id)).coins, 225);
});
test('reward redemption is transactional, idempotent, and never trusts body donor identity', async () => {
  const reward = await RewardItem.create({ title: 'One voucher', provider: 'Lab', costCoins: 100, stock: 1 });
  const idempotency = key(), body = { rewardItemId: String(reward._id), donorId: String(other._id) };
  const responses = await Promise.all([
    api('post', '/rewards/redeem', donorToken).set('Idempotency-Key', idempotency).send(body),
    api('post', '/rewards/redeem', donorToken).set('Idempotency-Key', idempotency).send(body)
  ]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 201], JSON.stringify(responses.map(r => r.body)));
  assert.equal(responses[0].body.voucherCode, responses[1].body.voucherCode);
  assert.equal((await User.findById(donor._id)).coins, 125);
  assert.equal((await User.findById(other._id)).coins, 75);
  assert.equal((await RewardItem.findById(reward._id)).stock, 0);
  assert.equal(await Redemption.countDocuments({ rewardItemId: reward._id }), 1);
  await api('post', '/rewards/redeem', otherToken).set('Idempotency-Key', key()).send(body).expect(409);
  const redemption = await Redemption.findOne({ rewardItemId: reward._id });
  await api('post', '/rewards/redemptions/' + redemption._id + '/use', adminToken).expect(200);
  await api('post', '/rewards/redemptions/' + redemption._id + '/use', adminToken).expect(409);
});
test('concurrent redemptions cannot overspend and insufficient funds restores stock', async () => {
  const reward = await RewardItem.create({ title: 'Concurrent', provider: 'Lab', costCoins: 100, stock: 5 });
  const responses = await Promise.all([1, 2].map(() => api('post', '/rewards/redeem', donorToken).set('Idempotency-Key', key()).send({ rewardItemId: String(reward._id) })));
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  assert.equal((await User.findById(donor._id)).coins, 25);
  assert.equal((await RewardItem.findById(reward._id)).stock, 4);
  await api('post', '/rewards', donorToken).send({}).expect(403);
});
test('SOS persists matching notifications and delivers a live SSE event', { timeout: 20000 }, async () => {
  await User.updateOne({ _id: other._id }, { screeningStatus: 'Pending', availableForSOS: true });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const controller = new AbortController();
  let reader;
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/notifications/stream`, { headers: { Authorization: bearer(otherToken) }, signal: controller.signal });
    assert.equal(response.status, 200);
    reader = response.body.getReader();
    const first = await reader.read(); assert.match(Buffer.from(first.value).toString(), /event: connected/);
    const created = await api('post', '/sos', hospitalToken).send({ targetBloodType: 'O+', requiredQuantity: 3, hospitalId: String(partner._id), hospitalName: 'Spoof' }).expect(201);
    assert.equal(created.body.alert.hospitalId, String(hospital._id));
    assert.equal(created.body.alert.hospitalName, hospital.name);
    const live = await Promise.race([
      (async () => { let text = ''; while (!text.includes('event: notification')) { const item = await reader.read(); if (item.done) break; text += Buffer.from(item.value).toString(); } return text; })(),
      new Promise((_, reject) => { const timeout = setTimeout(() => reject(new Error('SSE delivery timed out')), 5000); timeout.unref(); })
    ]);
    assert.match(live, /needs 3 units/);
    const notifications = await Notification.find({ resourceId: created.body.alert._id, type: 'sos' });
    assert.ok(notifications.some(n => String(n.recipientId) === String(other._id)));
    assert.ok(notifications.some(n => String(n.recipientId) === String(partner._id) && n.recipientType === 'organization'));
    assert.ok(!notifications.some(n => String(n.recipientId) === String(donor._id)), 'recent donor excluded');
    await api('get', '/sos/nearby?lat=0&lng=0&radiusKm=1', otherToken).expect(200).then(r => assert.deepEqual(r.body, []));
    await api('put', '/sos/' + created.body.alert._id + '/accept', otherToken).expect(200);
    await api('put', '/sos/' + created.body.alert._id + '/accept', otherToken).expect(409);
    const donorView = await api('get', '/sos/nearby', otherToken).expect(200);
    assert.equal(donorView.body.find(a => a._id === created.body.alert._id).responders, undefined);
    await api('put', '/sos/' + created.body.alert._id + '/resolve', partnerToken).expect(403);
  } finally {
    controller.abort(); await reader?.cancel().catch(() => {}); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
test('SOS fulfillment atomically transfers stock exactly once', async () => {
  const created = await api('post', '/sos', hospitalToken).send({ targetBloodType: 'O+', requiredQuantity: 3 }).expect(201);
  const id = created.body.alert._id;
  const beforeSource = (await HospitalNGO.findById(partner._id)).inventory['O+'];
  const beforeTarget = (await HospitalNGO.findById(hospital._id)).inventory['O+'];
  const responses = await Promise.all([1, 2].map(() => api('put', '/sos/' + id + '/fulfill', partnerToken)));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409], JSON.stringify(responses.map(r => r.body)));
  assert.equal((await HospitalNGO.findById(partner._id)).inventory['O+'], beforeSource - 3);
  assert.equal((await HospitalNGO.findById(hospital._id)).inventory['O+'], beforeTarget + 3);
  const insufficient = await api('post', '/sos', hospitalToken).send({ targetBloodType: 'AB-', requiredQuantity: 3 }).expect(201);
  await api('put', '/sos/' + insufficient.body.alert._id + '/fulfill', partnerToken).expect(409);
  assert.equal((await SOSAlert.findById(insufficient.body.alert._id)).status, 'Active');
  await api('get', '/sos/stock-matches/' + hospital._id + '?bloodType=O%2B&units=1', hospitalToken).expect(200);
  await api('post', '/sos', ngoToken).send({ targetBloodType: 'O+', requiredQuantity: 1 }).expect(403);
});
test('notification history and read acknowledgements are owner-only', async () => {
  const listed = await api('get', '/notifications', otherToken).expect(200);
  assert.ok(listed.body.length > 0);
  const notification = listed.body[0];
  await api('put', '/notifications/' + notification._id + '/read', donorToken).expect(404);
  await api('put', '/notifications/' + notification._id + '/read', otherToken).expect(200);
  await api('get', '/notifications?limit=0', otherToken).expect(400);
});
test('moderation revokes access and retains auditable records', async () => {
  const org = await makeOrg('hospital'), orgToken = token(org, 'organization');
  await api('get', '/auth/me', orgToken).expect(200);
  await api('put', '/admin/report-scam/' + org._id, adminToken).send({ reason: 'Review required' }).expect(200);
  await api('get', '/auth/me', orgToken).expect(401);
  await api('post', '/auth/login').send({ email: org.email, password, accountType: 'hospital-ngo' }).expect(403);
  await api('put', '/admin/verify/' + org._id, adminToken).expect(200);
  await api('delete', '/admin/org/' + org._id, adminToken).expect(200);
  assert.equal((await HospitalNGO.findById(org._id)).isActive, false);
  const audit = await api('get', '/admin/audit', adminToken).expect(200);
  assert.ok(audit.body.length >= 3);
});
test('password changes and logout invalidate previously issued tokens', async () => {
  const temporary = await makeDonor(), originalToken = token(temporary, 'donor');
  await api('put', '/auth/password', originalToken).send({ currentPassword: password, newPassword: 'AnotherLabPassword123' }).expect(200);
  await api('get', '/auth/me', originalToken).expect(401);
  const loggedIn = await api('post', '/auth/login').send({ email: temporary.email, password: 'AnotherLabPassword123' }).expect(200);
  await api('post', '/auth/logout', loggedIn.body.token).expect(200);
  await api('get', '/auth/me', loggedIn.body.token).expect(401);
});
test('eligibility uses elapsed time without rounding early or treating future donations as past', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  const base = { dob: '2000-01-01', screeningStatus: 'Passed' };
  const recent = eligibility({ ...base, lastDonationDate: new Date(+now - 89.5 * 86400000) }, config, now);
  assert.equal(recent.isEligible, false); assert.equal(recent.daysRemaining, 1);
  assert.equal(eligibility({ ...base, lastDonationDate: new Date(+now + 86400000) }, config, now).isEligible, false);
  assert.equal(eligibility({ ...base, lastDonationDate: new Date(+now - 90 * 86400000) }, config, now).isEligible, true);
  assert.equal(eligibility({ dob: '2015-01-01', screeningStatus: 'Passed' }, config, now).isEligible, false);
});
test('demo seeding is repeatable and preserves existing records and balances', { timeout: 30000 }, async () => {
  const run = promisify(execFile);
  const options = { cwd: path.join(__dirname, '..'), env: { ...process.env, MONGO_URI: replica.getUri(), JWT_SECRET: config.jwtSecret, NODE_ENV: 'test', DEMO_PASSWORD: password } };
  const originalCoins = (await User.findById(donor._id)).coins;
  const originalRecords = await DonationRecord.countDocuments();
  await run(process.execPath, ['seed.js'], options);
  const count = await User.countDocuments();
  await run(process.execPath, ['seed.js'], options);
  assert.equal(await User.countDocuments(), count);
  assert.equal((await User.findById(donor._id)).coins, originalCoins);
  assert.equal(await DonationRecord.countDocuments(), originalRecords);
  const demo = await User.findOne({ email: 'donor@bloodlink.local' }).select('+password');
  assert.equal(demo.coins, 0); assert.notEqual(demo.password, password); assert.ok(await demo.comparePassword(password));
});
test('admin bootstrap hashes credentials and refuses to overwrite an existing account', { timeout: 15000 }, async () => {
  const run = promisify(execFile);
  const options = { cwd: path.join(__dirname, '..'), env: { ...process.env, MONGO_URI: replica.getUri(), JWT_SECRET: config.jwtSecret, NODE_ENV: 'test', ADMIN_EMAIL: 'bootstrap@example.com', ADMIN_PASSWORD: password } };
  await run(process.execPath, ['scripts/create-admin.js'], options);
  const created = await Admin.findOne({ email: 'bootstrap@example.com' }).select('+password');
  assert.notEqual(created.password, password); assert.ok(await created.comparePassword(password));
  await assert.rejects(run(process.execPath, ['scripts/create-admin.js'], options), /Admin already exists/);
});
