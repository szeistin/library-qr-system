const express = require("express");
const router = express.Router();
const Visit = require("../models/Visit");
const Visitor = require("../models/Visitor");
const Loan = require("../models/Loan");
const { startOfDay, endOfDay } = require("date-fns");

// =========================
// HELPERS
// =========================
function getAge(dob) {
   if (!dob) return null;
   const birthDate = new Date(dob);
   const today = new Date();
   let age = today.getFullYear() - birthDate.getFullYear();
   const m = today.getMonth() - birthDate.getMonth();
   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
   return age;
}

function getAgeGroup(dob) {
   const age = getAge(dob);
   if (age === null) return "Unknown";
   if (age >= 6 && age <= 12) return "Children";
   if (age >= 13 && age <= 21) return "Adolescents";
   if (age >= 22 && age <= 35) return "Young Adults";
   if (age >= 36) return "Adults";
   return "PWD";
}

// =========================
// 🔥 SCAN (AUTO TOGGLE)
// =========================
router.post("/scan", async (req, res) => {
   try {
      let { qr_token, reference_number, purpose } = req.body;
      // Trim whitespace
      if (reference_number) reference_number = reference_number.trim();
      if (qr_token) qr_token = qr_token.trim();

      console.log("Scan - qr_token:", qr_token, "reference_number:", reference_number);

      let visitor = null;
      if (qr_token) {
         visitor = await Visitor.findOne({ qr_token });
      }
      if (!visitor && reference_number) {
         // Use case-insensitive regex (though already uppercase, but for safety)
         visitor = await Visitor.findOne({ reference_number: { $regex: new RegExp(`^${reference_number}$`, 'i') } });
      }

      if (!visitor) {
         console.log("Visitor not found for ref:", reference_number);
         return res.status(404).json({ error: "Visitor not found" });
      }

      // 🔍 CHECK ACTIVE VISIT
      const activeVisit = await Visit.findOne({
         visitor: visitor._id,
         status: "active",
      });

      // =========================
      // ✅ CHECK OUT
      // =========================
      if (activeVisit) {
         activeVisit.status = "completed";
         activeVisit.check_out_time = new Date();
         await activeVisit.save();

         return res.json({
            action: "checkout",
            message: "Checked out",
            visit: {
               ...activeVisit.toObject(),
               visitor: {
                  name: visitor.name,
                  reference_number: visitor.reference_number,
                  qr_token: visitor.qr_token,
               },
            },
         });
      }

      // =========================
      // ✅ CHECK IN
      // =========================
      const age = getAge(visitor.dob);
      const ageGroup = getAgeGroup(visitor.dob);

      const visit = new Visit({
         visitor: visitor._id,
         purpose: purpose || visitor.purpose,
         status: "active",
         check_in_time: new Date(), // ✅ IMPORTANT FIX
         age,
         ageGroup,
      });

      await visit.save();

      return res.json({
         action: "checkin",
         message: "Checked in",
         visit: {
            ...visit.toObject(),
            visitor: {
               name: visitor.name,
               reference_number: visitor.reference_number,
               qr_token: visitor.qr_token,
            },
         },
      });
   } catch (err) {
      console.error("SCAN ERROR:", err);
      return res.status(500).json({ error: err.message });
   }
});

// =========================
// STATS
// =========================
router.get("/stats", async (req, res) => {
   try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      // Total unique visitors today (count distinct visitor IDs)
      const uniqueVisitorsToday = await Visit.aggregate([
         { $match: { check_in_time: { $gte: todayStart, $lte: todayEnd } } },
         { $group: { _id: "$visitor" } },
         { $count: "count" }
      ]);
      const totalToday = uniqueVisitorsToday.length > 0 ? uniqueVisitorsToday[0].count : 0;

      const checkedIn = await Visit.countDocuments({ status: "active" });
      const checkedOut = await Visit.countDocuments({
         status: "completed",
         check_out_time: { $gte: todayStart, $lte: todayEnd },
      });
      const activeBorrows = await Loan.countDocuments({ status: "borrowed" });

      res.json({ totalToday, checkedIn, checkedOut, activeBorrows });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
   }
});

// =========================
// ACTIVE VISITORS
// =========================
router.get("/active", async (req, res) => {
   try {
      const visits = await Visit.find({ status: "active" }).populate(
         "visitor",
         "name reference_number qr_token gender dob",
      );
      res.json(visits);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
   }
});

// =========================
// TODAY VISITS
// =========================
router.get("/today", async (req, res) => {
   try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const visits = await Visit.find({
         check_in_time: { $gte: todayStart, $lte: todayEnd },
      })
         .populate("visitor", "name gender reference_number qr_token dob")
         .sort({ check_in_time: -1 });

      const formatted = visits.map((v) => {
         const age = v.age ?? getAge(v.visitor?.dob);
         const ageGroup = v.ageGroup ?? getAgeGroup(v.visitor?.dob);

         return {
            ...v.toObject(),
            age,
            ageGroup,
         };
      });

      res.json(formatted);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
   }
});

module.exports = router;
