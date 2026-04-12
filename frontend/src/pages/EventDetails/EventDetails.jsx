import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, ChevronDown, ChevronUp, X, Check, Clock, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import ShareButton from '../../components/ShareButton/ShareButton';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';

// ── Razorpay script loader (idempotent) ────────────────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ── Countdown hook ─────────────────────────────────────────────────────────────
const useCountdown = (targetDate) => {
  const calc = useCallback(() => {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return null;
    return {
      days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calc);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);

  return timeLeft;
};

// ── Main Component ─────────────────────────────────────────────────────────────
const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState(null);
  const [selectedTier, setSelectedTier]     = useState(null);
  const [quantity, setQuantity]             = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [imgError, setImgError]             = useState(false);

  // Reviews state
  const [reviews, setReviews]           = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ avgRating: 0, totalReviews: 0, ratingBreakdown: { 5:0,4:0,3:0,2:0,1:0 } });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating]         = useState(0);
  const [hoverRating, setHoverRating]   = useState(0);
  const [myComment, setMyComment]       = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [myReviewId, setMyReviewId]     = useState(null); // existing review _id
  const reviewsRef = useRef(null);

  // Promo code state
  const [promoOpen, setPromoOpen]       = useState(false);
  const [promoInput, setPromoInput]     = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountAmount, finalAmount }

  // Waitlist state: map of tierId → { onWaitlist, position, total, loading }
  const [waitlistMap, setWaitlistMap]     = useState({});
  const [waitlistLoading, setWaitlistLoading] = useState({});

  const timeLeft = useCountdown(event?.date);

  // ── Fetch event ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const res = await client.get(`/api/events/${id}`);
        setEvent(res.data);
        const firstAvail = res.data.ticketTypes?.find((t) => t.available > 0);
        setSelectedTier(firstAvail || res.data.ticketTypes?.[0] || null);
      } catch (err) {
        const status = err.response?.status;
        setFetchError(status === 404 ? 'Event not found.' : 'Failed to load event. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  // ── Fetch waitlist positions for sold-out tiers (auth only) ─────────────────
  useEffect(() => {
    if (!event || !isAuthenticated) return;
    const soldOutTiers = event.ticketTypes?.filter((t) => t.available === 0) || [];
    if (soldOutTiers.length === 0) return;

    soldOutTiers.forEach(async (tier) => {
      try {
        const res = await client.get('/api/waitlist/position', {
          params: { eventId: id, ticketTypeId: tier._id },
        });
        setWaitlistMap((prev) => ({ ...prev, [tier._id]: res.data }));
      } catch {
        // silently ignore — waitlist position is non-critical
      }
    });
  }, [event, isAuthenticated, id]);

  // ── Clamp quantity when selected tier changes; clear promo ──────────────────
  useEffect(() => {
    if (selectedTier) {
      setQuantity((q) => Math.min(q, Math.max(1, selectedTier.available)));
    }
    setAppliedPromo(null);
    setPromoInput('');
    setPromoOpen(false);
  }, [selectedTier]);

  // Clear promo when quantity changes (discount amount changes)
  useEffect(() => {
    setAppliedPromo(null);
  }, [quantity]);

  // Fetch reviews once event is loaded
  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await client.get(`/api/events/${id}/reviews`);
        setReviews(res.data.reviews || []);
        setReviewSummary({
          avgRating:       res.data.avgRating       || 0,
          totalReviews:    res.data.totalReviews     || 0,
          ratingBreakdown: res.data.ratingBreakdown  || { 5:0,4:0,3:0,2:0,1:0 },
        });
        // Pre-fill own review if exists
        const own = (res.data.reviews || []).find((r) => r.isOwn);
        if (own) { setMyRating(own.rating); setMyComment(own.comment || ''); setMyReviewId(own._id); }
      } catch { /* non-critical */ }
      finally { setReviewsLoading(false); }
    };
    fetchReviews();
  }, [id]);

  // Scroll to reviews section when URL has #reviews
  useEffect(() => {
    if (window.location.hash === '#reviews' && reviewsRef.current) {
      setTimeout(() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, [reviews]);

  // ── Submit review ─────────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (myRating === 0) { toast.error('Please select a star rating.'); return; }
    setReviewSubmitting(true);
    try {
      const res = await client.post('/api/reviews', { eventId: id, rating: myRating, comment: myComment });
      toast.success(myReviewId ? 'Review updated!' : 'Review submitted!');
      setMyReviewId(res.data.review._id);
      setReviewSummary({ avgRating: res.data.avgRating, totalReviews: res.data.totalReviews, ratingBreakdown: res.data.ratingBreakdown });
      // Optimistic: upsert review in list
      setReviews((prev) => {
        const updated = { ...res.data.review, user: { name: 'You' }, isOwn: true };
        const idx = prev.findIndex((r) => r.isOwn);
        if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
        return [updated, ...prev];
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Apply promo code ─────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    if (!selectedTier) return;
    setPromoLoading(true);
    try {
      const { data } = await client.post('/api/promo/validate', {
        code:         promoInput.trim(),
        eventId:      id,
        ticketTypeId: selectedTier._id,
        quantity,
      });
      if (data.valid) {
        setAppliedPromo({
          code:           data.code,
          discountAmount: data.discountAmount,
          finalAmount:    data.finalAmount,
        });
        toast.success(`"${data.code}" applied — ₹${data.discountAmount.toLocaleString('en-IN')} off!`);
      } else {
        toast.error(data.message || 'Invalid promo code.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not validate promo code.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
  };

  // ── Waitlist handlers ────────────────────────────────────────────────────────
  const handleJoinWaitlist = async (tier) => {
    if (!isAuthenticated) {
      toast.error('Please log in to join the waitlist.');
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }
    setWaitlistLoading((prev) => ({ ...prev, [tier._id]: true }));
    try {
      const { data } = await client.post('/api/waitlist/join', {
        eventId:      id,
        ticketTypeId: tier._id,
      });
      setWaitlistMap((prev) => ({
        ...prev,
        [tier._id]: { onWaitlist: true, position: data.position, total: data.total, status: 'waiting' },
      }));
      toast.success(`You're #${data.position} on the waitlist!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not join waitlist.');
    } finally {
      setWaitlistLoading((prev) => ({ ...prev, [tier._id]: false }));
    }
  };

  const handleLeaveWaitlist = async (tier) => {
    setWaitlistLoading((prev) => ({ ...prev, [tier._id]: true }));
    try {
      await client.delete('/api/waitlist/leave', {
        data: { eventId: id, ticketTypeId: tier._id },
      });
      setWaitlistMap((prev) => ({
        ...prev,
        [tier._id]: { onWaitlist: false, position: null, total: null },
      }));
      toast.success('Removed from waitlist.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not leave waitlist.');
    } finally {
      setWaitlistLoading((prev) => ({ ...prev, [tier._id]: false }));
    }
  };

  // ── Payment handler ──────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to purchase tickets.');
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    if (!selectedTier) {
      toast.error('Please select a ticket type.');
      return;
    }

    if (selectedTier.available === 0) {
      toast.error('This ticket tier is sold out.');
      return;
    }

    setPaymentLoading(true);

    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error('Could not load payment SDK. Please check your connection.');
        return;
      }

      const { data: orderData } = await client.post('/api/payments/order', {
        eventId:      event._id,
        ticketTypeId: selectedTier._id,
        quantity,
        promoCode:    appliedPromo?.code || null,
      });

      // Free ticket fast-path
      if (orderData.isFree) {
        try {
          await client.post('/api/payments/verify', {
            isFree:       true,
            eventId:      event._id,
            ticketTypeId: selectedTier._id,
            quantity,
            promoCode:    appliedPromo?.code || null,
          });
          toast.success('Booking confirmed! Your free ticket is ready.');
          navigate('/my-tickets');
        } catch (freeErr) {
          toast.error(freeErr.response?.data?.message || 'Booking failed. Please try again.');
          setPaymentLoading(false);
        }
        return;
      }

      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    orderData.currency || 'INR',
        name:        'EventEase',
        description: `${selectedTier.name} × ${quantity} — ${event.title}`,
        order_id:    orderData.id,
        prefill: {
          name:  user?.name  || '',
          email: user?.email || '',
        },
        theme: { color: '#7c3aed' },

        handler: async (response) => {
          try {
            const { data: verifyData } = await client.post('/api/payments/verify', {
              order_id:           response.razorpay_order_id,
              payment_id:         response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              eventId:            event._id,
              ticketTypeId:       selectedTier._id,
              quantity,
              promoCode:          appliedPromo?.code || null,
            });

            if (verifyData.success) {
              toast.success('Payment successful! Your tickets are confirmed.');
              navigate('/my-tickets');
            } else {
              toast.error(verifyData.message || 'Payment verification failed.');
            }
          } catch (verifyErr) {
            toast.error(
              verifyErr.response?.data?.message || 'Payment verification failed. Contact support.'
            );
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            toast('Payment cancelled.', { icon: 'ℹ️' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        toast.error(`Payment failed: ${resp.error?.description || 'Unknown error'}`);
        setPaymentLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not initiate payment. Please try again.');
      setPaymentLoading(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading event…</p>
        </div>
      </div>
    );
  }

  if (fetchError || !event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-2xl font-bold text-white">{fetchError || 'Event not found.'}</p>
        <Link to="/" className="text-violet-400 hover:underline text-sm">← Back to Events</Link>
      </div>
    );
  }

  // Derived display values
  const isSoldOut = !selectedTier || selectedTier.available === 0;

  const totalDisplay = (() => {
    if (!selectedTier) return '—';
    if (appliedPromo) return `₹${appliedPromo.finalAmount.toLocaleString('en-IN')}`;
    if (selectedTier.price === 0) return 'Free';
    return `₹${(selectedTier.price * quantity).toLocaleString('en-IN')}`;
  })();

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-16 relative overflow-hidden">

      {/* Blurred hero backdrop */}
      <div className="absolute top-0 w-full h-[55vh] z-0 pointer-events-none">
        <img
          src={imgError ? FALLBACK_IMG : (event.imageUrl || FALLBACK_IMG)}
          className="w-full h-full object-cover opacity-25 blur-sm"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/80 to-slate-950" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* ── LEFT: Event Info ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="lg:col-span-2 space-y-8"
          >

            {/* Title block */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="inline-block px-3 py-1 bg-violet-600/20 text-violet-400 rounded-full text-sm font-semibold border border-violet-600/30">
                  {event.category}
                </span>
                <ShareButton eventId={event._id} eventTitle={event.title} />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-300 text-base">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}
                  {new Date(event.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {event.venue}
                </span>
                {event.organizer?.name && (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Hosted by <span className="text-white font-medium">{event.organizer.name}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Event image */}
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800 aspect-video">
              <img
                src={imgError ? FALLBACK_IMG : (event.imageUrl || FALLBACK_IMG)}
                alt={event.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Countdown (only if event hasn't started) */}
            {timeLeft && (
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Event Starts In
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(timeLeft).map(([unit, val]) => (
                    <div key={unit} className="bg-slate-950/80 rounded-xl p-3 text-center border border-slate-800">
                      <div className="text-3xl font-bold text-white tabular-nums">{String(val).padStart(2, '0')}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">{unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-4">About This Event</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* ── Reviews ────────────────────────────────────────────────── */}
            <div id="reviews" ref={reviewsRef} className="bg-slate-900/50 border border-white/5 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">
                Reviews
                {reviewSummary.totalReviews > 0 && (
                  <span className="ml-3 text-base font-normal text-slate-400">
                    ({reviewSummary.totalReviews})
                  </span>
                )}
              </h3>

              {/* Rating summary */}
              {reviewSummary.totalReviews > 0 && (
                <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b border-slate-800">
                  {/* Big avg */}
                  <div className="flex flex-col items-center justify-center bg-slate-950/50 rounded-2xl px-8 py-4 flex-shrink-0">
                    <span className="text-5xl font-extrabold text-white">{reviewSummary.avgRating}</span>
                    <StarRow rating={reviewSummary.avgRating} size="sm" />
                    <span className="text-slate-500 text-xs mt-1">{reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Breakdown bars */}
                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map((star) => {
                      const count = reviewSummary.ratingBreakdown[star] || 0;
                      const pct   = reviewSummary.totalReviews > 0 ? Math.round((count / reviewSummary.totalReviews) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-4 text-right">{star}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Write a review (past event + authenticated) */}
              {isAuthenticated && event.date && new Date(event.date) < new Date() && (
                <div className="mb-8 bg-slate-950/40 border border-slate-800 rounded-xl p-5">
                  <p className="text-sm font-semibold text-slate-300 mb-3">
                    {myReviewId ? 'Update your review' : 'Leave a review'}
                  </p>
                  {/* Star picker */}
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setMyRating(s)}
                        className="transition-transform hover:scale-110"
                        aria-label={`Rate ${s} star${s>1?'s':''}`}
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            s <= (hoverRating || myRating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    {myRating > 0 && (
                      <span className="text-slate-400 text-sm self-center ml-2">
                        {['','Terrible','Poor','Okay','Good','Excellent'][myRating]}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Share your experience (optional)…"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 text-white text-sm px-4 py-3 rounded-xl outline-none resize-none transition-colors placeholder:text-slate-600 mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{myComment.length}/500</span>
                    <button
                      onClick={handleSubmitReview}
                      disabled={reviewSubmitting || myRating === 0}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                    >
                      {reviewSubmitting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      ) : null}
                      {myReviewId ? 'Update' : 'Submit'} Review
                    </button>
                  </div>
                </div>
              )}

              {/* Review list */}
              {reviewsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">
                  {new Date(event.date) >= new Date()
                    ? 'Reviews will be available after the event.'
                    : 'No reviews yet. Be the first!'}
                </p>
              ) : (
                <div className="space-y-5">
                  {reviews.map((r) => (
                    <div key={r._id} className={`flex gap-4 ${r.isOwn ? 'bg-violet-600/5 border border-violet-600/10 rounded-xl p-4 -mx-2' : ''}`}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                        {(r.user?.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white">
                            {r.isOwn ? 'You' : r.user?.name || 'Attendee'}
                          </span>
                          <StarRow rating={r.rating} size="xs" />
                          <span className="text-xs text-slate-600 ml-auto">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </span>
                        </div>
                        {r.comment && <p className="text-slate-300 text-sm leading-relaxed">{r.comment}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── RIGHT: Booking Card ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            className="lg:col-span-1"
          >
            <div className="sticky top-24 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-1">Get Tickets</h3>
              <p className="text-slate-500 text-sm mb-6">Select a tier to continue</p>

              {/* Ticket tier cards */}
              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {event.ticketTypes.map((tier) => {
                    const isSelected  = selectedTier?._id === tier._id;
                    const soldOut     = tier.available === 0;
                    const wl          = waitlistMap[tier._id];
                    const wlLoading   = waitlistLoading[tier._id];

                    return (
                      <div key={tier._id}>
                        <motion.button
                          onClick={() => !soldOut && setSelectedTier(tier)}
                          disabled={soldOut}
                          whileTap={!soldOut ? { scale: 0.97 } : {}}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                            soldOut
                              ? 'opacity-60 cursor-not-allowed bg-slate-950/30 border-slate-800'
                              : isSelected
                                ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/10'
                                : 'bg-slate-950/50 border-slate-800 hover:border-slate-600 cursor-pointer'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {tier.name}
                            </span>
                            <span className="text-white font-bold">
                              {tier.price === 0 ? 'Free' : `₹${tier.price.toLocaleString('en-IN')}`}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {soldOut ? (
                              <span className="text-red-400 font-medium">Sold Out</span>
                            ) : (
                              <span className={tier.available < 20 ? 'text-amber-400 font-medium' : ''}>
                                {tier.available} spots left
                              </span>
                            )}
                          </div>
                        </motion.button>

                        {/* Waitlist button for sold-out tiers */}
                        {soldOut && isAuthenticated && (
                          <motion.button
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => wl?.onWaitlist ? handleLeaveWaitlist(tier) : handleJoinWaitlist(tier)}
                            disabled={wlLoading}
                            className={`w-full mt-1.5 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-all ${
                              wl?.onWaitlist
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {wlLoading ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : wl?.onWaitlist ? (
                              <>
                                <Clock className="w-3 h-3" />
                                You're #{wl.position} on waitlist — Leave
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Join Waitlist
                                {wl?.total ? ` (${wl.total} waiting)` : ''}
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-sm mb-6">No ticket tiers available.</p>
              )}

              {/* Quantity selector */}
              {!isSoldOut && (
                <div className="flex justify-between items-center mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-300 text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors flex items-center justify-center"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-white font-bold w-5 text-center tabular-nums">{quantity}</span>
                    <button
                      onClick={() =>
                        setQuantity((q) =>
                          q < (selectedTier?.available ?? 1) ? q + 1 : q
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors flex items-center justify-center"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Promo code section (only for paid, non-sold-out tiers) */}
              {!isSoldOut && selectedTier?.price > 0 && (
                <div className="mb-4">
                  {appliedPromo ? (
                    // Applied promo pill
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                        <Check className="w-4 h-4" />
                        <span>"{appliedPromo.code}" applied</span>
                        <span className="text-emerald-300">
                          — ₹{appliedPromo.discountAmount.toLocaleString('en-IN')} off
                        </span>
                      </div>
                      <button onClick={handleRemovePromo} className="text-slate-400 hover:text-white transition-colors ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // Collapsible promo input
                    <>
                      <button
                        onClick={() => setPromoOpen((v) => !v)}
                        className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
                      >
                        <Tag className="w-4 h-4" />
                        Have a promo code?
                        {promoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <AnimatePresence>
                        {promoOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={promoInput}
                                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                                placeholder="ENTER CODE"
                                className="flex-1 bg-slate-950/70 border border-slate-700 focus:border-violet-500 text-white text-sm px-3 py-2 rounded-lg outline-none transition-colors placeholder:text-slate-600 font-mono tracking-widest"
                              />
                              <button
                                onClick={handleApplyPromo}
                                disabled={promoLoading || !promoInput.trim()}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                {promoLoading ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                ) : (
                                  'Apply'
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}

              {/* Total & CTA */}
              <div className="border-t border-slate-800 pt-5">
                {!isSoldOut && (
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400 text-sm">Total</span>
                    <div className="text-right">
                      {appliedPromo && (
                        <div className="text-sm text-slate-500 line-through">
                          ₹{(selectedTier.price * quantity).toLocaleString('en-IN')}
                        </div>
                      )}
                      <span className="text-2xl font-bold text-white">{totalDisplay}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={paymentLoading || isSoldOut}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base transition-all hover:shadow-xl hover:shadow-violet-500/25 flex items-center justify-center gap-2"
                >
                  {paymentLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      Processing…
                    </>
                  ) : isSoldOut ? (
                    'Sold Out'
                  ) : selectedTier?.price === 0 ? (
                    '🎟 Register Free'
                  ) : (
                    '🎟 Book Now'
                  )}
                </button>

                <p className="text-xs text-center text-slate-500 mt-3 flex items-center justify-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Secure payments powered by Razorpay
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

// ── Star row helper ───────────────────────────────────────────────────────────
const StarRow = ({ rating, size = 'sm' }) => {
  const sz = size === 'xs' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star
          key={s}
          className={`${sz} ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
        />
      ))}
    </div>
  );
};

export default EventDetails;
