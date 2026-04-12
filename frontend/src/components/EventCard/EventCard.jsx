import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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

const EventCard = ({ event }) => {
  const [imgError, setImgError] = useState(false);

  const lowestPrice = event.ticketTypes?.reduce(
    (min, t) => (t.price < min ? t.price : min),
    Infinity
  );
  const displayPrice = isFinite(lowestPrice) ? `₹${lowestPrice.toLocaleString('en-IN')}` : 'Free';

  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = eventDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const categoryIcon = CATEGORY_ICONS[event.category] || '📅';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 group flex flex-col">

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
        {/* Attendees badge */}
        {typeof event.attendeesCount === 'number' && event.attendeesCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-xs text-slate-300 border border-white/10 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
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
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="line-clamp-1">{event.venue}</span>
        </p>

        <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-1">
          {event.description}
        </p>

        <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-auto">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Starting from</p>
            <span className="text-white font-bold text-base">{displayPrice}</span>
          </div>
          <Link
            to={`/events/${event._id}`}
            className="px-4 py-2 bg-slate-800 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
