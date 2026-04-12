import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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

  const timeLeft = useCountdown(event?.date);

  // ── Fetch event (public endpoint — no auth required) ────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const res = await client.get(`/api/events/${id}`);
        setEvent(res.data);
        // Auto-select first tier that still has availability
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

  // Clamp quantity whenever the selected tier changes
  useEffect(() => {
    if (selectedTier) {
      setQuantity((q) => Math.min(q, Math.max(1, selectedTier.available)));
    }
  }, [selectedTier]);

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
      // ── 1. Load Razorpay SDK ─────────────────────────────────────────────
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        toast.error('Could not load payment SDK. Please check your connection.');
        return;
      }

      // ── 2. Create Order (server calculates amount — do NOT send amount) ──
      // POST /api/payments/order requires: { eventId, ticketTypeId, quantity }
      const { data: orderData } = await client.post('/api/payments/order', {
        eventId:      event._id,
        ticketTypeId: selectedTier._id,
        quantity,
      });

      // ── 2b. Free ticket fast-path — skip Razorpay modal entirely ─────────
      if (orderData.isFree) {
        try {
          await client.post('/api/payments/verify', {
            isFree:       true,
            eventId:      event._id,
            ticketTypeId: selectedTier._id,
            quantity,
          });
          toast.success('Booking confirmed! Your free ticket is ready.');
          navigate('/my-tickets');
        } catch (freeErr) {
          toast.error(freeErr.response?.data?.message || 'Booking failed. Please try again.');
          setPaymentLoading(false);
        }
        return;
      }

      // ── 3. Open Razorpay modal ────────────────────────────────────────────
      const options = {
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      orderData.amount,   // in paise, from server
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
          // ── 4. Verify payment & create tickets ─────────────────────────
          // POST /api/payments/verify requires:
          // { order_id, payment_id, razorpay_signature, eventId, ticketTypeId, quantity }
          // Do NOT send amount — server fetches it from Razorpay directly.
          try {
            const { data: verifyData } = await client.post('/api/payments/verify', {
              order_id:          response.razorpay_order_id,
              payment_id:        response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              eventId:            event._id,
              ticketTypeId:       selectedTier._id,
              quantity,
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
    // Note: setPaymentLoading(false) is intentionally NOT called here in the
    // success path — the handler redirects the user away from the page.
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

  const totalDisplay = selectedTier
    ? selectedTier.price === 0
      ? 'Free'
      : `₹${(selectedTier.price * quantity).toLocaleString('en-IN')}`
    : '—';

  const isSoldOut = !selectedTier || selectedTier.available === 0;

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
          <div className="lg:col-span-2 space-y-8">

            {/* Title block */}
            <div>
              <span className="inline-block px-3 py-1 bg-violet-600/20 text-violet-400 rounded-full text-sm font-semibold mb-4 border border-violet-600/30">
                {event.category}
              </span>
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
          </div>

          {/* ── RIGHT: Booking Card ──────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-1">Get Tickets</h3>
              <p className="text-slate-500 text-sm mb-6">Select a tier to continue</p>

              {/* Ticket tier cards */}
              {event.ticketTypes && event.ticketTypes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {event.ticketTypes.map((tier) => {
                    const isSelected = selectedTier?._id === tier._id;
                    const soldOut    = tier.available === 0;
                    return (
                      <button
                        key={tier._id}
                        onClick={() => !soldOut && setSelectedTier(tier)}
                        disabled={soldOut}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                          soldOut
                            ? 'opacity-50 cursor-not-allowed bg-slate-950/30 border-slate-800'
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
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-sm mb-6">No ticket tiers available.</p>
              )}

              {/* Quantity selector */}
              {!isSoldOut && (
                <div className="flex justify-between items-center mb-6 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
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

              {/* Total & CTA */}
              <div className="border-t border-slate-800 pt-5">
                {!isSoldOut && (
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-400 text-sm">Total</span>
                    <span className="text-2xl font-bold text-white">{totalDisplay}</span>
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
          </div>

        </div>
      </div>
    </div>
  );
};

export default EventDetails;
