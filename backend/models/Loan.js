const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    borrow_date: { type: Date, default: Date.now },
    due_date: { type: Date, required: true },
    return_date: { type: Date, default: null },
    borrow_qr_token: { type: String, required: true, unique: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["borrowed", "returned", "not_returned", "overdue"],
      default: "borrowed",
    },
    return_issues: { type: String, default: "" },
    reminder_sent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);