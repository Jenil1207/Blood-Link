const mongoose = require('mongoose');

// Schema for Hospitals and NGOs
const hospitalNGOSchema = new mongoose.Schema(
  {
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
    role: {
      type: String,
      required: true,
      enum: ['hospital', 'ngo']
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true
    },
    licenseInfo: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      required: true
    },
    // GeoJSON Point location for distance calculation & MongoDB geospatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    // Verification by Admin before being active
    isVerified: {
      type: Boolean,
      default: false
    },
    // Report scam flag - Admin can review and delete
    isScamReported: {
      type: Boolean,
      default: false
    },
    scamReportReason: {
      type: String,
      default: ''
    },
    // Blood inventory bags count
    inventory: {
      'O+': { type: Number, default: 24 },
      'O-': { type: Number, default: 3 },
      'A+': { type: Number, default: 14 },
      'A-': { type: Number, default: 6 },
      'B+': { type: Number, default: 18 },
      'B-': { type: Number, default: 4 },
      'AB+': { type: Number, default: 9 },
      'AB-': { type: Number, default: 1 }
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for MongoDB geospatial queries
hospitalNGOSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('HospitalNGO', hospitalNGOSchema);
