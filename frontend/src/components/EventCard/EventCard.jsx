import React from 'react';
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10 transition-all group relative">
      {/* Image */}
      <div className="h-48 overflow-hidden relative">
        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
           {event.category}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        <p className="text-violet-400 text-sm font-medium mb-1 uppercase tracking-wide">
            {new Date(event.date).toLocaleDateString()}
        </p>
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-violet-300 transition-colors">
            {event.title}
        </h3>
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
            {event.description}
        </p>
        
        <div className="flex justify-between items-end border-t border-slate-800 pt-4">
          <div>
            <p className="text-xs text-slate-500">Starting from</p>
            <span className="text-white font-bold text-lg">₹{event.ticketTypes?.[0]?.price}</span>
          </div>
          <Link to={`/event/${event._id}`} className="px-4 py-2 bg-slate-800 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg transition-colors">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;