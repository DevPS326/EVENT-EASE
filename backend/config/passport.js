const logger = require('../utils/logger');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const dotenv = require('dotenv');
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
      // Hint Google's account chooser to show only @iitism.ac.in accounts.
      // This is a UX hint, NOT a security gate — the check below is the gate.
      authorizationParams: { hd: 'iitism.ac.in' },
    },
    (accessToken, refreshToken, profile, done) => {
      const email = (profile.emails?.[0]?.value || '').trim().toLowerCase();

      // Hard security gate: reject any non-IIT account before it reaches the
      // controller.  done(null, false) triggers Passport's failure path.
      if (!email.endsWith('@iitism.ac.in')) {
        logger.warn('[Passport] Blocked non-IIT Google login attempt:', email);
        return done(null, false, { message: 'Only IIT ISM emails (@iitism.ac.in) are allowed.' });
      }

      // Pass the profile forward; user creation / token generation is in the controller.
      return done(null, profile);
    }
  )
);

// REMOVED: serializeUser and deserializeUser (We are using Stateless JWT)

module.exports = passport;