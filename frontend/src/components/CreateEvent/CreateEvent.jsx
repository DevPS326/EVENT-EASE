import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    venue: '',
    category: 'Music',
    imageUrl: '',
    ticketTypes: [{ name: 'General Admission', price: '', quantity: '' }]
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle Dynamic Ticket Types
  const handleTicketChange = (index, e) => {
    const newTickets = [...formData.ticketTypes];
    newTickets[index][e.target.name] = e.target.value;
    setFormData({ ...formData, ticketTypes: newTickets });
  };

  const addTicketType = () => {
    setFormData({
      ...formData,
      ticketTypes: [...formData.ticketTypes, { name: '', price: '', quantity: '' }]
    });
  };

  const removeTicketType = (index) => {
    const newTickets = formData.ticketTypes.filter((_, i) => i !== index);
    setFormData({ ...formData, ticketTypes: newTickets });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/events/create', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard'); // Or Organizer Dashboard
    } catch (error) {
      console.error("Error creating event", error);
      alert("Failed to create event. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Create New Event</h1>
          <p className="text-slate-400">Launch your event and start selling tickets in minutes.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          
          {/* --- Section 1: Basic Info --- */}
          <div className="space-y-6 mb-8">
            <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">Event Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Event Title</label>
              <input type="text" name="title" required placeholder="e.g. Neon Music Festival 2024" onChange={handleChange}
                className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder-slate-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea name="description" required rows="4" placeholder="Tell people what makes your event special..." onChange={handleChange}
                className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder-slate-500 resize-none"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Date & Time</label>
                <input type="datetime-local" name="date" required onChange={handleChange}
                  className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all [color-scheme:dark]" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                <select name="category" onChange={handleChange} className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all">
                  <option value="Music">🎵 Music</option>
                  <option value="Tech">💻 Tech</option>
                  <option value="Workshop">🛠 Workshop</option>
                  <option value="Business">💼 Business</option>
                  <option value="Art">🎨 Art</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Venue / Location</label>
              <input type="text" name="venue" required placeholder="e.g. Grand Convention Center, Mumbai" onChange={handleChange}
                className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder-slate-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Banner Image URL</label>
              <input type="url" name="imageUrl" required placeholder="https://example.com/image.jpg" onChange={handleChange}
                className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none transition-all placeholder-slate-500" />
              <p className="text-xs text-slate-500 mt-1">Use a high-quality image link (unsplash, imgur, etc.)</p>
            </div>
          </div>

          {/* --- Section 2: Tickets --- */}
          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h2 className="text-xl font-semibold text-white">Ticket Tiers</h2>
              <button type="button" onClick={addTicketType} className="text-violet-400 text-sm font-medium hover:text-violet-300 transition">+ Add Tier</button>
            </div>

            {formData.ticketTypes.map((ticket, index) => (
              <div key={index} className="bg-slate-950/30 p-4 rounded-xl border border-slate-800 relative group hover:border-slate-700 transition">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1">Ticket Name</label>
                    <input type="text" name="name" placeholder="e.g. VIP" value={ticket.name} onChange={(e) => handleTicketChange(index, e)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Price (₹)</label>
                    <input type="number" name="price" placeholder="0" value={ticket.price} onChange={(e) => handleTicketChange(index, e)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Quantity</label>
                    <input type="number" name="quantity" placeholder="100" value={ticket.quantity} onChange={(e) => handleTicketChange(index, e)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none text-sm" />
                  </div>
                </div>
                {formData.ticketTypes.length > 1 && (
                  <button type="button" onClick={() => removeTicketType(index)} 
                    className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-500/25 transition-all transform hover:-translate-y-0.5"
          >
            {loading ? 'Publishing Event...' : '🚀 Publish Event'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateEvent;