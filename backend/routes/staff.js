const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Staff = require("../models/Staff");

// STAFF LOGIN
router.post("/login", async (req, res) => {
   try {
      const { username, pin } = req.body;
      if (!username || !pin) return res.status(400).json({ error: "Username and PIN required" });

      const cleanUsername = username.trim().toLowerCase();
      const staff = await Staff.findOne({ username: cleanUsername });
      if (!staff) return res.status(401).json({ error: "Invalid username or PIN" });

      const isMatch = await bcrypt.compare(pin, staff.pin_hash);
      if (!isMatch) return res.status(401).json({ error: "Invalid username or PIN" });

      const token = jwt.sign(
         { id: staff._id, position: staff.position },
         process.env.JWT_SECRET || "secret",
         { expiresIn: "12h" }
      );

      res.json({
         token,
         staff: { id: staff._id, username: staff.username, position: staff.position },
      });
   } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
   }
});

// VERIFY PIN (For Manage Books and Borrowing gates)
router.post("/verify-pin", async (req, res) => {
   try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "No token provided" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      const staff = await Staff.findById(decoded.id);
      if (!staff) return res.status(404).json({ error: "Staff member not found" });

      const { pin } = req.body;
      const isMatch = await bcrypt.compare(pin, staff.pin_hash);
      if (!isMatch) return res.status(401).json({ error: "Incorrect PIN code" });

      res.json({ message: "PIN verified successfully" });
   } catch (err) {
      console.error("Verify PIN error:", err);
      res.status(500).json({ error: "Invalid or expired token" });
   }
});

module.exports = router;