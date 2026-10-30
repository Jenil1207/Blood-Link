const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true, validate: {
    validator: c => c.length === 2 && c.every(Number.isFinite) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90,
    message: 'Invalid [longitude, latitude] coordinates'
  } }
}, { _id: false });
function accountPlugin(schema) {
  schema.add({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    isActive: { type: Boolean, default: true }
  });
  schema.pre('save', async function () {
    if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  });
  schema.methods.comparePassword = function (plain) { return bcrypt.compare(plain, this.password); };
  schema.set('toJSON', { transform: (_doc, ret) => { delete ret.password; delete ret.tokenVersion; delete ret.__v; return ret; } });
}
module.exports = { bloodTypes, pointSchema, accountPlugin };
