const express = require('express');
const router  = express.Router();
const { protect }     = require('../middleware/authMiddleware');
const { isOrganizer } = require('../middleware/organizerMiddleware');
const { validatePromo, createPromo, getMyPromos, togglePromo } = require('../controllers/promoController');

router.post('/validate',     protect, validatePromo);
router.post('/create',       protect, isOrganizer, createPromo);
router.get('/my',            protect, isOrganizer, getMyPromos);
router.patch('/:id/toggle',  protect, isOrganizer, togglePromo);

module.exports = router;
