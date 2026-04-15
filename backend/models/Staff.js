const mongoose = require('mongoose');
const StaffSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  position: String,
  pin_hash: { type: String, required: true },
}, { timestamps: true });
module.exports = mongoose.model('Staff', StaffSchema);