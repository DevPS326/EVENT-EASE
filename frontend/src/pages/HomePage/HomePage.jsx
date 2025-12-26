import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios'; // Ensure you have axios

const Home = () => {
  // State for Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    order: 'asc'
  });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // Fetch Events (Connect this to your Backend)
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Construct query string based on filters
      const query = new URLSearchParams(filters).toString();
      const res = await axios.get(`http://localhost:5000/api/events?${query}`);
      setEvents(res.data);
    } catch (error) {
      console.error("Error fetching events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []); // Run once on mount

  return (
    <div className="min-h-screen bg-slate-950 pt-20"> {/* pt-20 to account for fixed navbar */}
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">Events</span> <br className="hidden md:block"/> That Matter.
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Book your spot at the next big concert, workshop, or meetup in your city. Seamless booking, zero hassle.
          </p>

          {/* MAIN SEARCH BAR */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-full p-2 shadow-2xl">
              <svg className="w-6 h-6 text-slate-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                name="search"
                placeholder="Search events, artists, or venues..." 
                value={filters.search}
                onChange={handleChange}
                className="w-full bg-transparent text-white placeholder-slate-400 px-4 py-2 focus:outline-none font-medium"
              />
              <button 
                onClick={fetchEvents}
                className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-violet-500/25"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- FILTER BAR (Glassmorphism) --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Category Select */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
              <select name="category" onChange={handleChange} className="bg-slate-800/50 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none appearance-none">
                <option value="">All Categories</option>
                <option value="Music">🎵 Music</option>
                <option value="Tech">💻 Tech</option>
                <option value="Workshop">🛠 Workshop</option>
                <option value="Business">💼 Business</option>
              </select>
            </div>

            {/* Price Range (Min - Max) */}
            <div className="flex flex-col gap-2">
               <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price Range</label>
               <div className="flex gap-2">
                 <input type="number" name="minPrice" placeholder="Min" onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none" />
                 <input type="number" name="maxPrice" placeholder="Max" onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none" />
               </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-2">
               <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dates</label>
               <div className="flex gap-2">
                 <input type="date" name="startDate" onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-2 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
                 <input type="date" name="endDate" onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-2 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
               </div>
            </div>

            {/* Sort & Order */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sort By</label>
              <div className="flex gap-2">
                <select name="sortBy" onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="date">Date</option>
                  <option value="price">Price</option>
                  <option value="popularity">Popularity</option>
                </select>
                <select name="order" onChange={handleChange} className="w-full bg-slate-800/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>

          </div>
          
          {/* Mobile Filter Button (Optional, can be added later) */}
          <div className="mt-6 flex justify-end">
            <button onClick={fetchEvents} className="lg:hidden w-full bg-violet-600 text-white py-3 rounded-lg font-semibold">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* --- EVENT GRID (Placeholder for Step 4) --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-white mb-8">Upcoming Events</h2>
        
        {loading ? (
          <div className="text-center text-slate-400 py-20">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-6 rounded-full bg-slate-900/50 mb-4">
              <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            </div>
            <h3 className="text-xl font-medium text-white">No events found</h3>
            <p className="text-slate-400 mt-2">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
               // This card styling is basic, we will upgrade it in the NEXT STEP
               <div key={event._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all group">
                 <div className="h-48 overflow-hidden">
                   <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                 </div>
                 <div className="p-5">
                   <p className="text-violet-400 text-sm font-medium mb-1">{new Date(event.date).toLocaleDateString()}</p>
                   <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                   <p className="text-slate-400 text-sm mb-4 line-clamp-2">{event.description}</p>
                   <div className="flex justify-between items-center">
                     <span className="text-white font-bold">₹{event.ticketTypes?.[0]?.price}</span>
                     <Link to={`/event/${event._id}`} className="text-violet-400 hover:text-white text-sm font-semibold">View Details &rarr;</Link>
                   </div>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Home;