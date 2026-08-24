const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Staff = require("../models/Staff");
const StaffLog = require("../models/StaffLog");

// LOGIN: Authenticates Username, Position, and PIN
router.post("/login", async (req, res) => {
   try {
      const { username, position, pin } = req.body;

      // 1. Find staff member by username
      const staff = await Staff.findOne({ username });
      if (!staff) {
         return res.status(401).json({ error: "Invalid credentials" });
      }

      // 2. Validate position matches the assigned role in the database
      if (position && staff.position !== position) {
         return res.status(401).json({ error: "Selected position does not match account records" });
      }

      // 3. Verify PIN
      const isValid = await bcrypt.compare(pin, staff.pin_hash);
      if (!isValid) {
         return res.status(401).json({ error: "Invalid credentials" });
      }

      // 4. Generate JWT Token (Includes position for role-based authorization)
      const token = jwt.sign(
         { id: staff._id, username: staff.username, position: staff.position },
         process.env.JWT_SECRET,
         { expiresIn: "8h" }
      );

      // 5. Create audit log entry
      await StaffLog.create({ staff: staff._id });

      res.json({
         token,
         staff: { id: staff._id, username: staff.username, position: staff.position },
      });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
   }
});

// VERIFY PIN: Quick authentication check for sensitive actions inside dashboard
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

// LOGOUT
router.post("/logout", async (req, res) => {
   res.json({ message: "Logged out" });
});

module.exports = router;