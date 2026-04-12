import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Edit2, Trash2, Eye, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/api/events/organizer');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load your events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleDelete = async (eventId) => {
    try {
      await client.delete(`/api/events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
      toast.success('Event deleted.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  const now = new Date();
  const upcomingCount = events?.filter((e) => new Date(e.date) > now).length ?? 0;
  const totalTiers    = events?.reduce((acc, e) => acc + (e.ticketTypes?.length || 0), 0) ?? 0;
  const totalSold     = events?.reduce((acc, e) => {
    const cap  = e.ticketTypes?.reduce((s, t) => s + (t.quantity  || 0), 0) || 0;
    const avail= e.ticketTypes?.reduce((s, t) => s + (t.available || 0), 0) || 0;
    return acc + (cap - avail);
  }, 0) ?? 0;

  return (
    <div className="pt-10 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Organizer Dashboard</h1>
            <p className="text-slate-400">
              Welcome back,{' '}
              <span className="text-violet-400 font-semibold">{user?.name || 'Organizer'}</span>.
              Manage and track your events below.
            </p>
          </div>
          <Link
            to="/organizer/create-event"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Event
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <StatCard label="Total Events"    value={loading ? '—' : events.length}  icon="📅" color="violet"  />
          <StatCard label="Upcoming"        value={loading ? '—' : upcomingCount}   icon="🚀" color="fuchsia" />
          <StatCard label="Tickets Sold"    value={loading ? '—' : totalSold}       icon="🎟" color="emerald" />
          <StatCard label="Ticket Tiers"    value={loading ? '—' : totalTiers}      icon="🏷" color="sky"     />
        </div>

        {/* Your Events */}
        <h2 className="text-xl font-bold text-white mb-5">Your Events</h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex gap-6 items-center animate-pulse">
                <div className="w-32 h-20 bg-slate-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-800 rounded w-2/5" />
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
            <p className="text-slate-500 mb-5">You haven&apos;t created any events yet.</p>
            <Link to="/organizer/create-event" className="text-violet-400 hover:underline text-sm">
              Create your first event →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events?.map((event) => (
              <EventRow key={event._id} event={event} onDelete={handleDelete} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  violet:  'text-violet-400',
  fuchsia: 'text-fuchsia-400',
  emerald: 'text-emerald-400',
  sky:     'text-sky-400',
};

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <span className="text-lg">{icon}</span>
    </div>
    <p className={`text-3xl font-bold ${COLOR_MAP[color] || 'text-white'}`}>{value}</p>
  </div>
);

// ── Event Row ──────────────────────────────────────────────────────────────────
const EventRow = ({ event, onDelete }) => {
  const [imgErr,       setImgErr]       = useState(false);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80';
  const isPast = new Date(event.date) < new Date();

  const totalCapacity  = event.ticketTypes?.reduce((acc, t) => acc + (t.quantity  || 0), 0) || 0;
  const totalAvailable = event.ticketTypes?.reduce((acc, t) => acc + (t.available || 0), 0) || 0;
  const soldCount      = totalCapacity - totalAvailable;
  const soldPct        = totalCapacity > 0 ? Math.round((soldCount / totalCapacity) * 100) : 0;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    await onDelete(event._id);
    setDeleting(false);
    setConfirmOpen(false);
  };

  return (
    <div className={`bg-slate-900/60 border rounded-xl flex flex-col md:flex-row items-start md:items-center gap-5 p-5 hover:border-violet-500/30 transition-colors ${isPast ? 'border-slate-800 opacity-70' : 'border-slate-800'}`}>

      {/* Image */}
      <img
        src={imgErr ? FALLBACK : (event.imageUrl || FALLBACK)}
        alt={event.title}
        onError={() => setImgErr(true)}
        className="w-full md:w-28 h-20 object-cover rounded-lg flex-shrink-0"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-base font-bold text-white truncate">{event.title}</h3>
          {isPast && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">Past</span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{event.venue}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {event.ticketTypes?.map((t) => (
            <span key={t._id} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {t.name} · {t.price === 0 ? 'Free' : `₹${t.price.toLocaleString('en-IN')}`}
            </span>
          ))}
        </div>
      </div>

      {/* Sold progress */}
      <div className="flex-shrink-0 w-28 hidden lg:block">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{soldCount} sold</span>
          <span>{soldPct}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              soldPct >= 90 ? 'bg-red-500' : soldPct >= 70 ? 'bg-amber-500' : 'bg-violet-500'
            }`}
            style={{ width: `${soldPct}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-1 text-right">{totalCapacity} total</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/organizer/events/${event._id}/sales`}
          title="Analytics"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
        </Link>
        <Link
          to={`/events/${event._id}`}
          title="View public page"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4" />
        </Link>
        <Link
          to={`/organizer/events/${event._id}/edit`}
          title="Edit event"
          className="p-2 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </Link>
        <button
          onClick={() => setConfirmOpen(true)}
          title="Delete event"
          className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {confirmOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setConfirmOpen(false)}
              className="fixed inset-0 bg-black/60 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Delete Event?</h3>
                  <p className="text-slate-400 text-sm">This will delete all tickets and send cancellation emails to attendees.</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 bg-slate-800 rounded-xl px-4 py-2 mb-5 truncate">
                {event.title}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizerDashboard;
