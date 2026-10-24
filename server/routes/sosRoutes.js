const express = require('express');
const router = express.Router();
const SOSAlert = require('../models/SOSAlert');
const HospitalNGO = require('../models/HospitalNGO');

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

// Get Active SOS Alerts (nearby)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = lat ? parseFloat(lat) : 19.0760;
    const userLng = lng ? parseFloat(lng) : 72.8777;

    const alerts = await SOSAlert.find().sort({ createdAt: -1 }).lean();

    const withDist = alerts.map((alert) => {
      const aLng = alert.location.coordinates[0];
      const aLat = alert.location.coordinates[1];
      const dist = calculateDistanceKm(userLat, userLng, aLat, aLng);
      return {
        ...alert,
        distanceKm: dist
      };
    });

    res.json(withDist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger a new SOS alert (by Hospital/NGO)
router.post('/', async (req, res) => {
  try {
    const { hospitalId, hospitalName, targetBloodType, requiredQuantity, urgencyLevel, latitude, longitude } = req.body;

    if (!hospitalId || !targetBloodType || !requiredQuantity) {
      return res.status(400).json({ error: 'Please provide hospital details and target blood type' });
    }

    const coords = [
      longitude ? parseFloat(longitude) : 72.8777,
      latitude ? parseFloat(latitude) : 19.0760
    ];

    const alert = new SOSAlert({
      hospitalId,
      hospitalName: hospitalName || 'General Hospital',
      targetBloodType,
      requiredQuantity: parseInt(requiredQuantity),
      urgencyLevel: urgencyLevel || 'Critical (24h)',
      location: {
        type: 'Point',
        coordinates: coords
      },
      status: 'Active'
    });

    await alert.save();

    res.status(201).json({
      message: 'SOS Broadcast triggered successfully!',
      alert
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept SOS (updates status to 'In Transit')
router.put('/:id/accept', async (req, res) => {
  try {
    const alert = await SOSAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'In Transit' },
      { new: true }
    );
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fulfill / Resolve SOS (by another hospital or institution)
router.put('/:id/fulfill', async (req, res) => {
  try {
    const { resolvedBy } = req.body;
    const alert = await SOSAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Resolved',
        resolvedBy: resolvedBy || 'Nearby Partner Hospital',
        resolvedDate: new Date()
      },
      { new: true }
    );
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nearby Hospital Stock Matches (shows nearby hospitals with surplus stock for deficient types)
router.get('/stock-matches/:hospitalId', async (req, res) => {
  try {
    const currentHospital = await HospitalNGO.findById(req.params.hospitalId);
    if (!currentHospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    const hospLat = currentHospital.location.coordinates[1];
    const hospLng = currentHospital.location.coordinates[0];

    // Find other verified hospitals
    const otherHospitals = await HospitalNGO.find({
      _id: { $ne: currentHospital._id },
      isVerified: true
    }).lean();

    const matches = otherHospitals.map((hosp) => {
      const dist = calculateDistanceKm(
        hospLat,
        hospLng,
        hosp.location.coordinates[1],
        hosp.location.coordinates[0]
      );

      // Check which types have surplus (>10 bags)
      const surplusItems = [];
      for (const [type, count] of Object.entries(hosp.inventory || {})) {
        if (count >= 10) {
          surplusItems.push({ type, count });
        }
      }

      return {
        hospitalId: hosp._id,
        name: hosp.name,
        address: hosp.address,
        distanceKm: dist,
        inventory: hosp.inventory,
        surplus: surplusItems
      };
    });

    matches.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
