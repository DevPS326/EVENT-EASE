import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from './components/Navbar/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import OrganizerRoute from './components/OrganizerRoute.jsx';
import OrganizerLayout from './layouts/OrganizerLayout.jsx';

// Eagerly loaded — needed on first paint
import HomePage    from './pages/HomePage/HomePage.jsx';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback.jsx';

// Lazy loaded — split into separate chunks
const LoginPage         = lazy(() => import('./pages/LoginPage/LoginPage.jsx'));
const RegisterPage      = lazy(() => import('./pages/RegisterPage/RegisterPage.jsx'));
const EventDetails      = lazy(() => import('./pages/EventDetails/EventDetails.jsx'));
const PolicyPage        = lazy(() => import('./pages/PolicyPage/PolicyPage.jsx'));
const Dashboard         = lazy(() => import('./pages/Dashboard/Dashboard.jsx'));
const Profile           = lazy(() => import('./pages/Profile/Profile.jsx'));
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard/OrganizerDashboard.jsx'));
const CreateEvent       = lazy(() => import('./components/CreateEvent/CreateEvent.jsx'));
const EventAnalytics    = lazy(() => import('./pages/EventAnalytics/EventAnalytics.jsx'));
const CheckIn           = lazy(() => import('./pages/CheckIn/CheckIn.jsx'));
const ManagePromoCodes  = lazy(() => import('./pages/ManagePromoCodes/ManagePromoCodes.jsx'));
const EditEvent         = lazy(() => import('./pages/EditEvent/EditEvent.jsx'));

const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
  </div>
);

// ── Animated route wrapper ─────────────────────────────────────────────────────
// Must live inside <Router> to access useLocation.
// AnimatePresence keys on pathname so each navigation triggers fade+slide.
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        className="py-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Routes>

          {/* ── PUBLIC ROUTES ──────────────────────────────────────────── */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          {/* Canonical public event detail */}
          <Route path="/events/:id" element={<EventDetails />} />
          {/* Legacy path alias */}
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/policy" element={<PolicyPage />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/auth/google/callback" element={<OAuthCallback />} />

          {/* ── USER ROUTES (authenticated, any role) ──────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-tickets" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* ── ORGANIZER ROUTES (authenticated + organizer/admin role) ── */}
          <Route element={<OrganizerRoute />}>
            <Route element={<OrganizerLayout />}>
              <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
              <Route path="/organizer/create-event" element={<CreateEvent />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/organizer/events/:id/sales" element={<EventAnalytics />} />
              <Route path="/organizer/check-in" element={<CheckIn />} />
              <Route path="/organizer/promo-codes" element={<ManagePromoCodes />} />
              <Route path="/organizer/events/:id/edit" element={<EditEvent />} />
              {/* Legacy analytics path */}
              <Route path="/event/:id/analytics" element={<EventAnalytics />} />
            </Route>
          </Route>

          {/* ── CATCH-ALL ──────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </motion.main>
    </AnimatePresence>
    </Suspense>
  );
};

// ── App shell ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Navbar />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
