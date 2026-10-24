const express = require('express');
const router = express.Router();
const HospitalNGO = require('../models/HospitalNGO');

// Get all pending and scam-reported organizations for admin dashboard
router.get('/organizations', async (req, res) => {
  try {
    const orgs = await HospitalNGO.find().sort({ createdAt: -1 });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve / Verify Hospital or NGO
router.put('/verify/:id', async (req, res) => {
  try {
    const org = await HospitalNGO.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ message: `${org.name} has been verified and approved successfully!`, org });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Report Organization as Scam
router.put('/report-scam/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    const org = await HospitalNGO.findByIdAndUpdate(
      req.params.id,
      { isScamReported: true, scamReportReason: reason || 'Reported for suspicious activity' },
      { new: true }
    );
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json({ message: 'Account marked as reported scam', org });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an account (e.g. reported scams or unauthorized orgs)
router.delete('/org/:id', async (req, res) => {
  try {
    const deleted = await HospitalNGO.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Organization not found' });
    res.json({ message: `Successfully deleted organization: ${deleted.name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
