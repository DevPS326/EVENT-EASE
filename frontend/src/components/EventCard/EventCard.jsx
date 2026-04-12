import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';

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

  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const timeStr = eventDate.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const categoryIcon = CATEGORY_ICONS[event.category] || '📅';

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 320, damping: 22 } }}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/15 transition-colors duration-300 group flex flex-col"
    >
      {/* Image */}
      <div className="h-48 overflow-hidden relative flex-shrink-0">
        <img
          src={imgError ? FALLBACK_IMG : (event.imageUrl || FALLBACK_IMG)}
          alt={event.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Category badge */}
        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-white border border-white/10">
          {categoryIcon} {event.category}
        </div>
        {/* Free badge */}
        {isFreeEvent && (
          <div className="absolute top-3 left-3 bg-emerald-500/20 backdrop-blur border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold text-emerald-400">
            FREE
          </div>
        )}
        {/* Attendees badge */}
        {typeof event.attendeesCount === 'number' && event.attendeesCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-xs text-slate-300 border border-white/10 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {event.attendeesCount.toLocaleString('en-IN')} going
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-violet-400 text-xs font-semibold mb-1 uppercase tracking-wide">
          {dateStr} · {timeStr}
        </p>
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-violet-300 transition-colors leading-tight">
          {event.title}
        </h3>

        {/* Venue */}
        <p className="text-slate-500 text-xs mb-3 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="line-clamp-1">{event.venue}</span>
        </p>

        <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-1">
          {event.description}
        </p>

        <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-auto">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">
              {isFreeEvent ? 'Admission' : 'Starting from'}
            </p>
            <span className={`font-bold text-base ${isFreeEvent ? 'text-emerald-400' : 'text-white'}`}>
              {displayPrice}
            </span>
          </div>
          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
            <Link
              to={`/events/${event._id}`}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-violet-500/20"
            >
              View Details
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default EventCard;
