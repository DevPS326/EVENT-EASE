const express   = require('express');
const passport  = require('passport');
const { body }  = require('express-validator');
const validate  = require('../middleware/validate');
const { signup, login, googleCallback, verify2FA } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], validate, signup);

router.post('/login', [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
], validate, login);
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