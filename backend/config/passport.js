const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const jwt = require("jsonwebtoken");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // 1. Already linked to this Google account
        let user = await User.findOne({ googleId: profile.id });

        // 2. Not linked yet, but an account with this email exists — link them
        if (!user) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            // Google has already confirmed this address, so trust it
            if (!user.isVerified) {
              user.isVerified = true;
              user.verificationToken = undefined;
              user.verificationTokenExpires = undefined;
            }
            await user.save();
          }
        }

        // 3. No account at all — create one
        if (!user) {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email,
            isVerified: true,
          });
          await user.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        done(null, { user, token });
      } catch (err) {
        done(err, false);
      }
    },
  ),
);
