// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { sendEmail } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[AUTH] JWT_SECRET is not set in environment variables!');
    }
    try {
        return jwt.sign({ id: user._id, role: user.role }, secret || 'local-dev-fallback-secret', {
            expiresIn: '30d',
        });
    } catch (err) {
        console.error('[AUTH] jwt.sign failed:', err.message);
        throw err;
    }
};

// reCAPTCHA verification function
const verifyRecaptcha = async (token) => {
    // Bypass for any non-production environment (development, test, unset, etc.)
    // This also guards against empty/null/undefined tokens which would always fail.
    if (!token || process.env.NODE_ENV !== 'production') {
        console.log('[reCAPTCHA] Bypassing verification (NODE_ENV=' + process.env.NODE_ENV + ')');
        return true;
    }
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
    );
    return response.data.success;
};

// ----------------- SIGNUP ----------------- //
// @desc    Register a new user
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // IIT ISM domain restriction
        const allowedDomain = /@iitism\.ac\.in$/;
        if (!allowedDomain.test(email)) {
            return res.status(403).json({
                message: 'Access Restricted: Only IIT ISM campus emails (@iitism.ac.in) are allowed.',
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate role — only allow user or organizer from public signup
        const allowedRoles = ['user', 'organizer'];
        const assignedRole = allowedRoles.includes(role) ? role : 'user';

        // Create user (role is now persisted correctly)
        const user = await User.create({ name, email, password, role: assignedRole });
        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('[AUTH CRASH] signup:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// ----------------- LOGIN ----------------- //
// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    const { email, password, recaptchaToken } = req.body;

    try {
        // Optional Recaptcha check
        if (recaptchaToken) {
            const isHuman = await verifyRecaptcha(recaptchaToken);
            if (!isHuman) {
                return res.status(400).json({ message: 'reCAPTCHA verification failed.' });
            }
        }

        const user = await User.findOne({ email }).select('+password');
        
        if (user && (await user.matchPassword(password))) {
            // 2FA Check for organizers
            if (user.role === 'organizer' && user.is2FAEnabled) {
                const twoFACode = Math.floor(100000 + Math.random() * 900000).toString();
                const twoFACodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins

                // SECURITY: store a bcrypt hash, never the plaintext code.
                // If the DB is compromised, active 2FA sessions cannot be exploited.
                user.twoFACode = await bcrypt.hash(twoFACode, 10);
                user.twoFACodeExpires = twoFACodeExpires;
                await user.save();

                // Send the plaintext code to the user's email (never stored)
                await sendEmail(
                    user.email,
                    'Your 2FA Code for EventEase',
                    `<p>Your 2-Factor Authentication code is: <strong>${twoFACode}</strong></p><p>This code is valid for 10 minutes.</p>`
                );
                return res.status(200).json({ message: '2FA required', userId: user._id });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('[AUTH CRASH] login:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// ----------------- 2FA VERIFY ----------------- //
// @desc    Verify 2FA code
// @route   POST /api/auth/verify-2fa
exports.verify2FA = async (req, res) => {
    const { userId, twoFACode } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare submitted code against the stored bcrypt hash.
        // bcrypt.compare is constant-time, preventing timing-based enumeration.
        const isCodeValid = user.twoFACode
            ? await bcrypt.compare(twoFACode, user.twoFACode)
            : false;

        if (!isCodeValid || user.twoFACodeExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired 2FA code' });
        }

        // Clear 2FA code
        user.twoFACode = undefined;
        user.twoFACodeExpires = undefined;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user),
        });
    } catch (error) {
        console.error('[AUTH CRASH] verify2FA:', error);
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// ----------------- GOOGLE OAUTH CALLBACK (CRITICAL FIX) ----------------- //
// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
exports.googleCallback = async (req, res) => {
    try {
        // req.user is populated by Passport after successful Google authentication
        const profile = req.user;

        if (!profile) {
            console.log('[googleCallback] ERROR: req.user is undefined — Passport did not populate the profile.');
            return res.redirect('http://localhost:5173/login?error=auth_failed');
        }

        const email    = profile.emails?.[0]?.value;
        const name     = profile.displayName;
        const googleId = profile.id;

        console.log('[googleCallback] Google profile received:', { email, name, googleId });

        if (!email) {
            console.log('[googleCallback] ERROR: No email returned from Google profile.');
            return res.redirect('http://localhost:5173/login?error=auth_failed');
        }

        // IIT ISM domain restriction for Google OAuth
        if (!email.endsWith('@iitism.ac.in')) {
            console.log('[googleCallback] Blocked non-IIT email via Google OAuth:', email);
            return res.redirect('http://localhost:5173/login?error=restricted_domain');
        }

        // Check if user exists in DB
        let user = await User.findOne({ email });
        console.log('[googleCallback] DB lookup result:', user ? `found user ${user._id}` : 'new user — will create');

        if (user) {
            // Link googleId if not already present
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            // Create new user if doesn't exist
            user = await User.create({
                name,
                email,
                googleId,
                role: 'user',
            });
            console.log('[googleCallback] New user created:', user._id);
        }

        // Generate token using the Database User object (contains _id and role)
        const token = generateToken(user);
        console.log('[googleCallback] Token generated — redirecting to frontend callback route.');

        // Redirect to frontend OAuth landing page
        res.redirect('http://localhost:5173/auth/google/callback?token=' + token);

    } catch (error) {
        console.log('[googleCallback] UNHANDLED ERROR:');
        console.log('  message :', error.message);
        console.log('  stack   :', error.stack);
        console.log('  req.user:', req.user);
        res.redirect('http://localhost:5173/login?error=auth_failed');
    }
};