import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import EventCard from '../../components/EventCard/EventCard';
import useDebounce from '../../hooks/useDebounce';

// ── Skeleton card matches EventCard dimensions exactly ─────────────────────────
const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-48 bg-slate-800" />
    <div className="p-5 space-y-3">
      <div className="h-3 bg-slate-800 rounded w-2/5" />
      <div className="h-5 bg-slate-800 rounded w-4/5" />
      <div className="h-3 bg-slate-800 rounded w-1/3" />
      <div className="h-3 bg-slate-800 rounded w-full" />
      <div className="h-3 bg-slate-800 rounded w-3/4" />
      <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-2">
        <div className="h-5 bg-slate-800 rounded w-1/4" />
        <div className="h-8 bg-slate-800 rounded-lg w-1/4" />
      </div>
    </div>
  </div>
);

const CATEGORIES = ['Music', 'Tech', 'Workshop', 'Business', 'Art', 'Sports', 'Food'];
const SELECT_CLS =
  'w-full bg-slate-800/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all appearance-none';

// ── Main Component ─────────────────────────────────────────────────────────────
const HomePage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    order: 'asc',
  });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounce the text search so we don't hit the API on every keystroke
  const debouncedSearch = useDebounce(searchInput, 500);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      // Build params object — omit empty strings so the backend doesn't
      // receive spurious empty-string filters that match nothing.
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.category) params.category = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.order) params.order = filters.order;

      const res = await client.get('/api/events', { params });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  // Re-fetch whenever debounced search text or any filter changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ category: '', startDate: '', endDate: '', sortBy: 'date', order: 'asc' });
  };

  const hasActiveFilters =
    searchInput || filters.category || filters.startDate || filters.endDate;

  return (
    <div className="min-h-screen bg-slate-950 pt-20">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
            Discover{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
              Events
            </span>{' '}
            <br className="hidden md:block" />
            That Matter.
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Book your spot at the next big concert, workshop, or meetup. Seamless booking, zero
            hassle.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-full p-2 shadow-2xl">
              <svg
                className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search events, artists, or venues…"
                className="w-full bg-transparent text-white placeholder-slate-400 px-4 py-2 focus:outline-none font-medium"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="text-slate-400 hover:text-white mr-2 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {loading && searchInput ? (
                <div className="w-8 h-8 flex items-center justify-center mr-1">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  onClick={fetchEvents}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-violet-500/25 text-sm flex-shrink-0"
                >
                  Search
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 mb-12">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <div className="relative">
                <select name="category" value={filters.category} onChange={handleFilterChange} className={SELECT_CLS}>
                  <option value="">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Date range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                From Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm [color-scheme:dark] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                To Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm [color-scheme:dark] transition-all"
              />
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sort By
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange} className={SELECT_CLS}>
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="relative flex-shrink-0">
                  <select name="order" value={filters.order} onChange={handleFilterChange} className={`${SELECT_CLS} w-20`}>
                    <option value="asc">↑ Asc</option>
                    <option value="desc">↓ Desc</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-violet-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── EVENT GRID ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">
            {hasActiveFilters ? 'Search Results' : 'Upcoming Events'}
          </h2>
          {!loading && events.length > 0 && (
            <span className="text-sm text-slate-400">
              {events.length} event{events.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Empty State Component ──────────────────────────────────────────────────────
const EmptyState = ({ hasFilters, onClear }) => (
  <div className="text-center py-24">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900/70 border border-slate-800 mb-6">
      <svg
        className="w-10 h-10 text-slate-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">
      {hasFilters ? 'No events match your filters' : 'No events yet'}
    </h3>
    <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
      {hasFilters
        ? 'Try broadening your search or changing the filters.'
        : 'Check back soon — events are added regularly.'}
    </p>
    {hasFilters && (
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
      >
        Clear Filters
      </button>
    )}
  </div>
);

export default HomePage;
