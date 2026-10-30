const mongoose = require('mongoose');
const { accountPlugin } = require('./shared');
const schema = new mongoose.Schema({ name: { type: String, required: true } }, { timestamps: true });
schema.plugin(accountPlugin);
module.exports = mongoose.model('Admin', schema);
