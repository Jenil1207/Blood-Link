const mongoose = require('mongoose');

// Schema for Donor Patient Records & Donation Logs
const donationRecordSchema = new mongoose.Schema(
  {
    donorBLId: {
      type: String,
      required: true,
      trim: true
    },
    donorName: {
      type: String,
      required: true
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalNGO'
    },
    facilityName: {
      type: String,
      required: true
    },
    facilityType: {
      type: String,
      enum: ['hospital', 'ngo'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    dateString: {
      type: String
    },
    bloodTypeCollected: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    donationType: {
      type: String,
      enum: ['Whole Blood', 'Plasma', 'Platelets', 'Event Attendance Only'],
      default: 'Whole Blood'
    },
    quantityMl: {
      type: Number,
      default: 450
    },
    collectionCenter: {
      type: String,
      default: ''
    },
    attendingStaff: {
      type: String,
      default: 'Dr. XYZ'
    },
    hemoglobin: {
      type: Number,
      default: 14.5
    },
    bloodPressure: {
      type: String,
      default: '122/82'
    },
    screeningStatus: {
      type: String,
      enum: ['Passed', 'Deferred'],
      default: 'Passed'
    },
    // Toggle options matching the update donor records PDF
    isDonation: {
      type: Boolean,
      default: true
    },
    isCampAttendance: {
      type: Boolean,
      default: false
    },
    // Note: ONLY Hospitals can set isEndorsement to true. NGOs CANNOT.
    isEndorsement: {
      type: Boolean,
      default: false
    },
    coinsAwarded: {
      type: Number,
      default: 100 // 100 for donation, 50 for camp attendance, 75 for endorsement
    },
    status: {
      type: String,
      default: 'Verified'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DonationRecord', donationRecordSchema);
