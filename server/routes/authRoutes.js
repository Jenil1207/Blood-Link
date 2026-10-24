const express = require('express');
const router = express.Router();
const User = require('../models/User');
const HospitalNGO = require('../models/HospitalNGO');

// Register Normal Donor
router.post('/register-donor', async (req, res) => {
  try {
    const { name, email, password, bloodType, dob, address, healthProblems, latitude, longitude } = req.body;

    if (!name || !email || !password || !bloodType || !dob) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Default coordinates if not provided (Mumbai coordinates)
    const coords = [
      longitude ? parseFloat(longitude) : 72.8777,
      latitude ? parseFloat(latitude) : 19.0760
    ];

    const donor = new User({
      name,
      email,
      password, // In a beginner lab project, straightforward string or hash
      bloodType,
      dob,
      address: address || '',
      healthProblems: healthProblems || 'None',
      location: {
        type: 'Point',
        coordinates: coords
      }
    });

    await donor.save();

    res.status(201).json({
      message: 'Donor account registered successfully',
      user: donor
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register Hospital or NGO (requires Admin verification before login)
router.post('/register-hospital-ngo', async (req, res) => {
  try {
    const { name, email, password, role, registrationNumber, licenseInfo, address, latitude, longitude } = req.body;

    if (!name || !email || !password || !role || !registrationNumber || !address) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    if (!['hospital', 'ngo'].includes(role)) {
      return res.status(400).json({ error: 'Role must be either hospital or ngo' });
    }

    const existingOrg = await HospitalNGO.findOne({ email });
    if (existingOrg) {
      return res.status(400).json({ error: 'Institution with this email already exists' });
    }

    const coords = [
      longitude ? parseFloat(longitude) : 72.8777,
      latitude ? parseFloat(latitude) : 19.0760
    ];

    const org = new HospitalNGO({
      name,
      email,
      password,
      role,
      registrationNumber,
      licenseInfo: licenseInfo || '',
      address,
      location: {
        type: 'Point',
        coordinates: coords
      },
      isVerified: false // Needs admin approval
    });

    await org.save();

    res.status(201).json({
      message: 'Registration submitted successfully! Your account will be activated once verified by system admin.',
      organization: org
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login for Donor or Hospital/NGO
router.post('/login', async (req, res) => {
  try {
    const { email, password, accountType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (accountType === 'hospital-ngo') {
      const org = await HospitalNGO.findOne({ email, password });
      if (!org) {
        return res.status(401).json({ error: 'Invalid hospital/NGO credentials' });
      }

      if (!org.isVerified) {
        return res.status(403).json({
          error: 'Your institution account has not been approved by the Admin yet. Please wait for verification.'
        });
      }

      return res.json({
        message: 'Login successful',
        userType: 'organization',
        role: org.role,
        data: org
      });
    }

    // Default: Donor Account
    const donor = await User.findOne({ email, password });
    if (!donor) {
      return res.status(401).json({ error: 'Invalid donor email or password' });
    }

    return res.json({
      message: 'Login successful',
      userType: 'donor',
      role: 'donor',
      data: donor
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
