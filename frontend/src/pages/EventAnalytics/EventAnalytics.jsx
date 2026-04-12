import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EventAnalytics = () => {
  const { id } = useParams();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/events/:id/analytics — protected, organizer only
      // Response: { totalTicketsSold, totalRevenue, ticketTypeSales,
      //             eventCapacity, ticketsAvailable }
      const res = await client.get(`/api/events/${id}/analytics`);
      setStats(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // CSV export uses the backend's streaming endpoint — download via anchor tag.
  // Token is injected by adding it as a header via fetch + blob URL,
  // since <a href> doesn't support Authorization headers natively.
  const handleExportCSV = async () => {
    try {
      const res = await client.get(`/api/events/${id}/attendees/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `event_${id}_attendees.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'CSV export failed.');
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-white text-xl font-bold">No data found.</p>
        <Link to="/organizer/dashboard" className="text-violet-400 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const soldPct = stats.eventCapacity > 0
    ? Math.round((stats.totalTicketsSold / stats.eventCapacity) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <Link
              to="/organizer/dashboard"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-3 transition-colors group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Organizer Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white mb-1">Event Analytics</h1>
            <p className="text-slate-400 text-sm">Real-time sales and revenue breakdown.</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* ── Top Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            label="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
            color="emerald"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          />
          <StatCard
            label="Tickets Sold"
            value={`${stats.totalTicketsSold} / ${stats.eventCapacity}`}
            color="violet"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 5v2m-6-2v2M5 9h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            }
          />
          <StatCard
            label="Available Spots"
            value={stats.ticketsAvailable}
            color="blue"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            }
          />
          <StatCard
            label="Sold Out %"
            value={`${soldPct}%`}
            color={soldPct >= 80 ? 'amber' : 'slate'}
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            }
          />
        </div>

        {/* ── Capacity Progress Bar ───────────────────────────────────── */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Overall Capacity
            </h3>
            <span className="text-slate-400 text-sm">{soldPct}% sold</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                soldPct >= 90 ? 'bg-red-500' : soldPct >= 70 ? 'bg-amber-500' : 'bg-violet-500'
              }`}
              style={{ width: `${soldPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>{stats.totalTicketsSold} sold</span>
            <span>{stats.eventCapacity} total capacity</span>
          </div>
        </div>

        {/* ── Ticket Type Breakdown Table ─────────────────────────────── */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Sales by Ticket Type</h3>
          </div>

          {Object.keys(stats.ticketTypeSales || {}).length === 0 ? (
            <p className="text-slate-500 text-sm p-6">No ticket sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {['Ticket Type', 'Price', 'Sold', 'Remaining', 'Revenue'].map((h) => (
                      <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {Object.entries(stats.ticketTypeSales).map(([name, data]) => {
                    const tierPct = data.totalQuantity > 0
                      ? Math.round((data.sold / data.totalQuantity) * 100)
                      : 0;
                    return (
                      <tr key={name} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{name}</td>
                        <td className="px-6 py-4 text-slate-300">₹{data.price.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-300 font-medium">{data.sold}</span>
                            <div className="flex-1 max-w-24 bg-slate-800 rounded-full h-1.5">
                              <div
                                className="bg-violet-500 h-1.5 rounded-full"
                                style={{ width: `${tierPct}%` }}
                              />
                            </div>
                            <span className="text-slate-500 text-xs">{tierPct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {data.available ?? (data.totalQuantity - data.sold)}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">
                          ₹{data.revenue.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-900/50">
                    <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      Totals
                    </td>
                    <td className="px-6 py-4 font-bold text-white">{stats.ticketsAvailable} left</td>
                    <td className="px-6 py-4 font-bold text-emerald-400 text-base">
                      ₹{stats.totalRevenue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
const COLOR_VAL = {
  emerald: 'text-emerald-400',
  violet:  'text-violet-400',
  blue:    'text-blue-400',
  amber:   'text-amber-400',
  slate:   'text-slate-300',
};

const StatCard = ({ label, value, color, icon }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {icon}
      </svg>
    </div>
    <p className={`text-3xl font-bold ${COLOR_VAL[color] || 'text-white'}`}>{value}</p>
  </div>
);

export default EventAnalytics;
