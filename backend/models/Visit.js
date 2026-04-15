const mongoose = require('mongoose');
const VisitSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true },
  check_in_time: { type: Date, default: Date.now },
  check_out_time: Date,
  purpose: String,
  status: { type: String, default: 'active' },
});
module.exports = mongoose.model('Visit', VisitSchema);