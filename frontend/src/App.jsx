import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar/Navbar.jsx';
import HomePage from './pages/HomePage/HomePage.jsx';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage/RegisterPage.jsx';
import CreateEvent from './components/CreateEvent/CreateEvent.jsx';
import EventDetails from './pages/EventDetails/EventDetails.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard/OrganizerDashboard.jsx';
import EventAnalytics from './pages/EventAnalytics/EventAnalytics.jsx';
import PolicyPage from './pages/PolicyPage/PolicyPage.jsx';
import Profile from './pages/Profile/Profile.jsx';

function App() {
  return (
    <Router>
      <Navbar />
      <main className="py-8">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<RegisterPage />} />

          {/* Event Detail — public */}
          <Route path="/events/:id" element={<EventDetails />} />
          {/* Legacy path kept working */}
          <Route path="/event/:id" element={<EventDetails />} />

          {/* User Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-tickets" element={<Dashboard />} />

          {/* Organizer Routes */}
          <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/organizer/create-event" element={<CreateEvent />} />
          <Route path="/event/:id/analytics" element={<EventAnalytics />} />
          <Route path="/organizer/events/:id/sales" element={<EventAnalytics />} />

          {/* Static Pages */}
          <Route path="/policy" element={<PolicyPage />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
