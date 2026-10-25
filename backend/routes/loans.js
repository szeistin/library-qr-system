const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");
const Book = require("../models/Book");
const Visitor = require("../models/Visitor");
const { generateToken } = require("../utils/helpers");
const { sendReminderEmail } = require("../utils/email");

// TEMPORARY MEMORY CACHE (pending borrows are not saved in the database)
const pendingBorrows = new Map();

// Auto-clean memory every 15 minutes so it doesn't leak
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pendingBorrows.entries()) {
    if (now > data.expiresAt) pendingBorrows.delete(token);
  }
}, 15 * 60 * 1000);

// Lift the visitor's block once they have no more "not_returned" loans
async function unblockVisitorIfClear(visitorId) {
  if (!visitorId) return;
  const remaining = await Loan.countDocuments({
    visitor: visitorId,
    status: "not_returned",
  });
  if (remaining === 0) {
    await Visitor.updateOne(
      { _id: visitorId, status: "blocked" },
      { status: "active", is_suspended: false }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST /borrow — Mobile app generates one SHORT token per book (NO DB SAVE)
// Accepts either bookId (single) or bookIds (array, up to 3)
// ─────────────────────────────────────────────────────────────
router.post("/borrow", async (req, res) => {
  try {
    const { visitorId, bookId, bookIds, dueDate, phone, email } = req.body;

    const rawIds =
      Array.isArray(bookIds) && bookIds.length > 0
        ? bookIds
        : bookId
          ? [bookId]
          : [];
    const ids = [...new Set(rawIds.map(String))];

    if (!visitorId || ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Visitor and at least one book are required" });
    }
    if (ids.length > 3) {
      return res.status(400).json({ error: "You can borrow up to 3 books only" });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) return res.status(404).json({ error: "Visitor not found" });

    // Block if the visitor already has an active or unreturned book
    const existingActiveLoan = await Loan.findOne({
      $and: [
        {
          $or: [
            { visitor: visitorId },
            { email: email?.trim().toLowerCase() },
            { phone: phone?.trim() },
          ],
        },
        { status: { $in: ["borrowed", "overdue", "not_returned"] } },
      ],
    }).populate("book");

    if (existingActiveLoan) {
      return res.status(400).json({
        error: `Borrowing blocked! You have an unreturned book ("${
          existingActiveLoan.book?.title || "a previously borrowed book"
        }"). Please return it first.`,
      });
    }

    // Check that ALL selected books are available before creating any token
    const books = await Book.find({ _id: { $in: ids } });
    if (books.length !== ids.length || books.some((b) => b.available_copies < 1)) {
      return res
        .status(400)
        .json({ error: "One or more books are not available" });
    }

    // One short token per book, stored in temporary memory for 15 minutes
    const tokens = ids.map((id) => {
      const token = generateToken();
      pendingBorrows.set(token, {
        visitorId,
        bookId: id,
        dueDate,
        phone,
        email,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });
      return token;
    });

    res.json({
      loanId: null,
      borrow_qr_tokens: tokens,
      borrow_qr_token: tokens[0], // kept for older code
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /confirm/:token — Admin scans QR (CREATES THE DB RECORD)
// ─────────────────────────────────────────────────────────────
router.post("/confirm/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const pendingData = pendingBorrows.get(token);
    if (!pendingData) {
      // 410 so the admin page shows the "QR expired" message
      return res.status(410).json({ error: "QR code has expired or is invalid." });
    }
    if (Date.now() > pendingData.expiresAt) {
      pendingBorrows.delete(token);
      return res.status(410).json({ error: "QR code has expired." });
    }

    const { visitorId, bookId, dueDate, phone, email } = pendingData;

    // Do not confirm for a visitor who has a not-returned book
    const blockedLoan = await Loan.findOne({
      visitor: visitorId,
      status: "not_returned",
    });
    if (blockedLoan) {
      return res
        .status(400)
        .json({ error: "This visitor has an unreturned book and is restricted." });
    }

    const book = await Book.findById(bookId);
    if (!book || book.available_copies < 1) {
      return res.status(400).json({ error: "Book just became unavailable." });
    }

    const loan = new Loan({
      visitor: visitorId,
      book: bookId,
      borrow_date: new Date(),
      due_date: new Date(dueDate),
      borrow_qr_token: token,
      phone: phone?.trim(),
      email: email?.trim().toLowerCase(),
      status: "borrowed",
    });
    await loan.save();

    book.available_copies -= 1;
    await book.save();

    pendingBorrows.delete(token);

    res.json({ message: "Borrowed successfully", loanId: loan._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /loans — admin creates loan directly
// ─────────────────────────────────────────────────────────────
router.post("/loans", async (req, res) => {
  try {
    const { visitor, email, phone, book_id } = req.body;

    const existingActiveLoan = await Loan.findOne({
      $and: [
        { $or: [{ email: email?.trim().toLowerCase() }, { phone: phone?.trim() }] },
        { status: { $in: ["borrowed", "overdue", "not_returned"] } },
      ],
    }).populate("book");

    if (existingActiveLoan) {
      return res
        .status(400)
        .json({ error: `Borrowing blocked! Visitor has an unreturned book.` });
    }

    const book = await Book.findById(book_id);
    if (!book || book.available_copies <= 0) {
      return res.status(400).json({ error: "Book is out of stock." });
    }

    const newLoan = new Loan({
      visitor,
      email: email?.trim().toLowerCase(),
      phone: phone?.trim(),
      book: book_id,
      status: "borrowed",
      borrow_date: new Date(),
      due_date: req.body.due_date,
      borrow_qr_token: generateToken(),
    });

    book.available_copies -= 1;
    await book.save();
    await newLoan.save();

    res.status(201).json({ message: "Book borrowed successfully!", loan: newLoan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process loan request." });
  }
});

// ─────────────────────────────────────────────────────────────
// Return a book (with optional issues)
// ─────────────────────────────────────────────────────────────
router.post("/return", async (req, res) => {
  try {
    const { borrow_qr_token, loan_id, issues } = req.body;
    const query = loan_id
      ? { _id: loan_id, status: "borrowed" }
      : { borrow_qr_token, status: "borrowed" };
    const loan = await Loan.findOne(query);

    if (!loan) {
      return res.status(404).json({ error: "Loan not found or already returned" });
    }

    loan.status = "returned";
    loan.return_date = new Date();
    loan.return_issues = issues || "";
    await loan.save();

    const activeCount = await Loan.countDocuments({
      book: loan.book,
      status: "borrowed",
    });
    const book = await Book.findById(loan.book);
    if (book) {
      book.available_copies = Math.max(0, book.total_copies - activeCount);
      await book.save();
    }

    await unblockVisitorIfClear(loan.visitor);

    res.json({ message: "Book returned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /not-returned/:token  (token can be the loan _id or the QR token)
// ─────────────────────────────────────────────────────────────
router.post("/not-returned/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body || {};

    const isObjectId = /^[a-f\d]{24}$/i.test(token);
    const query = isObjectId
      ? { _id: token, status: "borrowed" }
      : { borrow_qr_token: token, status: "borrowed" };

    const loan = await Loan.findOne(query);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.status = "not_returned";
    loan.return_issues = reason?.trim() ? reason.trim() : "Not returned";
    await loan.save();

    await Visitor.findByIdAndUpdate(loan.visitor, {
      status: "blocked",
      is_suspended: true,
    });

    res.json({ message: "Book marked as not returned and visitor blocked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /qr/:token
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// GET /active  (visitor fields include is_suspended/status for the admin badge)
// ─────────────────────────────────────────────────────────────
router.get("/active", async (req, res) => {
  try {
    const loans = await Loan.find({ status: "borrowed" })
      .populate("visitor", "name is_suspended status")
      .populate("book", "title author");
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /visitor/:visitorId
// ─────────────────────────────────────────────────────────────
router.get("/visitor/:visitorId", async (req, res) => {
  try {
    const loans = await Loan.find({ visitor: req.params.visitorId })
      .populate("book", "title author category")
      .sort({ borrow_date: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /:id/reminder
// ─────────────────────────────────────────────────────────────
router.post("/:id/reminder", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("book", "title");
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    if (loan.reminder_sent) {
      return res.status(400).json({ error: "Reminder already sent" });
    }

    const dueDateStr = new Date(loan.due_date).toLocaleDateString("en-PH");
    await sendReminderEmail(loan.email, loan.book.title, dueDateStr);

    loan.reminder_sent = true;
    await loan.save();
    res.json({ message: "Reminder sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email: " + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /returned-issues
// ─────────────────────────────────────────────────────────────
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
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /history
// ─────────────────────────────────────────────────────────────
router.get("/history", async (req, res) => {
  try {
    const loans = await Loan.find({ status: { $in: ["returned", "not_returned"] } })
      .populate("visitor", "name is_suspended status")
      .populate("book", "title author")
      .sort({ return_date: -1, borrow_date: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /retrieve/:id
// ─────────────────────────────────────────────────────────────
router.post("/retrieve/:id", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    if (loan.status === "borrowed") {
      return res.status(400).json({ error: "Already active" });
    }

    loan.status = "borrowed";
    loan.return_date = null;
    loan.return_issues = "";
    await loan.save();

    const activeCount = await Loan.countDocuments({
      book: loan.book,
      status: "borrowed",
    });
    const book = await Book.findById(loan.book);
    if (book) {
      book.available_copies = Math.max(0, book.total_copies - activeCount);
      await book.save();
    }

    // The loan is active again, so the "not returned" restriction can lift
    await unblockVisitorIfClear(loan.visitor);

    res.json({ message: "Loan retrieved back to active", loan });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /book-status-summary
// ─────────────────────────────────────────────────────────────
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
          $or: [
            { borrow_date: { $gte: startDate, $lte: endDate } },
            { return_date: { $gte: startDate, $lte: endDate } },
          ],
        },
      },
      { $lookup: { from: "books", localField: "book", foreignField: "_id", as: "bookInfo" } },
      { $unwind: "$bookInfo" },
      {
        $group: {
          _id: "$bookInfo._id",
          title: { $first: "$bookInfo.title" },
          author: { $first: "$bookInfo.author" },
          borrowed: { $sum: { $cond: [{ $eq: ["$status", "borrowed"] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } },
          unreturned: { $sum: { $cond: [{ $eq: ["$status", "not_returned"] }, 1, 0] } },
        },
      },
      { $sort: { title: 1 } },
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;