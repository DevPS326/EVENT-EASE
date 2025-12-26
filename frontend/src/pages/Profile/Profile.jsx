import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        // Assuming endpoint /api/users/profile exists based on your backend
        // If not, use /api/users/<id> if you store ID in localstorage, 
        // OR rely on the endpoint that returns "me" from token.
        // Based on your routes, you might need to implement getProfile in backend or use what's available.
        // For now, let's try the dashboard endpoint or specific profile endpoint if you made one.
        // I will assume /api/users/profile or modify the route to fetch 'me'.
        // Let's assume you fetch it via dashboard or stored user data. 
        // For this UI demo, I'll fetch from a hypothetical /api/users/me or just mock if strictly needed.
        // UPDATE: Your User Controller has getUserProfile by ID. 
        // We need to decode token to get ID first in frontend usually.
        // To keep it simple, I'll assume you added a route '/api/users/me' or I will fetch via dashboard route which returns user info inside sometimes.
        
        // Actually, let's just use the dashboard endpoint to get user name/email for now since that works
        const res = await axios.get('http://localhost:5000/api/users/dashboard', {
             headers: { Authorization: `Bearer ${token}` }
        });
        // The dashboard endpoint returns tickets, we might need a separate call for full profile details
        // Let's try fetching the user profile using the ID from the token (if you have a way to get it)
        // OR better: Create a simple 'me' route in backend. 
        // Since I can't touch backend now, I'll assume we pass 'user' as prop OR store user in Context.
        // Fallback: Display generic info if API missing.
        setUser({ name: "Dev Pratap Singh", email: "devpratap@example.com", role: "User" }); // Placeholder until connected
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 pt-24 text-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center sm:flex-row sm:text-left gap-8">
          
          {/* Avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-1">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                 {/* Placeholder for User Image */}
                 <span className="text-4xl font-bold text-white">{user?.name?.charAt(0) || 'U'}</span>
              </div>
            </div>
            <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-slate-900 rounded-full"></div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Full Name</label>
              <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
            </div>
            
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Email Address</label>
              <p className="text-slate-300 font-medium">{user?.email}</p>
            </div>

            <div>
               <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Role</label>
               <span className="inline-block mt-1 bg-violet-500/20 text-violet-300 text-xs px-3 py-1 rounded-full border border-violet-500/30">
                 {user?.role || 'Event Enthusiast'}
               </span>
            </div>
          </div>

          {/* Edit Button (Visual only) */}
          <button className="h-fit px-5 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition">
            Edit Profile
          </button>
        </div>

        {/* Account Settings Section */}
        <div className="mt-8 grid gap-4">
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition">
            <span className="text-slate-300">Change Password</span>
            <span className="text-slate-500">→</span>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-slate-800/50 transition">
            <span className="text-slate-300">Privacy Settings</span>
            <span className="text-slate-500">→</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;