import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [data, setData] = useState({ upcomingEvents: [], pastBookings: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Fetch User Profile for Name
        const userRes = await axios.get('http://localhost:5000/api/users/profile', config); // Adjust endpoint if needed
        setUser(userRes.data);

        // Fetch Dashboard Data
        const res = await axios.get('http://localhost:5000/api/users/dashboard', config);
        setData(res.data);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 pt-24 text-center text-white">Loading your tickets...</div>;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">{user?.name || 'User'}</span> 👋
          </h1>
          <p className="text-slate-400">Here are your tickets and event history.</p>
        </div>

        {/* --- UPCOMING EVENTS --- */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-violet-600 rounded-full"></span>
            Upcoming Events
          </h2>

          {data.upcomingEvents.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-400 mb-4">You have no upcoming events booked.</p>
              <Link to="/events" className="inline-block px-6 py-2 bg-violet-600 text-white rounded-full font-medium hover:bg-violet-700 transition">
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.upcomingEvents.map((booking) => (
                <div key={booking.ticket._id} className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all group shadow-xl">
                  {/* Event Image */}
                  <div className="h-40 overflow-hidden relative">
                    <img src={booking.event.imageUrl} alt={booking.event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                      {booking.ticketType.name}
                    </div>
                  </div>
                  
                  {/* Ticket Details */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-1">{booking.event.title}</h3>
                    <p className="text-violet-400 text-sm mb-4">
                      {new Date(booking.event.date).toLocaleDateString()} • {new Date(booking.event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    
                    <div className="flex justify-between items-center text-sm text-slate-400 mb-4">
                      <span>Venue: {booking.event.venue}</span>
                    </div>

                    <div className="border-t border-slate-700/50 pt-4 flex gap-3">
                      <button className="flex-1 bg-white text-slate-900 py-2 rounded-lg font-semibold text-sm hover:bg-slate-200 transition">
                        View Ticket (QR)
                      </button>
                      {/* Optional Cancel Button */}
                      {/* <button className="px-3 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition">✕</button> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- PAST BOOKINGS --- */}
        <section>
          <h2 className="text-xl font-bold text-slate-400 mb-6 flex items-center gap-2">
            <span className="w-2 h-8 bg-slate-700 rounded-full"></span>
            Past Events
          </h2>

          {data.pastBookings.length === 0 ? (
            <p className="text-slate-500 italic">No past bookings found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
              {data.pastBookings.map((booking) => (
                <div key={booking.ticket._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-4 items-center">
                  <img src={booking.event.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div>
                    <h4 className="font-bold text-slate-300">{booking.event.title}</h4>
                    <p className="text-sm text-slate-500">Attended on {new Date(booking.event.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Dashboard;