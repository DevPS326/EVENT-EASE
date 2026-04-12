import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── QR Ticket Modal ────────────────────────────────────────────────────────────
const TicketModal = ({ booking, onClose }) => {
  if (!booking) return null;
  const { ticket, event, ticketType } = booking;
  const qrValue = ticket.qrCode || ticket.ticketId || ticket._id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ticket header stripe */}
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
            EventEase Ticket
          </p>
          <h3 className="text-xl font-bold text-white leading-tight">{event.title}</h3>
          <p className="text-white/80 text-sm mt-1">{ticketType?.name || 'Standard'}</p>
        </div>

        {/* Ticket body */}
        <div className="px-6 py-5 space-y-4">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Date</p>
              <p className="text-white font-medium">
                {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Time</p>
              <p className="text-white font-medium">
                {new Date(event.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Venue</p>
              <p className="text-white font-medium">{event.venue}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Ticket ID</p>
              <p className="text-violet-400 font-mono text-xs">{ticket.ticketId || ticket._id}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Price Paid</p>
              <p className="text-emerald-400 font-bold">₹{ticket.price?.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Tear line */}
          <div className="relative flex items-center gap-3 my-2">
            <div className="w-5 h-5 rounded-full bg-slate-950 -ml-9 flex-shrink-0" />
            <div className="flex-1 border-t-2 border-dashed border-slate-700" />
            <div className="w-5 h-5 rounded-full bg-slate-950 -mr-9 flex-shrink-0" />
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-xl shadow-inner">
              <QRCodeSVG
                value={qrValue}
                size={160}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-slate-500 text-xs text-center">
              Present this QR code at the venue entrance
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ── Skeleton card ──────────────────────────────────────────────────────────────
const SkeletonTicket = () => (
  <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-36 bg-slate-800" />
    <div className="p-5 space-y-3">
      <div className="h-5 bg-slate-800 rounded w-3/4" />
      <div className="h-3 bg-slate-800 rounded w-1/2" />
      <div className="h-3 bg-slate-800 rounded w-2/5" />
      <div className="h-9 bg-slate-800 rounded-lg mt-4" />
    </div>
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData]         = useState({ upcomingEvents: [], pastBookings: [] });
  const [loading, setLoading]   = useState(true);
  const [activeModal, setActiveModal] = useState(null); // booking object

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/tickets/my returns { upcomingEvents, pastBookings }
      // Each item: { ticket: { _id, ticketId, qrCode, price, ticketType, event }, event, ticketType }
      const res = await client.get('/api/tickets/my');
      setData({
        upcomingEvents: res.data.upcomingEvents || [],
        pastBookings:   res.data.pastBookings   || [],
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const totalTickets = data.upcomingEvents.length + data.pastBookings.length;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {activeModal && (
        <TicketModal booking={activeModal} onClose={() => setActiveModal(null)} />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Hello,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
              {user?.name || 'there'}
            </span>{' '}
            👋
          </h1>
          <p className="text-slate-400">
            You have{' '}
            <span className="text-white font-semibold">{loading ? '…' : totalTickets}</span>{' '}
            ticket{totalTickets !== 1 ? 's' : ''} across all events.
          </p>
        </div>

        {/* ── UPCOMING TICKETS ────────────────────────────────────────── */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-violet-600 rounded-full" />
            Upcoming Events
            {!loading && data.upcomingEvents.length > 0 && (
              <span className="text-sm font-normal text-slate-400">
                ({data.upcomingEvents.length})
              </span>
            )}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <SkeletonTicket key={i} />)}
            </div>
          ) : data.upcomingEvents.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-full border border-slate-800 mb-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m-6-2v2M5 9h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-400 mb-5">You have no upcoming events booked yet.</p>
              <Link to="/" className="inline-block px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-medium text-sm transition-colors">
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.upcomingEvents.map((booking) => (
                <TicketCard
                  key={booking.ticket._id}
                  booking={booking}
                  onViewQR={() => setActiveModal(booking)}
                  variant="upcoming"
                />
              ))}
            </div>
          )}
        </section>

        {/* ── PAST BOOKINGS ────────────────────────────────────────────── */}
        {!loading && data.pastBookings.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-400 mb-6 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-slate-700 rounded-full" />
              Past Events
              <span className="text-sm font-normal text-slate-500">
                ({data.pastBookings.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
              {data.pastBookings.map((booking) => (
                <TicketCard
                  key={booking.ticket._id}
                  booking={booking}
                  onViewQR={() => setActiveModal(booking)}
                  variant="past"
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

// ── Individual ticket card ─────────────────────────────────────────────────────
const TicketCard = ({ booking, onViewQR, variant }) => {
  const { ticket, event, ticketType } = booking;
  const [imgErr, setImgErr] = useState(false);
  const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

  return (
    <div className={`bg-slate-900/60 backdrop-blur-md border rounded-2xl overflow-hidden transition-all group shadow-xl ${
      variant === 'upcoming'
        ? 'border-white/10 hover:border-violet-500/30'
        : 'border-slate-800 grayscale hover:grayscale-0'
    }`}>
      {/* Image */}
      <div className="h-36 overflow-hidden relative">
        <img
          src={imgErr ? FALLBACK : (event.imageUrl || FALLBACK)}
          alt={event.title}
          onError={() => setImgErr(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-white border border-white/10">
          {ticketType?.name || 'Standard'}
        </div>
        {variant === 'past' && (
          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
            <span className="bg-slate-950/80 border border-slate-700 text-slate-400 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Attended
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-5">
        <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{event.title}</h3>
        <p className="text-violet-400 text-xs mb-1">
          {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {new Date(event.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </p>
        <p className="text-slate-500 text-xs mb-4 flex items-center gap-1 line-clamp-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          {event.venue}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-emerald-400 text-sm font-bold">
            ₹{ticket.price?.toLocaleString('en-IN')}
          </span>
          <button
            onClick={onViewQR}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-violet-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3v3m0-3v.01M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" />
            </svg>
            View Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
