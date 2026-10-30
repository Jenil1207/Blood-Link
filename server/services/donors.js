const { eligibility } = require('../lib/eligibility');
const { fail, identifierQuery } = require('../lib/http');
const User = require('../models/User');
const clinicalFields = ['healthProblems', 'medicalHistory', 'knownAbnormalities', 'hemoglobin', 'bloodPressure', 'screeningStatus'];
async function findDonor(identifier, session) {
  const donor = await User.findOne(identifierQuery(identifier)).session(session || null);
  if (!donor || !donor.isActive) fail(404, 'Donor not found');
  return donor;
}
function donorView(donor, auth, config) {
  const data = donor.toJSON();
  const own = auth.type === 'donor' && String(auth.account._id) === String(donor._id);
  if (!own) {
    const allowed = ['_id', 'donorId', 'name', 'bloodType', 'totalDonations', 'badgesCount', 'lastDonationDate', 'verifyingInstitutions'];
    const result = Object.fromEntries(allowed.map(k => [k, data[k]]));
    if (auth.role === 'hospital' && donor.shareMedicalHistory) {
      for (const key of clinicalFields) result[key] = data[key];
    }
    result.medicalHistoryShared = auth.role === 'hospital' && donor.shareMedicalHistory;
    result.eligibility = eligibility(donor, config);
    return result;
  }
  return { ...data, eligibility: eligibility(donor, config) };
}
function donorAccess(req, donor) {
  if (req.auth.role === 'donor' && String(req.auth.account._id) !== String(donor._id)) fail(403, 'You may only access your own profile');
  if (!['donor', 'hospital', 'ngo'].includes(req.auth.role)) fail(403, 'Donor medical profiles are restricted to the donor and verified care organizations');
}
module.exports = { findDonor, donorView, donorAccess };
