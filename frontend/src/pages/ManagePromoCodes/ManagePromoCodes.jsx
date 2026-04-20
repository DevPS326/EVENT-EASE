import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';

const ManagePromoCodes = () => {
  const [codes, setCodes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [formOpen, setFormOpen]     = useState(false);
  const [toggling, setToggling]     = useState({}); // { [id]: true }
  const [copiedId, setCopiedId]     = useState(null);

  // Form state
  const [form, setForm] = useState({
    code:          '',
    discountType:  'percentage',
    discountValue: '',
    eventId:       '',
    usageLimit:    '',
    expiresAt:     '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents]         = useState([]); // organizer's events for scope selector

  // ── Load promo codes & events ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [promoRes, eventsRes] = await Promise.all([
          client.get('/api/promo/my'),
          client.get('/api/events/organizer'),
        ]);
        setCodes(promoRes.data.codes || promoRes.data || []);
        setEvents(eventsRes.data || []);
      } catch {
        toast.error('Failed to load promo codes.', { id: 'promo-load' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Create promo code ─────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) { toast.error('Code is required.'); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      toast.error('Discount value must be greater than 0.');
      return;
    }
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      toast.error('Percentage discount cannot exceed 100.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code:          form.code.trim().toUpperCase(),
        discountType:  form.discountType,
        discountValue: Number(form.discountValue),
        eventId:       form.eventId || null,
        usageLimit:    form.usageLimit ? Number(form.usageLimit) : null,
        expiresAt:     form.expiresAt || null,
      };
      const { data } = await client.post('/api/promo/create', payload);
      setCodes((prev) => [data.promoCode || data, ...prev]);
      setForm({ code: '', discountType: 'percentage', discountValue: '', eventId: '', usageLimit: '', expiresAt: '' });
      setFormOpen(false);
      toast.success(`Code "${payload.code}" created!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create promo code.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    setToggling((prev) => ({ ...prev, [id]: true }));
    try {
      const { data } = await client.patch(`/api/promo/${id}/toggle`);
      setCodes((prev) =>
        prev.map((c) => (c._id === id ? { ...c, isActive: data.isActive } : c))
      );
    } catch {
      toast.error('Failed to toggle code.');
    } finally {
      setToggling((prev) => ({ ...prev, [id]: false }));
    }
  };

  // ── Copy code to clipboard ────────────────────────────────────────────────
  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
      toast.success('Copied!');
    });
  };

  return (
    <div className="px-6 pt-10 pb-16 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-violet-400" />
            Promo Codes
          </h1>
          <p className="text-slate-400 text-sm mt-1">Create discount codes for your events</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setFormOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-violet-500/20"
        >
          {formOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {formOpen ? 'Cancel' : 'New Code'}
        </motion.button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-8"
          >
            <form
              onSubmit={handleCreate}
              className="bg-slate-900/70 border border-white/8 rounded-2xl p-6 space-y-5"
            >
              <h2 className="text-lg font-bold text-white mb-1">New Promo Code</h2>

              {/* Code + discount type row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER20"
                    maxLength={20}
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm font-mono tracking-widest placeholder:text-slate-600 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Discount Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm transition-colors"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>
              </div>

              {/* Value + limit + expiry row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    {form.discountType === 'percentage' ? 'Discount %' : 'Discount ₹'} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    placeholder={form.discountType === 'percentage' ? '20' : '100'}
                    min="1"
                    max={form.discountType === 'percentage' ? '100' : undefined}
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm transition-colors placeholder:text-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={form.usageLimit}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                    placeholder="Unlimited"
                    min="1"
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm transition-colors placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              {/* Event scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Event Scope
                </label>
                <select
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500 text-white px-3 py-2.5 rounded-xl outline-none text-sm transition-colors"
                >
                  <option value="">Platform-wide (all your events)</option>
                  {events.map((ev) => (
                    <option key={ev._id} value={ev._id}>{ev.title}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Restrict this code to a specific event, or leave blank to apply to all.</p>
              </div>

              <div className="flex justify-end">
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Code
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Codes list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Code pill */}
              <div className="h-8 w-28 bg-slate-800 rounded-full flex-shrink-0" />
              {/* Middle meta */}
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 bg-slate-800 rounded-full" />
                <div className="h-3 w-28 bg-slate-800 rounded-full" />
              </div>
              {/* Badge + toggle */}
              <div className="flex items-center gap-3">
                <div className="h-6 w-16 bg-slate-800 rounded-full" />
                <div className="h-8 w-8 bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
          <Tag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No promo codes yet</p>
          <p className="text-slate-600 text-sm mt-1">Create your first code using the button above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => {
            const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
            const usageFull = code.usageLimit && code.usedCount >= code.usageLimit;

            return (
              <motion.div
                key={code._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-900/60 border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${
                  code.isActive && !isExpired && !usageFull
                    ? 'border-white/8'
                    : 'border-slate-800 opacity-60'
                }`}
              >
                {/* Code pill + copy */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 flex-shrink-0">
                    <Tag className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-white font-mono font-bold text-sm tracking-widest">{code.code}</span>
                    <button
                      onClick={() => handleCopy(code.code, code._id)}
                      className="text-slate-400 hover:text-white transition-colors ml-1"
                      title="Copy code"
                    >
                      {copiedId === code._id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-white text-sm font-semibold">
                        {code.discountType === 'percentage'
                          ? `${code.discountValue}% off`
                          : `₹${code.discountValue} off`}
                      </span>
                      {code.eventId?.title ? (
                        <span className="text-xs text-slate-400 truncate">for {code.eventId.title}</span>
                      ) : (
                        <span className="text-xs text-slate-500">all events</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-slate-500">
                        Used: {code.usedCount}{code.usageLimit ? ` / ${code.usageLimit}` : ''}
                      </span>
                      {code.expiresAt && (
                        <span className={`text-xs ${isExpired ? 'text-red-400' : 'text-slate-500'}`}>
                          {isExpired ? 'Expired' : `Expires ${new Date(code.expiresAt).toLocaleDateString('en-IN')}`}
                        </span>
                      )}
                      {usageFull && !isExpired && (
                        <span className="text-xs text-red-400">Limit reached</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(code._id)}
                  disabled={toggling[code._id]}
                  className="flex items-center gap-2 text-sm font-medium transition-colors flex-shrink-0 self-end sm:self-auto"
                >
                  {toggling[code._id] ? (
                    <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  ) : code.isActive ? (
                    <>
                      <ToggleRight className="w-6 h-6 text-violet-400" />
                      <span className="text-violet-400">Active</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-6 h-6 text-slate-500" />
                      <span className="text-slate-500">Inactive</span>
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManagePromoCodes;
