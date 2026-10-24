const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Helper to calculate eligibility
function checkEligibility(lastDonationDate) {
  if (!lastDonationDate) return { isEligible: true, daysRemaining: 0, statusText: 'Eligible Now' };
  
  const now = new Date();
  const last = new Date(lastDonationDate);
  const diffTime = Math.abs(now - last);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Blood donation eligibility threshold: 90 days (standard)
  if (diffDays >= 90) {
    return { isEligible: true, daysRemaining: 0, statusText: 'Eligible Now' };
  } else {
    const daysRemaining = 90 - diffDays;
    return { isEligible: false, daysRemaining, statusText: `${daysRemaining} Days Left` };
  }
}

// Get Donor Profile by ID or Donor BL-ID
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let donor;

    if (identifier.startsWith('BL-')) {
      donor = await User.findOne({ donorId: identifier });
    } else {
      donor = await User.findById(identifier);
    }

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    const eligibility = checkEligibility(donor.lastDonationDate);

    res.json({
      ...donor.toObject(),
      eligibility
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Donor Profile
router.put('/:id', async (req, res) => {
  try {
    const { name, address, healthProblems, bloodPressure, hemoglobin } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { name, address, healthProblems, bloodPressure, hemoglobin },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
