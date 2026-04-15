const mongoose = require('mongoose');
const StaffLogSchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  login_time: { type: Date, default: Date.now },
  logout_time: Date,
});
module.exports = mongoose.model('StaffLog', StaffLogSchema);