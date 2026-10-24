const mongoose = require('mongoose');

// Schema for Blood Donation Camps organized by NGOs or Hospitals
const campSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalNGO',
      required: true
    },
    organizerName: {
      type: String,
      required: true
    },
    organizerRole: {
      type: String,
      enum: ['hospital', 'ngo'],
      default: 'ngo'
    },
    date: {
      type: Date,
      required: true
    },
    timeString: {
      type: String,
      default: 'Saturday, 09:00 AM'
    },
    address: {
      type: String,
      required: true
    },
    // GeoJSON Point location - NGOs add dynamic location for each camp
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
    demands: {
      type: [String], // e.g. ['O+', 'A+'] or ['All']
      default: ['All']
    },
    registeredDonors: [
      {
        donorId: String,
        name: String,
        timeSlot: String,
        registeredAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

campSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Camp', campSchema);
