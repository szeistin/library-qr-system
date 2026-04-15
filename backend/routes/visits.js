const express = require("express");
const router = express.Router();
const Visit = require("../models/Visit");
// @ts-ignore
const Visitor = require("../models/Visitor");
const { startOfDay, endOfDay } = require("date-fns");

// GET /api/visits/today
router.get("/today", async (req, res) => {
   try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const visits = await Visit.find({
         check_in_time: { $gte: todayStart, $lte: todayEnd },
      }).populate("visitor", "name gender age reference_number ageGroup");
      res.json(visits);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});
// GET /api/visits/stats
router.get("/stats", async (req, res) => {
   try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const totalToday = await Visit.countDocuments({
         check_in_time: { $gte: todayStart, $lte: todayEnd },
      });
      const checkedIn = await Visit.countDocuments({ status: "active" });
      const checkedOut = await Visit.countDocuments({
         status: "completed",
         check_out_time: { $gte: todayStart, $lte: todayEnd },
      });
      const activeBorrows = await require("../models/Loan").countDocuments({
         status: "borrowed",
      });
      res.json({ totalToday, checkedIn, checkedOut, activeBorrows });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// POST /api/visits/checkin
router.post("/checkin", async (req, res) => {
   try {
      const { qr_token, reference_number, purpose } = req.body;
      let visitor;
      if (qr_token) visitor = await Visitor.findOne({ qr_token });
      else if (reference_number)
         visitor = await Visitor.findOne({ reference_number });
      if (!visitor) return res.status(404).json({ error: "Visitor not found" });

      const activeVisit = await Visit.findOne({
         visitor: visitor._id,
         status: "active",
      });
      if (activeVisit)
         return res.status(400).json({ error: "Visitor already checked in" });

      const visit = new Visit({
         visitor: visitor._id,
         purpose: purpose || visitor.purpose,
         status: "active",
      });
      await visit.save();
      res.json({
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
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// POST /api/visits/checkout
router.post("/checkout", async (req, res) => {
   try {
      const { qr_token, reference_number } = req.body;
      let visitor;
      if (qr_token) visitor = await Visitor.findOne({ qr_token });
      else if (reference_number)
         visitor = await Visitor.findOne({ reference_number });
      if (!visitor) return res.status(404).json({ error: "Visitor not found" });

      const visit = await Visit.findOne({
         visitor: visitor._id,
         status: "active",
      });
      if (!visit) return res.status(400).json({ error: "No active visit" });

      visit.check_out_time = new Date();
      visit.status = "completed";
      await visit.save();
      res.json({
         message: "Checked out",
         visit: { ...visit.toObject(), visitor: { name: visitor.name } },
      });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// GET /api/visits/active
router.get("/active", async (req, res) => {
   try {
      const visits = await Visit.find({ status: "active" }).populate(
         "visitor",
         "name reference_number qr_token gender dob",
      );
      res.json(visits);
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

module.exports = router;
