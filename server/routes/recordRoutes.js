const express = require('express');
const router = express.Router();
const DonationRecord = require('../models/DonationRecord');
const User = require('../models/User');
const HospitalNGO = require('../models/HospitalNGO');

// Get all donation records for a specific Donor BL-ID
router.get('/donor/:donorBLId', async (req, res) => {
  try {
    const { donorBLId } = req.params;
    const records = await DonationRecord.find({ donorBLId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new Donation / Attendance / Endorsement Record (by Hospital or NGO)
router.post('/', async (req, res) => {
  try {
    const {
      donorBLId,
      facilityId,
      facilityName,
      facilityType,
      dateString,
      bloodTypeCollected,
      quantityMl,
      collectionCenter,
      donationType,
      attendingStaff,
      screeningStatus,
      hemoglobin,
      bloodPressure,
      isDonation,
      isCampAttendance,
      isEndorsement
    } = req.body;

    if (!donorBLId) {
      return res.status(400).json({ error: 'Donor BL-ID is required' });
    }

    const donor = await User.findOne({ donorId: donorBLId });
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found with ID: ' + donorBLId });
    }

    // STRICT CHECK: ONLY Hospitals can endorse. NGOs CANNOT endorse!
    const canEndorse = facilityType === 'hospital' && Boolean(isEndorsement);

    // Calculate coins: 100 for donation, 50 for attendance, 75 for endorsement
    let coinsEarned = 0;
    if (isDonation) coinsEarned += 100;
    if (isCampAttendance) coinsEarned += 50;
    if (canEndorse) coinsEarned += 75;

    // Create record
    const record = new DonationRecord({
      donorBLId,
      donorName: donor.name,
      facilityId,
      facilityName: facilityName || (facilityType === 'hospital' ? 'XYZ Hospital' : 'Community NGO'),
      facilityType: facilityType || 'hospital',
      date: new Date(),
      dateString: dateString || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      bloodTypeCollected: bloodTypeCollected || donor.bloodType,
      quantityMl: quantityMl ? parseInt(quantityMl) : 450,
      collectionCenter: collectionCenter || facilityName,
      donationType: donationType || 'Whole Blood',
      attendingStaff: attendingStaff || 'Dr. XYZ',
      screeningStatus: screeningStatus || 'Passed',
      hemoglobin: hemoglobin ? parseFloat(hemoglobin) : donor.hemoglobin,
      bloodPressure: bloodPressure || donor.bloodPressure,
      isDonation: Boolean(isDonation),
      isCampAttendance: Boolean(isCampAttendance),
      isEndorsement: canEndorse,
      coinsAwarded: coinsEarned,
      status: 'Verified'
    });

    await record.save();

    // Update Donor Stats
    donor.coins += coinsEarned;
    if (isDonation) {
      donor.totalDonations += 1;
      donor.lastDonationDate = new Date();
    }
    if (canEndorse) {
      donor.badgesCount += 1;
      if (facilityName && !donor.verifyingInstitutions.includes(facilityName)) {
        donor.verifyingInstitutions.push(facilityName);
      }
    }
    if (hemoglobin) donor.hemoglobin = parseFloat(hemoglobin);
    if (bloodPressure) donor.bloodPressure = bloodPressure;
    if (screeningStatus) donor.screeningStatus = screeningStatus;

    await donor.save();

    // If blood donation was made and facility is hospital, update hospital inventory
    if (isDonation && facilityId && bloodTypeCollected) {
      const org = await HospitalNGO.findById(facilityId);
      if (org && org.inventory) {
        const currentQty = org.inventory[bloodTypeCollected] || 0;
        org.inventory[bloodTypeCollected] = currentQty + 1;
        await org.save();
      }
    }

    res.status(201).json({
      message: 'Record successfully added and verified!',
      record,
      donorCoins: donor.coins
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
