const mongoose = require("mongoose");
const LoanSchema = new mongoose.Schema({
   visitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visitor",
      required: true,
   },
   book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
   borrow_date: { type: Date, default: Date.now },
   due_date: { type: Date, required: true },
   return_date: Date,
   status: { type: String, default: "borrowed" },
   borrow_qr_token: { type: String, unique: true },
   phone: String,
   email: String,
   return_issues: { type: String, default: "" },
   status: { type: String, default: 'borrowed' }, // borrowed, returned, not_returned, pending
   reminder_sent: { type: Boolean, default: false },
});
module.exports = mongoose.model("Loan", LoanSchema);
