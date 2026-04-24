const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Staff = require("../models/Staff");
const StaffLog = require("../models/StaffLog");

router.post("/register", async (req, res) => {
   try {
      const { username, position, pin, confirmPin } = req.body;
      if (pin !== confirmPin)
         return res.status(400).json({ error: "PINs do not match" });
      if (pin.length !== 4)
         return res.status(400).json({ error: "PIN must be 4 digits" });
      const hashedPin = await bcrypt.hash(pin, 10);
      const staff = new Staff({ username, position, pin_hash: hashedPin });
      await staff.save();
      res.json({ message: "Staff registered successfully" });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

router.post("/login", async (req, res) => {
   try {
      const { username, pin } = req.body;
      const staff = await Staff.findOne({ username });
      if (!staff) return res.status(401).json({ error: "Invalid credentials" });
      const isValid = await bcrypt.compare(pin, staff.pin_hash);
      if (!isValid)
         return res.status(401).json({ error: "Invalid credentials" });
      const token = jwt.sign(
         { id: staff._id, username },
         process.env.JWT_SECRET,
         { expiresIn: "8h" },
      );
      await StaffLog.create({ staff: staff._id });
      res.json({
         token,
         staff: { id: staff._id, username, position: staff.position },
      });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

router.post("/verify-pin", async (req, res) => {
   try {
      const { pin } = req.body;
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "No token" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const staff = await Staff.findById(decoded.id);
      if (!staff) return res.status(404).json({ error: "Staff not found" });

      const isValid = await bcrypt.compare(pin, staff.pin_hash);
      if (!isValid) return res.status(401).json({ error: "Invalid PIN" });

      res.json({ message: "PIN verified" });
   } catch (err) {
      res.status(500).json({ error: "Server error" });
   }
});

router.post("/logout", async (req, res) => {
   res.json({ message: "Logged out" });
});

module.exports = router;
