// backend/controllers/promoController.js
const logger = require('../utils/logger');
const DiscountCode = require('../models/DiscountCode');
const Event        = require('../models/Event');

const sendError = (res, status, msg) => res.status(status).json({ success: false, message: msg });

// ─── Validate (preview) a promo code ────────────────────────────────────────
// @route  POST /api/promo/validate
// @access Private (any authenticated user)
exports.validatePromo = async (req, res) => {
  const { code, eventId, ticketTypeId, quantity = 1 } = req.body;
  if (!code) return sendError(res, 400, 'code is required');

  try {
    const discount = await DiscountCode.findOne({ code: code.toUpperCase().trim(), isActive: true });
    if (!discount) return sendError(res, 404, 'Promo code not found');

    const validationError = discount.validate();
    if (validationError) return sendError(res, 400, validationError);

    // If code is event-scoped, enforce it
    if (discount.eventId && eventId && discount.eventId.toString() !== eventId) {
      return sendError(res, 400, 'Promo code is not valid for this event');
    }

    // Calculate discounted amount
    let originalAmount = 0;
    if (eventId && ticketTypeId) {
      const event = await Event.findById(eventId);
      const tier  = event?.ticketTypes.id(ticketTypeId);
      if (tier) originalAmount = tier.price * Number(quantity);
    }

    const discountedAmount = discount.applyTo(originalAmount);
    const discountAmount   = originalAmount - discountedAmount;

    return res.status(200).json({
      success:        true,
      code:           discount.code,
      discountType:   discount.discountType,
      discountValue:  discount.discountValue,
      originalAmount,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount:    Math.round(discountedAmount * 100) / 100,
    });
  } catch (err) {
    logger.error('validatePromo error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// ─── Create a promo code ─────────────────────────────────────────────────────
// @route  POST /api/promo/create
// @access Private — organizer only
exports.createPromo = async (req, res) => {
  const { code, discountType, discountValue, eventId, usageLimit, expiresAt } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    return sendError(res, 400, 'code, discountType and discountValue are required');
  }
  if (!['percentage', 'flat'].includes(discountType)) {
    return sendError(res, 400, 'discountType must be "percentage" or "flat"');
  }
  if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
    return sendError(res, 400, 'Percentage discount must be between 0 and 100');
  }

  try {
    // If scoped to an event, verify organizer owns it
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) return sendError(res, 404, 'Event not found');
      if (event.organizer.toString() !== req.user.id) {
        return sendError(res, 403, 'You do not manage this event');
      }
    }

    const discount = await DiscountCode.create({
      code:          code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      eventId:       eventId || null,
      usageLimit:    usageLimit ? Number(usageLimit) : null,
      expiresAt:     expiresAt ? new Date(expiresAt) : null,
      createdBy:     req.user.id,
    });

    return res.status(201).json({ success: true, discount });
  } catch (err) {
    if (err.code === 11000) return sendError(res, 409, 'A promo code with that name already exists');
    logger.error('createPromo error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// ─── List promo codes for organizer's events ─────────────────────────────────
// @route  GET /api/promo/my
// @access Private — organizer only
exports.getMyPromos = async (req, res) => {
  try {
    const codes = await DiscountCode.find({ createdBy: req.user.id })
      .populate('eventId', 'title')
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(codes);
  } catch (err) {
    logger.error('getMyPromos error:', err);
    return sendError(res, 500, 'Server error');
  }
};

// ─── Toggle active status ────────────────────────────────────────────────────
// @route  PATCH /api/promo/:id/toggle
// @access Private — organizer only (must own the code)
exports.togglePromo = async (req, res) => {
  try {
    const discount = await DiscountCode.findById(req.params.id);
    if (!discount) return sendError(res, 404, 'Promo code not found');
    if (discount.createdBy.toString() !== req.user.id) {
      return sendError(res, 403, 'Not authorized');
    }
    discount.isActive = !discount.isActive;
    await discount.save();
    return res.status(200).json({ success: true, isActive: discount.isActive });
  } catch (err) {
    logger.error('togglePromo error:', err);
    return sendError(res, 500, 'Server error');
  }
};
