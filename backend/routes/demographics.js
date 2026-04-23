const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { startOfMonth, endOfMonth, startOfDay, endOfDay } = require('date-fns');

function getAgeGroup(dob) {
  if (!dob) return 'Unknown';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age >= 6 && age <= 12) return 'Children';
  if (age >= 13 && age <= 21) return 'Adolescents';
  if (age >= 22 && age <= 35) return 'Young Adults';
  if (age >= 36) return 'Adults';
  return 'PWD';
}

router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    console.log(`Monthly demographics: ${start} to ${end}`);

    const visits = await Visit.find({
      check_in_time: { $gte: start, $lte: end }
    }).populate('visitor');
    console.log(`Found ${visits.length} visits in month`);

    const counts = { Children: 0, Adolescents: 0, 'Young Adults': 0, Adults: 0, PWD: 0 };
    for (const visit of visits) {
      if (!visit.visitor) {
        console.log(`Visit ${visit._id} has no visitor reference`);
        continue;
      }
      if (!visit.visitor.dob) {
        console.log(`Visitor ${visit.visitor._id} has no dob`);
        continue;
      }
      const group = getAgeGroup(visit.visitor.dob);
      console.log(`Visit ${visit._id}: visitor ${visit.visitor.name}, dob ${visit.visitor.dob}, group ${group}`);
      if (counts[group] !== undefined) counts[group]++;
    }
    console.log('Counts:', counts);
    res.json([{ month: `${month}/2026`, ...counts }]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


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
         if (v.visitor && v.visitor.dob) {
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
