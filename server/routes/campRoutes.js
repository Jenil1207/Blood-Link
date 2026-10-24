const express = require('express');
const router = express.Router();
const Camp = require('../models/Camp');

// Helper function to calculate distance using Haversine formula (km)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
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

// Get nearby camps with Geo filtering and criteria
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radiusKm, bloodType } = req.query;

    const userLat = lat ? parseFloat(lat) : 19.0760;
    const userLng = lng ? parseFloat(lng) : 72.8777;
    const maxDistMeters = radiusKm ? parseFloat(radiusKm) * 1000 : 50000; // default 50km

    let query = {};

    // MongoDB Geospatial query using 2dsphere $nearSphere
    if (lat && lng) {
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat]
          },
          $maxDistance: maxDistMeters
        }
      };
    }

    if (bloodType && bloodType !== 'All') {
      query.demands = { $in: [bloodType, 'All', 'All Types Accepted'] };
    }

    let camps = await Camp.find(query).lean();

    // If $nearSphere wasn't used or to guarantee distance field
    const campsWithDistance = camps.map((camp) => {
      const campLng = camp.location.coordinates[0];
      const campLat = camp.location.coordinates[1];
      const dist = calculateDistanceKm(userLat, userLng, campLat, campLng);
      return {
        ...camp,
        distanceKm: dist
      };
    });

    // Sort by distance ascending
    campsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(campsWithDistance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new camp (NGOs can specify their variable camp location)
router.post('/', async (req, res) => {
  try {
    const {
      title,
      organizerId,
      organizerName,
      organizerRole,
      date,
      timeString,
      address,
      latitude,
      longitude,
      demands
    } = req.body;

    if (!title || !organizerId || !address || !latitude || !longitude) {
      return res.status(400).json({ error: 'Please provide all required camp details' });
    }

    const newCamp = new Camp({
      title,
      organizerId,
      organizerName: organizerName || 'Registered NGO',
      organizerRole: organizerRole || 'ngo',
      date: date || new Date(),
      timeString: timeString || 'Saturday, 09:00 AM',
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      demands: demands || ['All Types Accepted']
    });

    await newCamp.save();

    res.status(201).json({
      message: 'Donation camp created successfully',
      camp: newCamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register a Donor for a time slot at a camp
router.post('/:id/register', async (req, res) => {
  try {
    const { donorId, name, timeSlot } = req.body;
    const camp = await Camp.findById(req.params.id);

    if (!camp) {
      return res.status(404).json({ error: 'Camp not found' });
    }

    // Add registration
    camp.registeredDonors.push({
      donorId,
      name,
      timeSlot: timeSlot || '10:00 AM - 11:00 AM'
    });

    await camp.save();

    res.json({
      message: 'Successfully registered for camp time slot!',
      camp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
