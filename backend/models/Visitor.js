const mongoose = require('mongoose');

const VisitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  course: String,
  school_work: String,
  profession: String,
  phone: String,
  email: String,
  has_library_card: { type: Boolean, default: false },
  qr_token: { type: String, unique: true },
  reference_number: { type: String, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Visitor', VisitorSchema);