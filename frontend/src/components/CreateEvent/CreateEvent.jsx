import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../../api/client';

const CATEGORIES = ['Music', 'Tech', 'Workshop', 'Business', 'Art', 'Sports', 'Food'];

const defaultTier = () => ({ name: '', price: '', quantity: '' });

const CreateEvent = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title:       '',
    description: '',
    date:        '',
    venue:       '',
    category:    'Music',
    imageUrl:    '',
  });

  // Dynamic ticket-tier array — each tier: { name, price, quantity }
  const [ticketTypes, setTicketTypes] = useState([
    { name: 'General Admission', price: '', quantity: '' },
  ]);

  const [errors, setErrors] = useState({});

  // ── Field handlers ───────────────────────────────────────────────────────────
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleTierChange = (index, e) => {
    setTicketTypes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [e.target.name]: e.target.value };
      return next;
    });
  };

  const addTier    = () => setTicketTypes((prev) => [...prev, defaultTier()]);
  const removeTier = (i) => setTicketTypes((prev) => prev.filter((_, idx) => idx !== i));

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!formData.title.trim())       errs.title       = 'Title is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (!formData.date)               errs.date        = 'Date is required';
    else if (new Date(formData.date) < new Date()) errs.date = 'Date cannot be in the past';
    if (!formData.venue.trim())       errs.venue       = 'Venue is required';
    if (!formData.imageUrl.trim())    errs.imageUrl    = 'Image URL is required';

    ticketTypes.forEach((t, i) => {
      if (!t.name.trim())            errs[`tier_${i}_name`]     = 'Name required';
      if (!t.price || Number(t.price) < 0) errs[`tier_${i}_price`] = 'Valid price required';
      if (!t.quantity || Number(t.quantity) < 1) errs[`tier_${i}_quantity`] = 'Quantity ≥ 1';
    });

    return errs;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the highlighted errors before submitting.');
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await client.post('/api/events/create', {
        ...formData,
        ticketTypes: ticketTypes.map((t) => ({
          name:     t.name.trim(),
          price:    Number(t.price),
          quantity: Number(t.quantity),
        })),
      });
      toast.success('Event published successfully!');
      navigate('/organizer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const FieldError = ({ name }) =>
    errors[name] ? (
      <p className="text-red-400 text-xs mt-1">{errors[name]}</p>
    ) : null;

  const inputCls = (name) =>
    `w-full bg-slate-950/50 border ${errors[name] ? 'border-red-500/60' : 'border-slate-700'} text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder-slate-500`;

  return (
    <div className="min-h-screen bg-slate-950 pt-24 pb-16 px-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Create New Event</h1>
          <p className="text-slate-400">Launch your event and start selling tickets in minutes.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl"
        >

          {/* ── Section 1: Event Details ───────────────────────────────── */}
          <fieldset className="space-y-5 mb-8">
            <legend className="text-xl font-semibold text-white border-b border-slate-700 pb-2 w-full">
              Event Details
            </legend>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Event Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Neon Music Festival 2025"
                className={inputCls('title')}
              />
              <FieldError name="title" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Tell attendees what makes your event special…"
                className={`${inputCls('description')} resize-none`}
              />
              <FieldError name="description" />
            </div>

            {/* Date + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Date & Time *</label>
                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`${inputCls('date')} [color-scheme:dark]`}
                />
                <FieldError name="date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={inputCls('category')}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Venue / Location *</label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g. Grand Convention Center, Mumbai"
                className={inputCls('venue')}
              />
              <FieldError name="venue" />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Banner Image URL *</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/…"
                className={inputCls('imageUrl')}
              />
              <FieldError name="imageUrl" />
              <p className="text-xs text-slate-500 mt-1">
                Use a high-quality landscape image (Unsplash, Imgur, etc.)
              </p>
              {formData.imageUrl && !errors.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="mt-3 h-32 w-full object-cover rounded-lg border border-slate-700"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
            </div>
          </fieldset>

          {/* ── Section 2: Ticket Tiers ────────────────────────────────── */}
          <fieldset className="space-y-4 mb-8">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <legend className="text-xl font-semibold text-white">Ticket Tiers *</legend>
              <button
                type="button"
                onClick={addTier}
                className="text-violet-400 hover:text-violet-300 text-sm font-semibold transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Tier
              </button>
            </div>

            {ticketTypes.map((tier, index) => (
              <div
                key={index}
                className="bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl p-4 relative group transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tier name */}
                  <div className="md:col-span-1">
                    <label className="block text-xs text-slate-400 mb-1 font-medium">
                      Tier Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={tier.name}
                      onChange={(e) => handleTierChange(index, e)}
                      placeholder="e.g. VIP"
                      className={`w-full bg-slate-900 border ${errors[`tier_${index}_name`] ? 'border-red-500/60' : 'border-slate-700'} text-white px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none text-sm transition-all`}
                    />
                    {errors[`tier_${index}_name`] && (
                      <p className="text-red-400 text-xs mt-0.5">{errors[`tier_${index}_name`]}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      min="0"
                      value={tier.price}
                      onChange={(e) => handleTierChange(index, e)}
                      placeholder="0"
                      className={`w-full bg-slate-900 border ${errors[`tier_${index}_price`] ? 'border-red-500/60' : 'border-slate-700'} text-white px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none text-sm transition-all`}
                    />
                    {errors[`tier_${index}_price`] && (
                      <p className="text-red-400 text-xs mt-0.5">{errors[`tier_${index}_price`]}</p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">
                      Capacity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={tier.quantity}
                      onChange={(e) => handleTierChange(index, e)}
                      placeholder="100"
                      className={`w-full bg-slate-900 border ${errors[`tier_${index}_quantity`] ? 'border-red-500/60' : 'border-slate-700'} text-white px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-violet-500 outline-none text-sm transition-all`}
                    />
                    {errors[`tier_${index}_quantity`] && (
                      <p className="text-red-400 text-xs mt-0.5">{errors[`tier_${index}_quantity`]}</p>
                    )}
                  </div>
                </div>

                {/* Remove tier button (only when > 1 tier) */}
                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="absolute -top-2.5 -right-2.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    aria-label="Remove tier"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </fieldset>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Publishing…
              </>
            ) : (
              '🚀 Publish Event'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
