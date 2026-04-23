const express = require("express");
const router = express.Router();
const Visit = require("../models/Visit");
const { startOfMonth, endOfMonth } = require("date-fns");

function getAgeGroup(dob) {
   if (!dob) return "Uncategorized";
   const birthDate = new Date(dob);
   const today = new Date();
   let age = today.getFullYear() - birthDate.getFullYear();
   const m = today.getMonth() - birthDate.getMonth();
   if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
   if (age >= 6 && age <= 12) return "Children (6–12 yrs)";
   if (age >= 13 && age <= 21) return "Adolescents (13–21 yrs)";
   if (age >= 22 && age <= 35) return "Young Adults (22–35 yrs)";
   if (age >= 36) return "Adults (36 yrs+)";
   return "PWD (Persons w/ Disability)";
}

router.get("/monthly/:year/:month", async (req, res) => {
   try {
      const { year, month } = req.params;
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));

      // Find all visits within the month
      const visits = await Visit.find({
         check_in_time: { $gte: start, $lte: end },
      }).populate("visitor", "dob gender");

      // Use a Map to deduplicate by visitor ID (unique visitors per month)
      const uniqueVisitorsMap = new Map();
      for (const visit of visits) {
         if (
            visit.visitor &&
            !uniqueVisitorsMap.has(visit.visitor._id.toString())
         ) {
            uniqueVisitorsMap.set(visit.visitor._id.toString(), visit.visitor);
         }
      }
      const uniqueVisitors = Array.from(uniqueVisitorsMap.values());

      const demographics = {
         "Children (6–12 yrs)": { male: 0, female: 0 },
         "Adolescents (13–21 yrs)": { male: 0, female: 0 },
         "Young Adults (22–35 yrs)": { male: 0, female: 0 },
         "Adults (36 yrs+)": { male: 0, female: 0 },
         "PWD (Persons w/ Disability)": { male: 0, female: 0 },
      };

      for (const visitor of uniqueVisitors) {
         const group = getAgeGroup(visitor.dob);
         const gender =
            visitor.gender?.toLowerCase() === "female" ? "female" : "male";
         if (demographics[group]) {
            demographics[group][gender]++;
         }
      }

      res.json({ data: { visitorDemographics: demographics } });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

router.post("/update", (req, res) => {
   res.json({ message: "Report updated (read-only)" });
});

module.exports = router;
