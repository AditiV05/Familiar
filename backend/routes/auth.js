const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");
const crypto = require("crypto");
const { sendVerificationEmail, sendResetEmail } = require("../utils/sendEmail");

const router = express.Router();
require("../config/passport");

const VERIFY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

//sign up
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires: Date.now() + VERIFY_WINDOW,
      isVerified: false,
    });
    await newUser.save();

    // respond immediately so the user isn't left waiting on the email
    res.status(201).json({
      message:
        "Account created. Check your email to verify your account before logging in.",
    });

    // send the email in the background (don't block the response)
    sendVerificationEmail(email, verificationToken).catch((mailErr) => {
      console.error("Failed to send verification email:", mailErr);
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User does not exist" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in. Check your inbox.",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // strip the password hash before sending the user back to the client
    const userSafe = user.toObject();
    delete userSafe.password;

    res.status(200).json({ user: userSafe, token });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Verify email
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "This verification link is invalid or has expired." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: "Email verified. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Resend verification email
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    // Only act if the account exists AND is still unverified.
    // Respond identically either way, so this can't be used to probe accounts.
    if (user && !user.isVerified) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = Date.now() + VERIFY_WINDOW;
      await user.save();

      sendVerificationEmail(email, verificationToken).catch((mailErr) => {
        console.error("Failed to resend verification email:", mailErr);
      });
    }

    res.json({
      message:
        "If that account still needs verifying, a new link is on its way.",
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Forgot password - request a reset link
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    // Always respond the same way, whether or not the account exists,
    // so this can't be used to discover which emails are registered.
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save();

      sendResetEmail(email, resetToken).catch((mailErr) => {
        console.error("Failed to send reset email:", mailErr);
      });
    }

    res.json({
      message:
        "If an account exists for that email, a reset link is on its way.",
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Reset password - set a new password using the token
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;
  try {
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired." });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Check whether a reset token is still valid (gates the reset form on page load)
router.get("/reset-password/:token/check", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ valid: false });
    }

    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ valid: false });
  }
});

// google Oauth Routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const { token } = req.user;
    res.redirect(
      `${process.env.CLIENT_URL || "http://localhost:5173"}/google-success?token=${token}`,
    );
  },
);

// Get the currently logged-in user from their token
router.get("/me", require("../middleware/authMiddleware"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email _id");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
