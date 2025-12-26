import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar.jsx";
import HomePage from "./pages/HomePage/HomePage.jsx";
import LoginPage from "./pages/LoginPage/LoginPage.jsx";
import CreateEvent from "./components/CreateEvent/CreateEvent.jsx";
import EventDetails from "./components/EventDetails/EventDetails.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import OrganizerDashboard from "./pages/OrganizerDashboard/OrganizerDashboard.jsx";
import EventAnalytics from "./pages/EventAnalytics/EventAnalytics.jsx";
import PolicyPage from "./pages/PolicyPage/PolicyPage.jsx";
import Profile from "./pages/Profile/Profile.jsx";

import { ThemeProvider } from "./context/ThemeContext.jsx";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Navbar />

        <main className="py-8">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Event System */}
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/event/:id/analytics" element={<EventAnalytics />} />

            {/* Dashboards */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />

            {/* Static Pages */}
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/profile" element={<Profile />} />

            {/* Add these later:
                /payment/success
                /payment/failure
            */}
          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  );
}

export default App;
