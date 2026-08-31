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

      // 1. Block if visitor has ANY active, unreturned, lost, or pending books by Email or Phone
      const existingActiveLoan = await Loan.findOne({
         $or: [
            { email: email?.trim().toLowerCase() },
            { phone: phone?.trim() }
         ],
         status: { $in: ["borrowed", "overdue", "not_returned", "pending"] }
      }).populate("book");

      if (existingActiveLoan) {
         const bookTitle = existingActiveLoan.book?.title || "a previously borrowed book";
         return res.status(400).json({
            error: `Borrowing blocked! You currently have an active or unreturned book ("${bookTitle}"). Please return it before requesting another.`
         });
      }

      // 2. Check book availability
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
         phone: phone?.trim(),
         email: email?.trim().toLowerCase(),
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

// POST /loans (Create new borrowing record directly by Admin)
router.post("/loans", async (req, res) => {
  try {
    const { visitor, email, phone, book_id } = req.body;

    // 1. Check if the borrower has ANY active, unreturned, or lost books by Email or Phone
    const existingActiveLoan = await Loan.findOne({
      $or: [
        { email: email?.trim().toLowerCase() },
        { phone: phone?.trim() }
      ],
      status: { $in: ["borrowed", "overdue", "not_returned", "pending"] }
    }).populate("book");

    // 2. Block borrowing if an unreturned book exists
    if (existingActiveLoan) {
      const bookTitle = existingActiveLoan.book?.title || "a previously borrowed book";
      return res.status(400).json({
        error: `Borrowing blocked! You currently have an unreturned book ("${bookTitle}"). Please return it before checking out another book.`
      });
    }

    // 3. Check book availability
    const book = await Book.findById(book_id);
    if (!book || book.available_copies <= 0) {
      return res.status(400).json({ error: "Book is currently out of stock." });
    }

    // 4. Create new loan record
    const newLoan = new Loan({
      visitor,
      email: email?.trim().toLowerCase(),
      phone: phone?.trim(),
      book: book_id,
      status: "borrowed",
      borrow_date: new Date(),
      due_date: req.body.due_date
    });

    // 5. Deduct 1 available copy from the book
    book.available_copies -= 1;
    await book.save();
    await newLoan.save();

    res.status(201).json({ message: "Book borrowed successfully!", loan: newLoan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process loan request." });
  }
});

// Confirm pending loan (Admin confirmation)
router.post("/confirm/:token", async (req, res) => {
   try {
      const { token } = req.params;
      const loan = await Loan.findOne({ borrow_qr_token: token, status: "pending" });
      if (!loan) return res.status(404).json({ error: "Loan not found or already confirmed" });

      loan.status = "borrowed";
      await loan.save();

      // Recalculate available copies based on active loans
      const activeCount = await Loan.countDocuments({ book: loan.book, status: "borrowed" });
      const book = await Book.findById(loan.book);
      if (book) {
         book.available_copies = Math.max(0, book.total_copies - activeCount);
         await book.save();
      }

      res.json({ message: "Borrowed successfully" });
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
      if (!loan) return res.status(404).json({ error: "Loan not found or already returned" });

      loan.status = "returned";
      loan.return_date = new Date();
      loan.return_issues = issues || "";
      await loan.save();

      // Recalculate available copies
      const activeCount = await Loan.countDocuments({ book: loan.book, status: "borrowed" });
      const book = await Book.findById(loan.book);
      if (book) {
         book.available_copies = Math.max(0, book.total_copies - activeCount);
         await book.save();
      }

      res.json({ message: "Book returned successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Mark as not returned (book is lost or physically unreturned)
router.post("/not-returned/:token", async (req, res) => {
   try {
      const { token } = req.params;
      const loan = await Loan.findOne({ borrow_qr_token: token, status: "borrowed" });
      if (!loan) return res.status(404).json({ error: "Loan not found" });

      loan.status = "not_returned";
      loan.return_issues = "Not returned";
      await loan.save();

      res.json({ message: "Book marked as not returned" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// Get loan by QR token
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

// Get all active loans (status = borrowed)
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

// Send due date reminder
router.post("/:id/reminder", async (req, res) => {
   console.log("Reminder route hit, loan ID:", req.params.id);
   try {
      const loan = await Loan.findById(req.params.id).populate("book", "title");
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      if (loan.reminder_sent)
         return res.status(400).json({ error: "Reminder already sent" });

      const dueDateStr = new Date(loan.due_date).toLocaleDateString("en-PH");
      await sendReminderEmail(loan.email, loan.book.title, dueDateStr);

      loan.reminder_sent = true;
      await loan.save();
      res.json({ message: "Reminder sent successfully" });
   } catch (err) {
      console.error("Error sending reminder:", err);
      res.status(500).json({ error: "Failed to send email: " + err.message });
   }
});

// GET /api/loans/returned-issues
router.get("/returned-issues", async (req, res) => {
   try {
      const { month, year } = req.query;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const loansWithIssues = await Loan.find({
         return_issues: { $ne: "", $exists: true },
         return_date: { $gte: startDate, $lte: endDate },
      }).populate("book", "title author");
      res.json(loansWithIssues);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// GET /api/loans/history
router.get("/history", async (req, res) => {
   try {
      const loans = await Loan.find({ status: { $ne: "borrowed" } })
         .populate("visitor", "name")
         .populate("book", "title author")
         .sort({ return_date: -1, borrow_date: -1 });
      res.json(loans);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// POST /api/loans/retrieve/:id
router.post("/retrieve/:id", async (req, res) => {
   try {
      const loan = await Loan.findById(req.params.id);
      if (!loan) return res.status(404).json({ error: "Loan not found" });
      if (loan.status === "borrowed") return res.status(400).json({ error: "Already active" });

      loan.status = "borrowed";
      loan.return_date = null;
      loan.return_issues = "";
      await loan.save();

      const activeCount = await Loan.countDocuments({ book: loan.book, status: "borrowed" });
      const book = await Book.findById(loan.book);
      if (book) {
         book.available_copies = Math.max(0, book.total_copies - activeCount);
         await book.save();
      }

      res.json({ message: "Loan retrieved back to active", loan });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// GET /api/loans/book-status-summary
router.get("/book-status-summary", async (req, res) => {
   try {
      const { month, year } = req.query;

      if (!month || !year) {
         return res.status(400).json({ error: "Month and year are required" });
      }

      const m = Number(month);
      const y = Number(year);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);

      const summary = await Loan.aggregate([
         {
            $match: {
               status: { $ne: "pending" },
               $or: [
                  { borrow_date: { $gte: startDate, $lte: endDate } },
                  { return_date: { $gte: startDate, $lte: endDate } }
               ]
            },
         },
         {
            $lookup: {
               from: "books",
               localField: "book",
               foreignField: "_id",
               as: "bookInfo",
            },
         },
         { $unwind: "$bookInfo" },
         {
            $group: {
               _id: "$bookInfo._id",
               title: { $first: "$bookInfo.title" },
               author: { $first: "$bookInfo.author" },
               borrowed: {
                  $sum: { $cond: [{ $eq: ["$status", "borrowed"] }, 1, 0] },
               },
               returned: {
                  $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] },
               },
               unreturned: {
                  $sum: { $cond: [{ $eq: ["$status", "not_returned"] }, 1, 0] },
               },
            },
         },
         { $sort: { title: 1 } },
      ]);

      res.json(summary);
   } catch (err) {
      console.error("Error fetching circulation summary:", err);
      res.status(500).json({ error: "Server error" });
   }
});

module.exports = router;