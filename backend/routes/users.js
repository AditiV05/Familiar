const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const Article = require("../models/Article");
const Draft = require("../models/Draft");
const authenticateToken = require("../middleware/authMiddleware");

// Fields anyone may see on a profile. Never send the whole user document:
// it also holds the password hash and any pending reset or verification
// token.
const PUBLIC_FIELDS = "name bio followers following date";

// This route is public, but a signed-in owner also gets their own email.
// A missing or bad token just means "not the owner", never an error.
const viewerId = (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).id;
  } catch {
    return null;
  }
};

// ✅ Get User Profile & Their Articles
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "User not found" });
    }

    const isOwner = viewerId(req) === req.params.id;
    const user = await User.findById(req.params.id)
      .select(isOwner ? `${PUBLIC_FIELDS} email` : PUBLIC_FIELDS)
      .populate("followers", "name")
      .populate("following", "name");

    if (!user) return res.status(404).json({ message: "User not found" });

    const articles = await Article.find({ author: req.params.id });

    res.json({ user, articles });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update own profile (name + bio)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    // only let a user edit their own profile
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { name, bio } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { name, bio },
      { new: true, runValidators: true },
    ).select("name email bio");

    if (!updated) return res.status(404).json({ message: "User not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete own account + all their articles
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Article.deleteMany({ author: req.params.id });
    await Draft.deleteMany({ author: req.params.id });
    // Take them out of everyone's follower and following lists, so counts
    // elsewhere stay true.
    await User.updateMany(
      { $or: [{ followers: req.params.id }, { following: req.params.id }] },
      { $pull: { followers: req.params.id, following: req.params.id } },
    );
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Follow and unfollow each change two users, so each side is a single atomic
// update: $addToSet never adds an id twice and $pull removes it, even when a
// double tap sends two requests at once. A read-then-save version let both
// requests pass the "already following?" check and add the id twice.
const changeFollow = (follow) => async (req, res) => {
  try {
    const { id } = req.params;
    const me = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: "User not found" });
    }
    if (id === me) {
      const action = follow ? "follow" : "unfollow";
      return res.status(400).json({ message: `You cannot ${action} yourself` });
    }

    const [target, currentUser] = await Promise.all([
      User.exists({ _id: id }),
      User.exists({ _id: me }),
    ]);
    if (!target) return res.status(404).json({ message: "User not found" });
    // A valid token for an account that has since been deleted.
    if (!currentUser)
      return res.status(401).json({ message: "Your account no longer exists" });

    const op = follow ? "$addToSet" : "$pull";
    await Promise.all([
      User.updateOne({ _id: me }, { [op]: { following: id } }),
      User.updateOne({ _id: id }, { [op]: { followers: me } }),
    ]);

    // Count the way the profile page does: through populate, which drops ids
    // whose account has been deleted. A raw length would count those too, and
    // the number would jump by one more than it should until a refresh.
    const updated = await User.findById(id)
      .select("followers")
      .populate("followers", "_id");
    res.json({ following: follow, followers: updated.followers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.post("/:id/follow", authenticateToken, changeFollow(true));
router.post("/:id/unfollow", authenticateToken, changeFollow(false));

module.exports = router;
