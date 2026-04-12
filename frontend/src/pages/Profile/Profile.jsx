import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ticket, CalendarCheck, Star, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const ROLE_LABEL = { user: 'Event Enthusiast', organizer: 'Event Organizer', admin: 'Admin' };
const ROLE_COLOR = {
  user:      'bg-violet-500/20 text-violet-300 border-violet-500/30',
  organizer: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  admin:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const Profile = () => {
  const { user, login, token } = useAuth();
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [stats, setStats]       = useState(null);

  // Fetch stats from tickets endpoint
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await client.get('/api/tickets/my');
        const upcoming = (data.upcomingEvents || []).length;
        const past     = (data.pastBookings   || []).length;
        setStats({ upcoming, past, total: upcoming + past });
      } catch { /* non-critical */ }
    };
    load();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const onSubmit = async (data) => {
    if (!user?._id) {
      toast.error('Could not identify your account. Please log in again.');
      return;
    }
    setSaving(true);
    try {
      const res = await client.put(`/api/users/${user._id}`, data);
      // Merge the updated fields back into auth context + localStorage
      login({ token, ...user, ...res.data });
      toast.success('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    reset({ name: user?.name || '', email: user?.email || '' });
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

        {/* ── Profile Card ──────────────────────────────────────────── */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{initials}</span>
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>

            {/* Info / Edit Form */}
            <div className="flex-1 w-full">
              {editing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <input
                      {...register('name')}
                      className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={saving || !isDirty}
                      className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      {saving && (
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      )}
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-5 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Full Name</p>
                    <h2 className="text-xl font-bold text-white">{user?.name || '—'}</h2>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Email Address</p>
                    <p className="text-slate-300">{user?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Role</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${ROLE_COLOR[user?.role] || ROLE_COLOR.user}`}>
                      {ROLE_LABEL[user?.role] || 'Event Enthusiast'}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-2 flex items-center gap-2 px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              icon: <Ticket className="w-5 h-5" />,
              label: 'Total Tickets',
              value: stats ? stats.total : '—',
              color: 'text-violet-400',
            },
            {
              icon: <CalendarCheck className="w-5 h-5" />,
              label: 'Events Attended',
              value: stats ? stats.past : '—',
              color: 'text-emerald-400',
            },
            {
              icon: <Clock className="w-5 h-5" />,
              label: 'Upcoming',
              value: stats ? stats.upcoming : '—',
              color: 'text-fuchsia-400',
            },
          ].map(({ icon, label, value, color }) => (
            <div
              key={label}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-center hover:border-slate-700 transition-colors"
            >
              <div className={`flex justify-center mb-2 ${color}`}>{icon}</div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Account Settings ───────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">
            Account Settings
          </h2>
          {[
            { label: 'Change Password', icon: '🔐' },
            { label: 'Notification Preferences', icon: '🔔' },
            { label: 'Privacy Settings', icon: '🛡' },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 px-5 py-4 rounded-xl flex justify-between items-center cursor-pointer transition-colors text-left group"
              onClick={() => toast('Coming soon!', { icon: '🚧' })}
            >
              <span className="text-slate-300 group-hover:text-white transition-colors text-sm font-medium flex items-center gap-3">
                <span>{item.icon}</span>
                {item.label}
              </span>
              <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Profile;
