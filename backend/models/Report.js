const mongoose = require('mongoose');
const ReportSchema = new mongoose.Schema({
  month: Number,
  year: Number,
  data: mongoose.Schema.Types.Mixed,
});
module.exports = mongoose.model('Report', ReportSchema);