import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
      // GET /api/events/organizer — returns events for the logged-in organizer.
      // NOTE: this endpoint uses Event.find() (no aggregation), so attendeesCount
      // is NOT included. Per-event sales data lives in /api/events/:id/analytics.
      const res = await client.get('/api/events/organizer');
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load your events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const now = new Date();
  const upcomingCount = events.filter((e) => new Date(e.date) > now).length;
  const totalTiers    = events.reduce((acc, e) => acc + (e.ticketTypes?.length || 0), 0);

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

        {/* ── STATS OVERVIEW ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
          <StatCard
            label="Total Events"
            value={loading ? '—' : events.length}
            icon="📅"
            color="violet"
          />
          <StatCard
            label="Upcoming Events"
            value={loading ? '—' : upcomingCount}
            icon="🚀"
            color="fuchsia"
          />
          <StatCard
            label="Total Ticket Tiers"
            value={loading ? '—' : totalTiers}
            icon="🎟"
            color="emerald"
          />
        </div>

        {/* ── YOUR EVENTS ───────────────────────────────────────────────── */}
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
            {events.map((event) => (
              <EventRow key={event._id} event={event} />
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
};

const StatCard = ({ label, value, icon, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <p className="text-slate-400 text-sm font-medium">{label}</p>
      <span className="text-xl">{icon}</span>
    </div>
    <p className={`text-4xl font-bold ${COLOR_MAP[color] || 'text-white'}`}>{value}</p>
  </div>
);

// ── Event Row ──────────────────────────────────────────────────────────────────
const EventRow = ({ event }) => {
  const [imgErr, setImgErr] = useState(false);
  const FALLBACK = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80';
  const isPast = new Date(event.date) < new Date();

  // Total capacity from ticketTypes (attendees array has been removed from schema)
  const totalCapacity = event.ticketTypes?.reduce((acc, t) => acc + (t.quantity || 0), 0) || 0;
  const totalAvailable = event.ticketTypes?.reduce((acc, t) => acc + (t.available || 0), 0) || 0;
  const soldCount = totalCapacity - totalAvailable;

  return (
    <div className={`bg-slate-900/60 border rounded-xl flex flex-col md:flex-row items-start md:items-center gap-5 p-5 hover:border-violet-500/30 transition-colors ${isPast ? 'border-slate-800 opacity-60' : 'border-slate-800'}`}>
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
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">
              Past
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {event.venue}
        </p>
        {/* Ticket tier pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {event.ticketTypes?.map((t) => (
            <span key={t._id} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {t.name} · ₹{t.price.toLocaleString('en-IN')}
            </span>
          ))}
        </div>
      </div>

      {/* Sold count pill */}
      <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-center flex-shrink-0">
        <p className="text-violet-400 font-bold text-lg">{soldCount}</p>
        <p className="text-slate-500 text-xs">
          sold / {totalCapacity}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Link
          to={`/organizer/events/${event._id}/sales`}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics
        </Link>
        <Link
          to={`/events/${event._id}`}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          View
        </Link>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
