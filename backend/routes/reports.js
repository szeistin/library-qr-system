const express = require("express");
const router = express.Router();
const Report = require("../models/Report");

router.get("/monthly/:year/:month", async (req, res) => {
   try {
      const { year, month } = req.params;
      const report = await Report.findOne({ month, year });
      res.json(report || { data: {} });
   } catch (err) {
      res.status(500).json({ error: "Server error" });
   }
});
router.post("/update", async (req, res) => {
   try {
      const { month, year, data } = req.body;
      const report = await Report.findOneAndUpdate(
         { month, year },
         { data },
         { upsert: true, new: true },
      );
      res.json(report);
   } catch (err) {
      res.status(500).json({ error: "Server error" });
   }
});
// GET /api/reports/most-borrowed?year=2026&month=3
router.get("/most-borrowed", async (req, res) => {
   try {
      const { year, month } = req.query;
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      const loans = await Loan.aggregate([
         {
            $match: {
               borrow_date: { $gte: start, $lte: end },
               status: "borrowed",
            },
         },
         { $group: { _id: "$book", count: { $sum: 1 } } },
         { $sort: { count: -1 } },
         { $limit: 10 },
         {
            $lookup: {
               from: "books",
               localField: "_id",
               foreignField: "_id",
               as: "book",
            },
         },
         { $unwind: "$book" },
         {
            $project: {
               title: "$book.title",
               author: "$book.author",
               borrowCount: "$count",
            },
         },
      ]);
      res.json(loans);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});


module.exports = router;
