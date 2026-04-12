import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import client from '../../api/client';

const CHART_COLORS = ['#7c3aed', '#a855f7', '#c084fc', '#e879f9', '#f0abfc'];

const EventAnalytics = () => {
  const { id } = useParams();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(`/api/events/${id}/analytics`);
      setStats(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleExportCSV = async () => {
    try {
      const res = await client.get(`/api/events/${id}/attendees/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url;
      a.download = `event_${id}_attendees.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'CSV export failed.');
    }
  };

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

  // Build recharts data arrays from ticketTypeSales
  const tierEntries = Object.entries(stats.ticketTypeSales || {});

  const barData = tierEntries.map(([name, d]) => ({
    name,
    Sold:      d.sold,
    Remaining: d.available ?? (d.totalQuantity - d.sold),
  }));

  const pieData = tierEntries
    .filter(([, d]) => d.revenue > 0)
    .map(([name, d]) => ({ name, value: d.revenue }));

  return (
    <div className="pt-10 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

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
              Dashboard
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

        {/* ── Top Stat Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard label="Total Revenue"   value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}                color="emerald" />
          <StatCard label="Tickets Sold"    value={`${stats.totalTicketsSold} / ${stats.eventCapacity}`}            color="violet" />
          <StatCard label="Available Spots" value={stats.ticketsAvailable}                                          color="blue" />
          <StatCard label="Sold Out %"      value={`${soldPct}%`}          color={soldPct >= 80 ? 'amber' : 'slate'} />
        </div>

        {/* ── Capacity Progress Bar ───────────────────────────────────── */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Overall Capacity</h3>
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

        {/* ── Charts ─────────────────────────────────────────────────── */}
        {barData.length > 0 && (
          <div className={`grid gap-6 mb-8 ${pieData.length >= 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

            {/* Bar chart — Sales by tier */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-5">Sales by Ticket Tier</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Bar dataKey="Sold"      fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Remaining" fill="#1e293b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart — Revenue share (only when ≥ 2 tiers have revenue) */}
            {pieData.length >= 2 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-5">Revenue Share</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <PieTooltip
                      formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 13 }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── Ticket Type Breakdown Table ─────────────────────────────── */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Sales by Ticket Type</h3>
          </div>

          {tierEntries.length === 0 ? (
            <p className="text-slate-500 text-sm p-6">No ticket sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {['Ticket Type', 'Price', 'Sold', 'Remaining', 'Revenue'].map((h) => (
                      <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {tierEntries.map(([name, data]) => {
                    const tierPct = data.totalQuantity > 0
                      ? Math.round((data.sold / data.totalQuantity) * 100)
                      : 0;
                    return (
                      <tr key={name} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{name}</td>
                        <td className="px-6 py-4 text-slate-300">
                          {data.price === 0 ? <span className="text-emerald-400 font-medium">Free</span> : `₹${data.price.toLocaleString('en-IN')}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-300 font-medium">{data.sold}</span>
                            <div className="flex-1 max-w-24 bg-slate-800 rounded-full h-1.5">
                              <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${tierPct}%` }} />
                            </div>
                            <span className="text-slate-500 text-xs">{tierPct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {data.available ?? (data.totalQuantity - data.sold)}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-400">
                          {data.revenue === 0 ? '—' : `₹${data.revenue.toLocaleString('en-IN')}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700 bg-slate-900/50">
                    <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-slate-300 uppercase tracking-wider">Totals</td>
                    <td className="px-6 py-4 font-bold text-white">{stats.ticketsAvailable} left</td>
                    <td className="px-6 py-4 font-bold text-emerald-400 text-base">₹{stats.totalRevenue.toLocaleString('en-IN')}</td>
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

const StatCard = ({ label, value, color }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-slate-700 transition-colors">
    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{label}</p>
    <p className={`text-3xl font-bold ${COLOR_VAL[color] || 'text-white'}`}>{value}</p>
  </div>
);

export default EventAnalytics;
