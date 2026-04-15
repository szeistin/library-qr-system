const express = require("express");
const router = express.Router();
const Visit = require("../models/Visit");
const Book = require("../models/Book");
const { startOfDay, endOfDay } = require("date-fns");

router.get("/", async (req, res) => {
   try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const visitorsToday = await Visit.countDocuments({
         check_in_time: { $gte: todayStart, $lte: todayEnd },
      });
      const books = await Book.aggregate([
         {
            $group: {
               _id: null,
               totalAvailable: { $sum: "$available_copies" },
            },
         },
      ]);
      const availableBooks = books.length ? books[0].totalAvailable : 0;
      res.json({ visitorsToday, availableBooks, hours: "8:00 AM - 5:00 PM" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

module.exports = router;
