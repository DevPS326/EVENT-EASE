const express = require('express');
const passport = require('passport');
const { signup, login, googleCallback, verify2FA } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-2fa', verify2FA);

// Google OAuth routes
// session: false is CRITICAL here
// hd hint pre-filters Google's account chooser to @iitism.ac.in accounts.
// This is a UX aid — the hard gate is enforced in the Passport strategy callback.
router.get('/google', passport.authenticate('google', {
    scope:   ['profile', 'email'],
    session: false,
    hd:      'iitism.ac.in',
}));

router.get(
    '/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }), 
    googleCallback
);

module.exports = router;