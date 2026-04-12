import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link2, Check, MessageCircle } from 'lucide-react';

// X (formerly Twitter) — inline since lucide-react doesn't export it in this version
const XIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
import toast from 'react-hot-toast';

/**
 * ShareButton — compact share popover
 *
 * Props:
 *   eventId    {string}  — event _id
 *   eventTitle {string}  — event title for pre-filled tweet/whatsapp
 *   compact    {boolean} — icon-only mode (for EventCard hover)
 */
const ShareButton = ({ eventId, eventTitle, compact = false }) => {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const url  = `${window.location.origin}/events/${eventId}`;
  const text = encodeURIComponent(`Check out "${eventTitle}" on EventEase! 🎟`);
  const encodedUrl = encodeURIComponent(url);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const SHARE_LINKS = [
    {
      label: 'Twitter / X',
      icon:  <XIcon />,
      color: 'hover:text-sky-400',
      href:  `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    },
    {
      label: 'WhatsApp',
      icon:  <MessageCircle className="w-4 h-4" />,
      color: 'hover:text-emerald-400',
      href:  `https://wa.me/?text=${text}%20${encodedUrl}`,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'flex items-center justify-center w-8 h-8 rounded-full bg-slate-950/70 backdrop-blur border border-white/10 text-white/70 hover:text-white transition-colors'
            : 'flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors border border-slate-700'
        }
        aria-label="Share event"
        title="Share"
      >
        <Share2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        {!compact && <span>Share</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: -6 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.88, y: -6  }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="absolute right-0 top-full mt-2 z-50 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="py-1">
              {SHARE_LINKS.map(({ label, icon, color, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-slate-300 ${color} text-sm transition-colors hover:bg-white/5`}
                >
                  {icon}
                  {label}
                </a>
              ))}
              <div className="border-t border-white/5 mt-1 pt-1">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-violet-400 text-sm transition-colors hover:bg-white/5 w-full text-left"
                >
                  {copied
                    ? <Check className="w-4 h-4 text-emerald-400" />
                    : <Link2 className="w-4 h-4" />
                  }
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareButton;
