const express = require('express');
const router = express.Router();
// @ts-ignore
const Visitor = require('../models/Visitor');
const { generateToken, generateReferenceNumber } = require('../utils/helpers');

router.post('/register', async (req, res) => {
  console.log("✅ Register hit", req.body);
  try {
    const { name, address, dob, gender, course, school_work, profession, phone, email, purpose } = req.body;
    if (!name || !dob || !gender) return res.status(400).json({ error: 'Name, DOB, Gender required' });

    let visitor = await Visitor.findOne({ name, dob });
    if (visitor) {
      visitor.address = address; visitor.gender = gender; visitor.course = course;
      visitor.school_work = school_work; visitor.profession = profession; visitor.phone = phone; visitor.email = email;
      await visitor.save();
    } else {
      const qr_token = generateToken();
      const reference_number = generateReferenceNumber();
      visitor = new Visitor({ name, address, dob, gender, course, school_work, profession, phone, email, qr_token, reference_number });
      await visitor.save();
    }
    res.json({ id: visitor._id, name: visitor.name, qr_token: visitor.qr_token, reference_number: visitor.reference_number, phone: visitor.phone, email: visitor.email, qr_url: `${req.protocol}://${req.get('host')}/api/visitors/qr/${visitor.qr_token}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/qr/:token', async (req, res) => {
  const visitor = await Visitor.findOne({ qr_token: req.params.token });
  if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
  res.json(visitor);
});
// GET /api/visitors
router.get('/', async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    res.json(visitors);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// GET /api/visitors - list all visitors
router.get('/', async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ createdAt: -1 });
    res.json(visitors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;