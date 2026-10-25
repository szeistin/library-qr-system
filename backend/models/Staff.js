const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  position: { type: String, required: true },
  pin_hash: { type: String, required: true }, // ✅ Must match your database field exactly
}, { collection: "staffs" });

module.exports = mongoose.model("Staff", staffSchema);