const mongoose = require('mongoose');

// Schema for Hospital/NGO Emergency SOS Alerts
const sosAlertSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalNGO',
      required: true
    },
    hospitalName: {
      type: String,
      required: true
    },
    targetBloodType: {
      type: String,
      required: true,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    requiredQuantity: {
      type: Number,
      required: true,
      default: 5
    },
    urgencyLevel: {
      type: String,
      enum: ['Critical (24h)', 'Urgent', 'Standard'],
      default: 'Critical (24h)'
    },
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
    status: {
      type: String,
      enum: ['Active', 'In Transit', 'Resolved'],
      default: 'Active'
    },
    resolvedBy: {
      type: String,
      default: 'NA'
    },
    resolvedDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

sosAlertSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
