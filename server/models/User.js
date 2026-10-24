const mongoose = require('mongoose');

// Schema for Normal Donor Users
const userSchema = new mongoose.Schema(
  {
    donorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: () => 'BL-2024-' + Math.floor(10000 + Math.random() * 90000)
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    bloodType: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    dob: {
      type: Date,
      required: true
    },
    address: {
      type: String,
      default: ''
    },
    healthProblems: {
      type: String,
      default: 'None'
    },
    // MongoDB GeoJSON Point for geospatial queries (nearby camps, SOS)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [72.8777, 19.0760] // Default Mumbai coordinates
      }
    },
    coins: {
      type: Number,
      default: 450
    },
    totalDonations: {
      type: Number,
      default: 8
    },
    badgesCount: {
      type: Number,
      default: 3
    },
    lastDonationDate: {
      type: Date,
      default: () => new Date(Date.now() - 95 * 24 * 60 * 60 * 1000) // ~3 months ago so eligible by default
    },
    hemoglobin: {
      type: Number,
      default: 14.2
    },
    bloodPressure: {
      type: String,
      default: '118/78'
    },
    screeningStatus: {
      type: String,
      enum: ['Passed', 'Deferred', 'Pending'],
      default: 'Passed'
    },
    verifyingInstitutions: {
      type: [String],
      default: ['XYZ Hospital', 'XYZ Blood Bank & Clinics']
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for MongoDB geospatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
