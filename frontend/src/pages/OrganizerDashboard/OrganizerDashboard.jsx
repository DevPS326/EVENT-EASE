import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const OrganizerDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/events/organizer', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(res.data);
      } catch (error) {
        console.error("Error fetching organizer events", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 pt-24 text-center text-white">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Organizer Dashboard</h1>
            <p className="text-slate-400">Manage your events and track performance.</p>
          </div>
          <Link to="/create-event" className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2">
            <span>+</span> Create New Event
          </Link>
        </div>

        {/* --- STATS OVERVIEW (Optional - Placeholder logic) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <p className="text-slate-400 text-sm mb-1">Total Events</p>
            <p className="text-3xl font-bold text-white">{events.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <p className="text-slate-400 text-sm mb-1">Total Attendees</p>
            <p className="text-3xl font-bold text-violet-400">
              {events.reduce((acc, curr) => acc + (curr.attendees?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <p className="text-slate-400 text-sm mb-1">Revenue (Est.)</p>
            <p className="text-3xl font-bold text-emerald-400">₹ --</p>
          </div>
        </div>

        {/* --- YOUR EVENTS LIST --- */}
        <h2 className="text-xl font-bold text-white mb-6">Your Events</h2>
        
        {events.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
            <p className="text-slate-500 mb-4">You haven't created any events yet.</p>
            <Link to="/create-event" className="text-violet-400 hover:underline">Get started now</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(event => (
              <div key={event._id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row items-center gap-6 hover:border-violet-500/30 transition-colors">
                {/* Image */}
                <img src={event.imageUrl} alt={event.title} className="w-full md:w-32 h-20 object-cover rounded-lg" />
                
                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-bold text-white">{event.title}</h3>
                  <p className="text-sm text-slate-400">
                    {new Date(event.date).toLocaleDateString()} • {event.venue}
                  </p>
                </div>

                {/* Stats Pill */}
                <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                  <span className="text-violet-400 font-bold">{event.attendees?.length || 0}</span>
                  <span className="text-slate-500 text-xs ml-2">Sold</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Link to={`/event/${event._id}/analytics`} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition">
                    Analytics
                  </Link>
                  <Link to={`/update-event/${event._id}`} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default OrganizerDashboard;