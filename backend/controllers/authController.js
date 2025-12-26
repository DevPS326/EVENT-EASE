// backend/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { sendEmail } = require('../utils/emailService');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// reCAPTCHA verification function
const verifyRecaptcha = async (token) => {
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
    const { name, email, password } = req.body;

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

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({ name, email, password });
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

                user.twoFACode = twoFACode;
                user.twoFACodeExpires = twoFACodeExpires;
                await user.save();

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

        if (user.twoFACode !== twoFACode || user.twoFACodeExpires < Date.now()) {
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
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// ----------------- GOOGLE OAUTH CALLBACK (CRITICAL FIX) ----------------- //
// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
exports.googleCallback = async (req, res) => {
    try {
        // req.user contains the Google profile from passport strategy
        const profile = req.user;
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Check if user exists in DB
        let user = await User.findOne({ email });

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
                role: 'user' // Default role
            });
        }

        // Generate token using the Database User object (contains _id and role)
        const token = generateToken(user);

        // Redirect to frontend
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);

    } catch (error) {
        console.error('Google Auth Error:', error);
        // Redirect to login with error
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};