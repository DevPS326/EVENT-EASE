import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const EventAnalytics = () => {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/events/${id}/analytics`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (error) {
        console.error("Error fetching analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 pt-24 text-center text-white">Loading Analytics...</div>;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Event Analytics</h1>
        <p className="text-slate-400 mb-8">Detailed breakdown of sales and revenue.</p>

        {/* --- Top Stats Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <p className="text-slate-400 text-sm font-semibold uppercase">Total Revenue</p>
                <h2 className="text-4xl font-bold text-emerald-400 mt-2">₹{stats?.totalRevenue}</h2>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <p className="text-slate-400 text-sm font-semibold uppercase">Tickets Sold</p>
                <h2 className="text-4xl font-bold text-violet-400 mt-2">{stats?.totalTicketsSold} <span className="text-lg text-slate-500 font-normal">/ {stats?.eventCapacity}</span></h2>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                <p className="text-slate-400 text-sm font-semibold uppercase">Availability</p>
                <h2 className="text-4xl font-bold text-blue-400 mt-2">{stats?.ticketsAvailable} <span className="text-lg text-slate-500 font-normal">left</span></h2>
            </div>
        </div>

        {/* --- Ticket Type Breakdown --- */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Sales by Ticket Type</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700 text-slate-400 text-sm uppercase">
                            <th className="pb-4">Ticket Type</th>
                            <th className="pb-4">Price</th>
                            <th className="pb-4">Sold</th>
                            <th className="pb-4">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-300">
                        {Object.keys(stats?.ticketTypeSales || {}).map((key) => {
                            const data = stats.ticketTypeSales[key];
                            return (
                                <tr key={key} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition">
                                    <td className="py-4 font-medium text-white">{key}</td>
                                    <td className="py-4">₹{data.price}</td>
                                    <td className="py-4">
                                        {data.sold} <span className="text-xs text-slate-500">/ {data.totalQuantity}</span>
                                    </td>
                                    <td className="py-4 font-bold text-emerald-400">₹{data.revenue}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div className="mt-8 flex justify-end">
            <a href={`http://localhost:5000/api/events/${id}/attendees/export`} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2">
                Download Attendee List (CSV) ⬇
            </a>
        </div>
      </div>
    </div>
  );
};

export default EventAnalytics;