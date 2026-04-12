import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import OrganizerRoute from './components/OrganizerRoute.jsx';

// Public pages
import HomePage from './pages/HomePage/HomePage.jsx';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage/RegisterPage.jsx';
import EventDetails from './pages/EventDetails/EventDetails.jsx';
import PolicyPage from './pages/PolicyPage/PolicyPage.jsx';

// User-only pages (require auth)
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Profile from './pages/Profile/Profile.jsx';

// Organizer-only pages (require auth + organizer role)
import OrganizerDashboard from './pages/OrganizerDashboard/OrganizerDashboard.jsx';
import CreateEvent from './components/CreateEvent/CreateEvent.jsx';
import EventAnalytics from './pages/EventAnalytics/EventAnalytics.jsx';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="py-8">
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

          {/* ── USER ROUTES (authenticated, any role) ──────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-tickets" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* ── ORGANIZER ROUTES (authenticated + organizer/admin role) ── */}
          <Route element={<OrganizerRoute />}>
            <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
            <Route path="/organizer/create-event" element={<CreateEvent />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/organizer/events/:id/sales" element={<EventAnalytics />} />
            {/* Legacy analytics path */}
            <Route path="/event/:id/analytics" element={<EventAnalytics />} />
          </Route>

          {/* ── CATCH-ALL ──────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>
    </Router>
  );
}

export default App;
