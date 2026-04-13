import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';
import ShareButton from '../ShareButton/ShareButton';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

const CATEGORY_ICONS = {
  Music: '🎵',
  Tech: '💻',
  Workshop: '🛠',
  Business: '💼',
  Art: '🎨',
  Sports: '⚽',
  Food: '🍕',
};

// Variants consumed by the stagger container in HomePage
export const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
};

const EventCard = ({ event }) => {
  const [imgError, setImgError] = useState(false);

  const lowestPrice = event.ticketTypes?.reduce(
    (min, t) => (t.price < min ? t.price : min),
    Infinity
  );
  const isFreeEvent  = isFinite(lowestPrice) && lowestPrice === 0;
  const displayPrice = isFreeEvent
    ? 'Free'
    : isFinite(lowestPrice)
      ? `₹${lowestPrice.toLocaleString('en-IN')}`
      : '—';

  // Urgency badge — computed from all ticket types
  const totalAvailable = event.ticketTypes?.reduce((s, t) => s + (t.available ?? 0), 0) ?? 0;
  const totalCapacity  = event.ticketTypes?.reduce((s, t) => s + (t.quantity  ?? 0), 0) ?? 0;
  const urgency =
    totalCapacity > 0 && totalAvailable > 0 && totalAvailable <= 5
      ? 'almost-gone'
      : totalCapacity > 0 && totalAvailable > 0 && totalAvailable / totalCapacity < 0.2
        ? 'selling-fast'
        : null;

  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const categoryIcon = CATEGORY_ICONS[event.category] || '📅';

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6, scale: 1.03, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/40 hover:shadow-2xl hover:shadow-violet-500/20 transition-colors duration-300 group flex flex-col"
    >
      {/* ── IMAGE ──────────────────────────────────────────────────────────── */}
      <div className="aspect-video overflow-hidden relative flex-shrink-0">
        <img
          src={imgError ? FALLBACK_IMG : (event.imageUrl || FALLBACK_IMG)}
          alt={event.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient overlay for bottom-badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

        {/* Floating price badge — top right (glassmorphism) */}
        <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full shadow-lg">
          <span className={`text-xs font-bold tracking-wide ${isFreeEvent ? 'text-emerald-400' : 'text-white'}`}>
            {isFreeEvent ? '🎁 Free' : displayPrice}
          </span>
        </div>

        {/* Urgency badge — top left */}
        {urgency === 'almost-gone' ? (
          <div className="absolute top-3 left-3 bg-red-500/20 backdrop-blur-md border border-red-500/40 px-3 py-1 rounded-full text-xs font-bold text-red-400 animate-pulse">
            🔥 Almost Gone
          </div>
        ) : urgency === 'selling-fast' ? (
          <div className="absolute top-3 left-3 bg-amber-500/20 backdrop-blur-md border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold text-amber-400">
            ⚡ Selling Fast
          </div>
        ) : null}

        {/* Attendees badge — bottom left */}
        {typeof event.attendeesCount === 'number' && event.attendeesCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs text-slate-300 border border-white/10 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {event.attendeesCount.toLocaleString('en-IN')} going
          </div>
        )}

        {/* Share button — bottom right, visible on hover */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ShareButton eventId={event._id} eventTitle={event.title} compact />
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category + Date */}
        <p className="text-violet-400 text-xs font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
          <span>{categoryIcon} {event.category}</span>
          <span className="text-slate-700">·</span>
          <span>{dateStr}</span>
        </p>

        <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-2 group-hover:text-violet-300 transition-colors leading-tight">
          {event.title}
        </h3>

        <p className="text-slate-500 text-xs mb-1.5 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{event.venue}</span>
        </p>

        {event.organizer?.name && (
          <p className="text-indigo-400 text-xs font-medium mb-3">
            by {event.organizer.name}
          </p>
        )}

        <p className="text-slate-400 text-sm mb-5 line-clamp-2 flex-1">
          {event.description}
        </p>

        {/* CTA — full width gradient button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Link
            to={`/events/${event._id}`}
            className="block w-full text-center px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
          >
            View Details
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EventCard;
