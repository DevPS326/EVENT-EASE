import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import EventCard, { cardVariants } from '../../components/EventCard/EventCard';
import useDebounce from '../../hooks/useDebounce';

// ── Animation variants ─────────────────────────────────────────────────────────
const heroVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// ── Skeleton card ──────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
    {/* Image skeleton — matches new h-52 card */}
    <div className="h-52 bg-slate-800 animate-pulse relative">
      {/* Fake price badge top-right */}
      <div className="absolute top-3 right-3 h-6 w-16 bg-slate-700 rounded-full" />
      {/* Fake urgency placeholder top-left */}
      <div className="absolute top-3 left-3 h-6 w-20 bg-slate-700 rounded-full" />
    </div>
    {/* Content skeleton */}
    <div className="p-5 space-y-3 animate-pulse">
      <div className="h-3 bg-slate-800 rounded-full w-2/5" />
      <div className="h-5 bg-slate-800 rounded w-4/5" />
      <div className="h-3 bg-slate-800 rounded w-1/3" />
      <div className="h-3 bg-slate-800 rounded w-full" />
      <div className="h-3 bg-slate-800 rounded w-3/4" />
      {/* Full-width CTA skeleton */}
      <div className="h-9 bg-slate-800 rounded-xl w-full mt-1" />
    </div>
  </div>
);

const CATEGORIES = ['Music', 'Tech', 'Workshop', 'Business', 'Art', 'Sports', 'Food'];
const CATEGORY_ICONS = { Music: '🎵', Tech: '💻', Workshop: '🛠', Business: '💼', Art: '🎨', Sports: '⚽', Food: '🍕' };

const SELECT_CLS =
  'w-full bg-slate-800/50 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all appearance-none';

// Date preset helper
const getDatePreset = (preset) => {
  const now  = new Date();
  const pad  = (n) => String(n).padStart(2, '0');
  const fmt  = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'today') {
    return { startDate: fmt(now), endDate: fmt(now) };
  }
  if (preset === 'weekend') {
    const day = now.getDay();
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - day + 7) % 7 || 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    return { startDate: fmt(sat), endDate: fmt(sun) };
  }
  if (preset === 'week') {
    const end = new Date(now); end.setDate(now.getDate() + 7);
    return { startDate: fmt(now), endDate: fmt(end) };
  }
  if (preset === 'month') {
    const end = new Date(now); end.setMonth(now.getMonth() + 1);
    return { startDate: fmt(now), endDate: fmt(end) };
  }
  return { startDate: '', endDate: '' };
};

const STATS = [
  { value: '10,000+', label: 'Events Listed' },
  { value: '500K+',   label: 'Tickets Sold' },
  { value: '50+',     label: 'Cities' },
];

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
  const [priceFilter,   setPriceFilter]   = useState('');      // '' | 'free' | 'paid'
  const [activePreset,  setActivePreset]  = useState('');      // '' | 'today' | 'weekend' | 'week' | 'month'
  const [advancedOpen,  setAdvancedOpen]  = useState(false);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 500);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDatePreset = (preset) => {
    if (activePreset === preset) {
      setActivePreset('');
      setFilters((prev) => ({ ...prev, startDate: '', endDate: '' }));
    } else {
      setActivePreset(preset);
      const { startDate, endDate } = getDatePreset(preset);
      setFilters((prev) => ({ ...prev, startDate, endDate }));
    }
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = {};
      if (debouncedSearch)   params.search    = debouncedSearch;
      if (filters.category)  params.category  = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate)   params.endDate   = filters.endDate;
      if (filters.sortBy)    params.sortBy    = filters.sortBy;
      if (filters.order)     params.order     = filters.order;
      if (priceFilter === 'free') { params.minPrice = 0; params.maxPrice = 0; }
      if (priceFilter === 'paid') { params.minPrice = 1; }

      const res = await client.get('/api/events', { params });
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load events.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, priceFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const clearFilters = () => {
    setSearchInput('');
    setFilters({ category: '', startDate: '', endDate: '', sortBy: 'date', order: 'asc' });
    setPriceFilter('');
    setActivePreset('');
  };

  const hasActiveFilters =
    searchInput || filters.category || filters.startDate || filters.endDate || priceFilter;

  return (
    <div className="min-h-screen bg-slate-950 pt-20">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden py-28 sm:py-36">
        {/* Background glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-600/25 rounded-full blur-[130px] -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-fuchsia-600/15 rounded-full blur-[110px] -z-10 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        {/* Dot-grid overlay */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.18) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        <motion.div
          variants={heroVariants}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          {/* Headline */}
          <motion.h1
            variants={heroItem}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
          >
            Discover{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
              Events
            </span>{' '}
            <br className="hidden md:block" />
            That Matter.
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Book your spot at the next big concert, workshop, or meetup. Seamless booking, zero hassle.
          </motion.p>

          {/* Search bar */}
          <motion.div variants={heroItem} className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-full p-2 shadow-2xl">
              <Search className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" />
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
                  <X className="w-4 h-4" />
                </button>
              )}
              {loading && searchInput ? (
                <div className="w-8 h-8 flex items-center justify-center mr-1">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
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
          </motion.div>

          {/* Stats strip */}
          <motion.div
            variants={heroItem}
            className="mt-12 flex flex-wrap justify-center gap-4"
          >
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 uppercase tracking-widest leading-tight max-w-[60px]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 mb-12">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">

          {/* Row 1: Category pills */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Category</p>
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilters((p) => ({ ...p, category: '' }))}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  !filters.category
                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                All
              </motion.button>
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setFilters((p) => ({ ...p, category: p.category === cat ? '' : cat }))
                  }
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    filters.category === cat
                      ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {CATEGORY_ICONS[cat]} {cat}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Row 2: Date presets + Price toggle + Advanced toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'today',   label: 'Today' },
                { key: 'weekend', label: 'This Weekend' },
                { key: 'week',    label: 'This Week' },
                { key: 'month',   label: 'This Month' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleDatePreset(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activePreset === key
                      ? 'bg-fuchsia-600 border-fuchsia-600 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-700 hidden sm:block" />

            {/* Price pills */}
            <div className="flex gap-2">
              {[
                { key: 'free', label: '🎁 Free' },
                { key: 'paid', label: '💳 Paid' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPriceFilter((p) => (p === key ? '' : key))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    priceFilter === key
                      ? key === 'free'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {advancedOpen ? 'Hide' : 'More'} filters
            </button>
          </div>

          {/* Advanced: date range + sort (collapsible) */}
          <AnimatePresence>
          {advancedOpen && (
            <motion.div
              key="advanced-filters"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end pt-2 border-t border-slate-800">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">From Date</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
                  className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm [color-scheme:dark] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">To Date</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
                  className="bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none text-sm [color-scheme:dark] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sort By</label>
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
            </motion.div>
          )}
          </AnimatePresence>

          {hasActiveFilters && (
            <div className="flex justify-end border-t border-slate-800 pt-3">
              <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-violet-400 transition-colors flex items-center gap-1">
                <X className="w-3 h-3" />
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
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
        ) : (
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────────
const EmptyState = ({ hasFilters, onClear }) => (
  <div className="text-center py-24">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-900/70 border border-slate-800 mb-6">
      <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
