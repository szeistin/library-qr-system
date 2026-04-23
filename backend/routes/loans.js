const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");
const Book = require("../models/Book");
const Visitor = require("../models/Visitor");
const { generateToken } = require("../utils/helpers");
const { sendReminderEmail } = require("../utils/email");

// Create a pending loan (visitor request)
router.post("/borrow", async (req, res) => {
   try {
      const { visitorId, bookId, dueDate, phone, email } = req.body;
      const visitor = await Visitor.findById(visitorId);
      if (!visitor) return res.status(404).json({ error: "Visitor not found" });

      const book = await Book.findById(bookId);
      if (!book || book.available_copies < 1) {
         return res.status(400).json({ error: "Book not available" });
      }

      const borrow_qr_token = generateToken();
      const loan = new Loan({
         visitor: visitorId,
         book: bookId,
         due_date: new Date(dueDate),
         borrow_qr_token,
         phone,
         email,
         status: "pending", // wait for admin confirmation
      });
      await loan.save();

      res.json({
         loanId: loan._id,
         borrow_qr_token,
         qr_url: `/api/loans/qr/${borrow_qr_token}`,
      });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Confirm pending loan (admin scans borrow QR)
router.post("/confirm/:token", async (req, res) => {
   try {
      const { token } = req.params;
      const loan = await Loan.findOne({
         borrow_qr_token: token,
         status: "pending",
      });
      if (!loan)
         return res
            .status(404)
            .json({ error: "Loan not found or already confirmed" });

      loan.status = "borrowed";
      await loan.save();

      const book = await Book.findById(loan.book);
      book.available_copies -= 1;
      await book.save();

      res.json({ message: "Loan confirmed successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Return a book (with optional issues)
router.post("/return", async (req, res) => {
   try {
      const { borrow_qr_token, issues } = req.body;
      const loan = await Loan.findOne({ borrow_qr_token, status: "borrowed" });
      if (!loan)
         return res
            .status(404)
            .json({ error: "Loan not found or already returned" });

      loan.status = "returned";
      loan.return_date = new Date();
      loan.return_issues = issues || "";
      await loan.save();

      const book = await Book.findById(loan.book);
      book.available_copies += 1;
      await book.save();

      res.json({ message: "Book returned successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});
// POST /api/loans/not-returned/:token
// POST /api/loans/not-returned/:token
router.post("/not-returned/:token", async (req, res) => {
   try {
      const { token } = req.params;
      const loan = await Loan.findOne({
         borrow_qr_token: token,
         status: "borrowed",
      });
      if (!loan)
         return res
            .status(404)
            .json({ error: "Loan not found or already processed" });
      loan.status = "not_returned";
      loan.return_issues = "Not returned";
      await loan.save();
      // Do NOT increase book's available copies
      res.json({ message: "Book marked as not returned" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Get loan by QR token (for display)
router.get("/qr/:token", async (req, res) => {
   try {
      const loan = await Loan.findOne({ borrow_qr_token: req.params.token })
         .populate("visitor", "name")
         .populate("book", "title author");
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      res.json(loan);
   } catch (err) {
      res.status(500).json({ error: "Server error" });
   }
});

// Get all active loans (status = borrowed) for admin
router.get("/active", async (req, res) => {
   try {
      const loans = await Loan.find({ status: "borrowed" })
         .populate("visitor", "name")
         .populate("book", "title author");
      res.json(loans);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Get visitor's loan history (excludes pending)
router.get("/visitor/:visitorId", async (req, res) => {
   try {
      const loans = await Loan.find({
         visitor: req.params.visitorId,
         status: { $ne: "pending" },
      })
         .populate("book", "title author category")
         .sort({ borrow_date: -1 });
      res.json(loans);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Send due date reminder (simulated)
router.post("/:id/reminder", async (req, res) => {
   console.log("Reminder route hit, loan ID:", req.params.id);
   try {
      const loan = await Loan.findById(req.params.id).populate("book", "title");
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      if (loan.reminder_sent)
         return res.status(400).json({ error: "Reminder already sent" });

      const dueDateStr = new Date(loan.due_date).toLocaleDateString("en-PH");
      console.log(
         "Attempting to send email to:",
         loan.email,
         "for book:",
         loan.book.title,
      );
      await sendReminderEmail(loan.email, loan.book.title, dueDateStr);

      loan.reminder_sent = true;
      await loan.save();
      console.log("Email sent successfully");
      res.json({ message: "Reminder sent successfully" });
   } catch (err) {
      console.error("Error sending reminder:", err);
      res.status(500).json({ error: "Failed to send email: " + err.message });
   }
});

// GET /api/loans/returned-issues
router.get("/returned-issues", async (req, res) => {
   try {
      const loansWithIssues = await Loan.find({
         return_issues: { $ne: "", $exists: true },
         status: { $in: ["returned", "not_returned"] },
      }).populate("book", "title author");
      res.json(loansWithIssues);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});
module.exports = router;
