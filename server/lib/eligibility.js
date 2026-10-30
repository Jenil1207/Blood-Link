const DAY = 86400000;
// These are configurable lab scheduling rules, never medical clearance.
function eligibility(donor, config, now = new Date()) {
  const dob = new Date(donor.dob);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate())) age--;
  const nextEligibleDate = donor.lastDonationDate ? new Date(+new Date(donor.lastDonationDate) + config.donationIntervalDays * DAY) : null;
  const daysRemaining = nextEligibleDate ? Math.max(0, Math.ceil((nextEligibleDate - now) / DAY)) : 0;
  const reasons = [];
  if (age < 18 || age > 65) reasons.push('Outside the lab scheduling age range (18-65)');
  if (daysRemaining) reasons.push(`${daysRemaining} Days Left`);
  const scheduleEligible = reasons.length === 0;
  if (donor.screeningStatus !== 'Passed') reasons.push('Clinical screening required');
  return {
    isEligible: reasons.length === 0, scheduleEligible, daysRemaining, nextEligibleDate,
    requiresScreening: donor.screeningStatus !== 'Passed',
    statusText: reasons.length ? reasons.join('; ') : 'Eligible for scheduling; clinical screening still required before donation',
    reasons
  };
}
function canVolunteer(donor, config) {
  return donor.isActive && donor.availableForSOS && donor.screeningStatus !== 'Deferred' && eligibility(donor, config).scheduleEligible;
}
module.exports = { eligibility, canVolunteer };
