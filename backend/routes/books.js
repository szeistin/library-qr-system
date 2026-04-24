const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const Loan = require("../models/Loan");

router.get("/search", async (req, res) => {
   try {
      const { q, category } = req.query;
      let filter = {};
      if (q)
         filter = {
            $or: [
               { title: { $regex: q, $options: "i" } },
               { author: { $regex: q, $options: "i" } },
            ],
         };
      if (category) filter.category = category;
      const books = await Book.find(filter).limit(20);
      res.json(books);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

router.get("/categories", async (req, res) => {
   try {
      const categories = await Book.distinct("category");
      res.json(categories);
   } catch (err) {
      res.status(500).json({ error: "Server error" });
   }
});

router.get("/recommended", async (req, res) => {
   try {
      const { dob } = req.query;
      if (!dob) return res.json([]);
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

      let categories = [];
      if (age < 13) categories = ["Children"];
      else if (age < 22) categories = ["Young Adult"];
      else
         categories = [
            "Local History & Culture",
            "Biography / History",
            "Filipiniana",
         ];

      const books = await Book.find({
         category: { $in: categories },
         available_copies: { $gt: 0 },
      })
         .sort({ borrowCount: -1 })
         .limit(10); // most borrowed first

      const booksWithStars = books.map((book) => ({
         ...book.toObject(),
         stars: 4,
         borrowCount: book.borrowCount || 0,
      }));
      res.json(booksWithStars);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});
// Most borrowed books endpoint
router.get("/most-borrowed", async (req, res) => {
   try {
      const { month, year } = req.query;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const pipeline = [
         {
            $match: {
               borrow_date: { $gte: startDate, $lte: endDate },
               status: "borrowed",
            },
         },
         { $group: { _id: "$book", borrowCount: { $sum: 1 } } },
         { $sort: { borrowCount: -1 } },
         { $limit: 10 },
         {
            $lookup: {
               from: "books",
               localField: "_id",
               foreignField: "_id",
               as: "bookDetails",
            },
         },
         { $unwind: "$bookDetails" },
         {
            $project: {
               title: "$bookDetails.title",
               author: "$bookDetails.author",
               category: "$bookDetails.category",
               borrowCount: 1,
            },
         },
      ];
      const result = await Loan.aggregate(pipeline);
      res.json(result);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});
// GET /api/books - list all books
router.get("/", async (req, res) => {
   try {
      const books = await Book.find().sort({ title: 1 });
      res.json(books);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// POST /api/books - create a new book
router.post("/", async (req, res) => {
   try {
      const { title, author, category, total_copies, available_copies } =
         req.body;
      if (!title || !author || !category) {
         return res
            .status(400)
            .json({ error: "Title, author, and category are required" });
      }
      const book = new Book({
         title,
         author,
         category,
         total_copies: total_copies || 1,
         available_copies:
            available_copies !== undefined
               ? available_copies
               : total_copies || 1,
      });
      await book.save();
      res.status(201).json(book);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// PUT /api/books/:id - update a book
router.put("/:id", async (req, res) => {
   try {
      const { title, author, category, total_copies, available_copies } =
         req.body;
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      book.title = title || book.title;
      book.author = author || book.author;
      book.category = category || book.category;
      book.total_copies =
         total_copies !== undefined ? total_copies : book.total_copies;
      book.available_copies =
         available_copies !== undefined
            ? available_copies
            : book.available_copies;
      await book.save();
      res.json(book);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// DELETE /api/books/:id - delete a book (check for active loans)
router.delete("/:id", async (req, res) => {
   try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      // Check if any active loans exist for this book
      const Loan = require("../models/Loan");
      const activeLoan = await Loan.findOne({
         book: book._id,
         status: { $ne: "returned" },
      });
      if (activeLoan) {
         return res
            .status(400)
            .json({ error: "Cannot delete book with active loans" });
      }
      await book.deleteOne();
      res.json({ message: "Book deleted" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});
module.exports = router;
