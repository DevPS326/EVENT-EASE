import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const TicketCard = ({ ticket }) => {
  const [copied, setCopied] = useState(false);

  const event = ticket?.event || {};

  const handleShare = async () => {
    const url     = `${window.location.origin}/events/${event._id}`;
    const message = `Hey! I'm going to ${event.title} by ${event.organizer?.name || 'a campus club'} at IIT ISM. Get your tickets here: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: message, url });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 px-5 py-4">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Your Ticket</p>
        <h3 className="text-white text-lg font-bold leading-snug line-clamp-2">{event.title}</h3>
        {event.organizer?.name && (
          <p className="text-indigo-200 text-xs mt-0.5">by {event.organizer.name}</p>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-2.5 text-sm text-slate-300">
        <Row label="Ticket ID"   value={ticket.ticketId} mono />
        <Row label="Date"        value={new Date(event.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} />
        <Row label="Venue"       value={event.venue} />
        <Row label="Ticket Type" value={ticket.ticketType?.name} />
        <Row label="Price"       value={ticket.price === 0 ? 'Free' : `₹${Number(ticket.price).toLocaleString('en-IN')}`} />
      </div>

      {/* QR Code */}
      {ticket.qrCode && (
        <div className="px-5 pb-4 flex flex-col items-center gap-2">
          <div className="w-36 h-36 bg-white rounded-xl p-2 flex items-center justify-center">
            <img src={ticket.qrCode} alt="QR Code" className="w-full h-full object-contain" />
          </div>
          <p className="text-slate-600 text-xs">Scan at venue entry</p>
        </div>
      )}

      {/* Divider */}
      <div className="mx-5 border-t border-dashed border-slate-800" />

      {/* Share CTA */}
      <div className="px-5 py-4">
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all active:scale-[0.98]"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Share with Batchmates'}
        </button>
      </div>
    </div>
  );
};

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4">
    <span className="text-slate-500 flex-shrink-0">{label}</span>
    <span className={`text-right font-medium text-white ${mono ? 'font-mono text-xs tracking-wider' : ''}`}>
      {value || '—'}
    </span>
  </div>
);

export default TicketCard;
