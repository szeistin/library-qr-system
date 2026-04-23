const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
   .connect(process.env.MONGO_URI)
   .then(() => console.log("MongoDB connected"))
   .catch((err) => console.error("MongoDB connection error:", err));

// Import routes
const visitorRoutes = require("./routes/visitors");
const statsRoutes = require("./routes/stats");
const staffRoutes = require("./routes/staff");
const bookRoutes = require("./routes/books");
const loanRoutes = require("./routes/loans");
const reportRoutes = require("./routes/reports");
const visitRoutes = require('./routes/visits');
const demographicsRoutes = require("./routes/demographics");

app.use("/api/visitors", visitorRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/reports", reportRoutes);
app.use('/api/visits', visitRoutes);
app.use("/api/demographics", demographicsRoutes);

app.get("/", (req, res) => {
   res.send("Library API is running");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
