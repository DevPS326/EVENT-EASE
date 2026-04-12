import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell/NotificationBell';

const Navbar = () => {
  const { user, isAuthenticated, isOrganizer, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b supports-[backdrop-filter]:bg-slate-950/50 ${
        scrolled
          ? 'bg-slate-950/95 backdrop-blur-xl border-white/10 shadow-xl shadow-black/20'
          : 'bg-slate-950/70 backdrop-blur-md border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent group-hover:to-violet-400 transition-all duration-300">
              EventEase
            </span>
            <span className="text-2xl group-hover:-translate-y-1 group-hover:rotate-12 transition-transform duration-300">
              🚀
            </span>
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/">Events</NavLink>

            {isAuthenticated && isOrganizer && (
              <NavLink to="/organizer/dashboard">My Events</NavLink>
            )}
            {isAuthenticated && !isOrganizer && (
              <NavLink to="/my-tickets">My Tickets</NavLink>
            )}

            <NavLink to="/policy">Policy</NavLink>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-800">
                <NotificationBell />
                <Link
                  to="/profile"
                  className="text-slate-300 hover:text-white font-medium transition-colors text-sm"
                >
                  {user?.name || 'Account'}
                </Link>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={logout}
                  className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-colors"
                >
                  Logout
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-4 ml-2">
                <Link
                  to="/login"
                  className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-all"
                >
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/register"
                    className="px-6 py-2.5 rounded-full bg-white text-slate-950 hover:bg-slate-200 text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] block"
                  >
                    Sign Up
                  </Link>
                </motion.div>
              </div>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 hover:text-white p-2 transition-colors"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isMenuOpen ? 'close' : 'open'}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden bg-slate-900 border-t border-slate-800 shadow-2xl"
          >
            <div className="px-4 pt-2 pb-4 space-y-1">
              <MobileNavLink to="/" onClick={closeMenu}>Events</MobileNavLink>

              {isAuthenticated && isOrganizer && (
                <MobileNavLink to="/organizer/dashboard" onClick={closeMenu}>My Events</MobileNavLink>
              )}
              {isAuthenticated && !isOrganizer && (
                <MobileNavLink to="/my-tickets" onClick={closeMenu}>My Tickets</MobileNavLink>
              )}

              <MobileNavLink to="/policy" onClick={closeMenu}>Policy</MobileNavLink>

              {isAuthenticated ? (
                <button
                  onClick={() => { closeMenu(); logout(); }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
                >
                  Logout
                </button>
              ) : (
                <>
                  <MobileNavLink to="/login" onClick={closeMenu}>Login</MobileNavLink>
                  <MobileNavLink to="/register" onClick={closeMenu}>Sign Up</MobileNavLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const NavLink = ({ to, children }) => (
  <Link
    to={to}
    className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group"
  >
    {children}
    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-violet-500 transition-all group-hover:w-full" />
  </Link>
);

const MobileNavLink = ({ to, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
  >
    {children}
  </Link>
);

export default Navbar;
