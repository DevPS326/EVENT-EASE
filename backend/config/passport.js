const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const dotenv = require('dotenv');
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // Just pass the profile forward. We handle user creation in the controller.
      return done(null, profile);
    }
  )
);

// REMOVED: serializeUser and deserializeUser (We are using Stateless JWT)

module.exports = passport;