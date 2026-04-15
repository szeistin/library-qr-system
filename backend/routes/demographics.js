const express = require("express");
const router = express.Router();
const Visit = require("../models/Visit");
// @ts-ignore
const Visitor = require("../models/Visitor");
const { startOfMonth, endOfMonth, startOfDay, endOfDay } = require("date-fns");

function getAgeGroup(dob) {
   const birthDate = new Date(dob);
   const today = new Date();
   let age = today.getFullYear() - birthDate.getFullYear();
   const m = today.getMonth() - birthDate.getMonth();
   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
   if (age >= 6 && age <= 12) return "Children";
   if (age >= 13 && age <= 21) return "Adolescents";
   if (age >= 22 && age <= 35) return "Young Adults";
   if (age >= 36) return "Adults";
   return "PWD";
}

// GET /api/demographics/monthly/:year/:month
router.get("/monthly/:year/:month", async (req, res) => {
   try {
      const { year, month } = req.params;
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));
      const visits = await Visit.find({
         check_in_time: { $gte: start, $lte: end },
         status: "completed",
      }).populate("visitor", "dob gender");
      const counts = {
         Children: 0,
         Adolescents: 0,
         "Young Adults": 0,
         Adults: 0,
         PWD: 0,
      };
      visits.forEach((v) => {
         if (v.visitor) {
            const group = getAgeGroup(v.visitor.dob);
            if (counts[group] !== undefined) counts[group]++;
         }
      });
      res.json([{ month: `${month}/2026`, ...counts }]);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// GET /api/demographics/today
router.get("/today", async (req, res) => {
   try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const visits = await Visit.find({
         check_in_time: { $gte: todayStart, $lte: todayEnd },
      }).populate("visitor", "dob");
      const counts = {
         Children: 0,
         Adolescents: 0,
         "Young Adults": 0,
         Adults: 0,
         PWD: 0,
      };
      visits.forEach((v) => {
         if (v.visitor) {
            const group = getAgeGroup(v.visitor.dob);
            if (counts[group] !== undefined) counts[group]++;
         }
      });
      const result = Object.entries(counts).map(([category, count]) => ({
         category,
         count,
      }));
      res.json(result);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

module.exports = router;
