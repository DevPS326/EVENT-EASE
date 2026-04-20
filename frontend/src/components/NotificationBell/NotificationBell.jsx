import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Ticket, Clock, Megaphone, CheckCheck, X, RefreshCw, AlertCircle, Ban } from 'lucide-react';
import client from '../../api/client';

const TYPE_META = {
  booking_confirmed: { Icon: Ticket,    color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  waitlist_spot:     { Icon: Clock,     color: 'text-amber-400',   bg: 'bg-amber-500/15'   },
  event_update:      { Icon: Megaphone,    color: 'text-violet-400',  bg: 'bg-violet-500/15'  },
  event_reminder:    { Icon: Clock,        color: 'text-sky-400',     bg: 'bg-sky-500/15'     },
  refund_processed:  { Icon: RefreshCw,    color: 'text-teal-400',    bg: 'bg-teal-500/15'    },
  event_cancelled:   { Icon: Ban,          color: 'text-red-400',     bg: 'bg-red-500/15'     },
  payment_failed:    { Icon: AlertCircle,  color: 'text-orange-400',  bg: 'bg-orange-500/15'  },
};

const POLL_INTERVAL = 60_000; // 60 s

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open,        setOpen]        = useState(false);
  const [notifs,      setNotifs]      = useState([]);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [markingAll,  setMarkingAll]  = useState(false);
  const ref = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    try {
      const { data } = await client.get('/api/notifications');
      setNotifs(data.notifications || []);
      setUnread(data.unreadCount   || 0);
    } catch { /* non-critical — swallow silently */ }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchNotifs();
    const timer = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Mark all read when dropdown opens
  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      // Optimistically zero the badge
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  // Click a notification → mark read + navigate
  const handleClick = async (notif) => {
    setOpen(false);
    if (!notif.isRead) {
      try { await client.patch(`/api/notifications/${notif._id}/read`); } catch { /* ok */ }
      setNotifs((prev) => prev.map((n) => n._id === notif._id ? { ...n, isRead: true } : n));
    }
    if (notif.link) navigate(notif.link);
  };

  // Mark all read explicitly
  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await client.patch('/api/notifications/read-all');
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* ok */ }
    finally { setMarkingAll(false); }
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.92, y: -8  }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white">Notifications</span>
              <div className="flex items-center gap-2">
                {notifs.some((n) => !n.isRead) && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-400 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    All read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-8 h-8 text-slate-700 mb-3" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifs.map((notif) => {
                  const meta = TYPE_META[notif.type] || TYPE_META.event_update;
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={notif._id}
                      onClick={() => handleClick(notif)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors ${
                        !notif.isRead ? 'bg-violet-500/5' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug mb-0.5 ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>
                      {/* Unread dot */}
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Time-ago helper ────────────────────────────────────────────────────────────
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default NotificationBell;
