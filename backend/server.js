const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const passport = require("passport");
require("./config/passport");

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(passport.initialize());
// Cheap liveness probe. Touches no database, so it answers the moment the
// instance is awake. The frontend pings it on load to wake Render's free
// tier before anyone clicks something that navigates off the site.
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

const articleRoutes = require("./routes/articles");
app.use("/api/articles", articleRoutes);

const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);

const searchRoutes = require("./routes/search");
app.use("/api/search", searchRoutes);

const notificationRoutes = require("./routes/notifications");
app.use("/api/notifications", notificationRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
