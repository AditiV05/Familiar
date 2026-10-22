const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const Article = require("../models/Article");
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
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/follow", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow)
      return res.status(404).json({ message: "User not found" });

    if (!currentUser.following.includes(id)) {
      currentUser.following.push(id);
      userToFollow.followers.push(req.user.id);

      await currentUser.save();
      await userToFollow.save();
    }

    res.json({ message: `You followed ${userToFollow.name}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/unfollow", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ message: "You cannot unfollow yourself" });
    }

    const userToUnfollow = await User.findById(id);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow)
      return res.status(404).json({ message: "User not found" });

    currentUser.following = currentUser.following.filter(
      (uid) => uid.toString() !== id,
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (uid) => uid.toString() !== req.user.id,
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ message: `You unfollowed ${userToUnfollow.name}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
