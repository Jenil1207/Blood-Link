const express = require('express');
const router = express.Router();
const HospitalNGO = require('../models/HospitalNGO');
const User = require('../models/User');

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Get Hospital / NGO info & current depot stock levels
router.get('/:id', async (req, res) => {
  try {
    const org = await HospitalNGO.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Inventory stock
router.put('/:id/inventory', async (req, res) => {
  try {
    const { inventory } = req.body;
    const org = await HospitalNGO.findByIdAndUpdate(
      req.params.id,
      { inventory },
      { new: true }
    );
    res.json(org);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search Donors by Donor BL-ID (Filters removed as per user instruction)
router.get('/donors/search', async (req, res) => {
  try {
    const { donorId, hospitalLat, hospitalLng } = req.query;

    const query = {};
    if (donorId && donorId.trim() !== '') {
      // Regex match on donorId or name
      query.$or = [
        { donorId: { $regex: donorId.trim(), $options: 'i' } },
        { name: { $regex: donorId.trim(), $options: 'i' } }
      ];
    }

    const donors = await User.find(query).limit(10).lean();

    const hLat = hospitalLat ? parseFloat(hospitalLat) : 19.0760;
    const hLng = hospitalLng ? parseFloat(hospitalLng) : 72.8777;

    const formattedDonors = donors.map((d) => {
      const dLng = d.location?.coordinates?.[0] || 72.8777;
      const dLat = d.location?.coordinates?.[1] || 19.0760;
      const dist = calculateDistanceKm(hLat, hLng, dLat, dLng);

      // Check 90 day eligibility
      const last = d.lastDonationDate ? new Date(d.lastDonationDate) : null;
      const diffDays = last ? Math.ceil(Math.abs(new Date() - last) / (1000 * 60 * 60 * 24)) : 999;
      const isEligibleNow = diffDays >= 90;

      return {
        _id: d._id,
        donorId: d.donorId,
        name: d.name,
        bloodType: d.bloodType,
        totalDonations: d.totalDonations,
        badgesCount: d.badgesCount,
        distanceKm: dist,
        isEligible: isEligibleNow,
        eligibilityStatus: isEligibleNow ? 'Eligible Now' : `${90 - diffDays} Days Left`,
        lastDonationDate: d.lastDonationDate,
        screeningStatus: d.screeningStatus,
        hemoglobin: d.hemoglobin,
        bloodPressure: d.bloodPressure
      };
    });

    res.json(formattedDonors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
