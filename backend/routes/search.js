const express = require("express");
const router = express.Router();
const Article = require("../models/Article");
const User = require("../models/User");

// Unified search route
router.get("/", async (req, res) => {
  const query = req.query.q;

  if (!query) return res.status(400).json({ message: "Search query missing" });

  // Treat the query as plain text. Raw input as a regex lets one search
  // pattern tie up the database.
  const pattern = String(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  try {
    // Search articles by title, description, or content
    const articles = await Article.find({
      $or: [
        { title: { $regex: pattern, $options: "i" } },
        { description: { $regex: pattern, $options: "i" } },
        { content: { $regex: pattern, $options: "i" } },
      ],
    }).populate("author", "name");

    // Search users by name only, and send back only public fields. Matching
    // on email would let anyone find out who is registered.
    const users = await User.find({
      name: { $regex: pattern, $options: "i" },
    }).select("name bio");

    res.json({ articles, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
