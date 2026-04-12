import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, PlusCircle, ScanLine, Menu, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/organizer/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/organizer/create-event', label: 'Create Event', Icon: PlusCircle },
  { to: '/organizer/check-in',     label: 'Check-In',     Icon: ScanLine },
];

const OrganizerLayout = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-lg font-extrabold bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
            EventEase
          </span>
          <span className="text-base group-hover:-translate-y-0.5 transition-transform">🚀</span>
        </Link>
        <p className="text-xs text-slate-500 mt-1">Organizer Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
                {label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {(user?.name || 'O').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Organizer'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex pt-20">

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed top-20 left-0 h-[calc(100vh-5rem)] bg-slate-900/60 backdrop-blur-xl border-r border-white/5 z-30">
        {sidebarContent}
      </aside>

      {/* ── MOBILE SIDEBAR TOGGLE ────────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center shadow-xl shadow-violet-500/30 transition-colors"
        aria-label="Open organizer menu"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* ── MOBILE SIDEBAR DRAWER ────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-60 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default OrganizerLayout;
