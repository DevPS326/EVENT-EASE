import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import client from '../../api/client';

// ── Zod Schema ─────────────────────────────────────────────────────────────────
const ticketTierSchema = z.object({
  name:     z.string().min(1, 'Tier name is required'),
  price:    z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Price must be ≥ 0'),
  quantity: z.coerce.number({ invalid_type_error: 'Must be a number' }).int('Must be a whole number').min(1, 'Capacity must be ≥ 1'),
});

const CATEGORIES = ['Music', 'Tech', 'Workshop', 'Business', 'Art', 'Sports', 'Food'];

const createEventSchema = z.object({
  title:       z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date:        z
    .string()
    .min(1, 'Date is required')
    .refine((d) => new Date(d) > new Date(), 'Event date must be in the future'),
  venue:       z.string().min(3, 'Venue must be at least 3 characters'),
  category:    z.enum(CATEGORIES, { errorMap: () => ({ message: 'Select a category' }) }),
  imageUrl:    z.string().url('Must be a valid URL (include https://)'),
  ticketTypes: z
    .array(ticketTierSchema)
    .min(1, 'Add at least one ticket tier'),
});

// ── Component ──────────────────────────────────────────────────────────────────
const CreateEvent = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver:      zodResolver(createEventSchema),
    defaultValues: {
      title:       '',
      description: '',
      date:        '',
      venue:       '',
      category:    'Music',
      imageUrl:    '',
      ticketTypes: [{ name: 'General Admission', price: '', quantity: '' }],
    },
  });

  // Dynamic ticket tier array
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ticketTypes',
  });

  const imageUrlValue = watch('imageUrl');

  const onSubmit = async (data) => {
    try {
      await client.post('/api/events/create', data);
      toast.success('Event published successfully!');
      navigate('/organizer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event. Please try again.');
    }
  };

  // ── Shared input class helper ─────────────────────────────────────────────
  const inputCls = (hasError) =>
    `w-full bg-slate-950/50 border ${
      hasError ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-700 focus:ring-violet-500'
    } text-white px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all placeholder-slate-500 text-sm`;

  const tierInputCls = (hasError) =>
    `w-full bg-slate-900 border ${
      hasError ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-700 focus:ring-violet-500'
    } text-white px-3 py-2.5 rounded-lg focus:ring-1 focus:border-transparent outline-none text-sm transition-all`;

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
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl"
        >

          {/* ── Section 1: Event Details ──────────────────────────────── */}
          <fieldset className="space-y-5 mb-8">
            <legend className="text-xl font-semibold text-white border-b border-slate-700 pb-2 w-full mb-1">
              Event Details
            </legend>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Event Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Neon Music Festival 2025"
                {...register('title')}
                className={inputCls(!!errors.title)}
              />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Tell attendees what makes your event special…"
                {...register('description')}
                className={`${inputCls(!!errors.description)} resize-none`}
              />
              {errors.description && (
                <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Date + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Date &amp; Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  {...register('date')}
                  className={`${inputCls(!!errors.date)} [color-scheme:dark]`}
                />
                {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Category <span className="text-red-400">*</span>
                </label>
                <select {...register('category')} className={inputCls(!!errors.category)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category.message}</p>}
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Venue / Location <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Grand Convention Center, Mumbai"
                {...register('venue')}
                className={inputCls(!!errors.venue)}
              />
              {errors.venue && <p className="text-red-400 text-xs mt-1">{errors.venue.message}</p>}
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Banner Image URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/…"
                {...register('imageUrl')}
                className={inputCls(!!errors.imageUrl)}
              />
              {errors.imageUrl ? (
                <p className="text-red-400 text-xs mt-1">{errors.imageUrl.message}</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Use a high-quality landscape image (Unsplash, Imgur, Cloudinary, etc.)
                </p>
              )}
              {/* Live preview */}
              {imageUrlValue && !errors.imageUrl && (
                <img
                  src={imageUrlValue}
                  alt="Banner preview"
                  className="mt-3 h-32 w-full object-cover rounded-lg border border-slate-700"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  onLoad={(e)  => { e.target.style.display = 'block'; }}
                />
              )}
            </div>
          </fieldset>

          {/* ── Section 2: Ticket Tiers (useFieldArray) ───────────────── */}
          <fieldset className="space-y-4 mb-8">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <legend className="text-xl font-semibold text-white">
                Ticket Tiers <span className="text-red-400">*</span>
              </legend>
              <button
                type="button"
                onClick={() => append({ name: '', price: '', quantity: '' })}
                className="text-violet-400 hover:text-violet-300 text-sm font-semibold transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Tier
              </button>
            </div>

            {/* Array-level error (e.g. "at least one tier required") */}
            {errors.ticketTypes?.root && (
              <p className="text-red-400 text-xs">{errors.ticketTypes.root.message}</p>
            )}
            {errors.ticketTypes?.message && (
              <p className="text-red-400 text-xs">{errors.ticketTypes.message}</p>
            )}

            {fields.map((field, index) => {
              const tierErrors = errors.ticketTypes?.[index];
              return (
                <div
                  key={field.id}
                  className="bg-slate-950/40 border border-slate-800 hover:border-slate-700 rounded-xl p-4 relative group transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Tier Name */}
                    <div className="md:col-span-1">
                      <label className="block text-xs text-slate-400 mb-1 font-medium">
                        Tier Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. VIP"
                        {...register(`ticketTypes.${index}.name`)}
                        className={tierInputCls(!!tierErrors?.name)}
                      />
                      {tierErrors?.name && (
                        <p className="text-red-400 text-xs mt-0.5">{tierErrors.name.message}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-medium">
                        Price (₹) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        {...register(`ticketTypes.${index}.price`)}
                        className={tierInputCls(!!tierErrors?.price)}
                      />
                      {tierErrors?.price && (
                        <p className="text-red-400 text-xs mt-0.5">{tierErrors.price.message}</p>
                      )}
                    </div>

                    {/* Capacity */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-medium">
                        Capacity <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="100"
                        {...register(`ticketTypes.${index}.quantity`)}
                        className={tierInputCls(!!tierErrors?.quantity)}
                      />
                      {tierErrors?.quantity && (
                        <p className="text-red-400 text-xs mt-0.5">{tierErrors.quantity.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Remove tier button — visible on group hover, disabled when only 1 tier */}
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute -top-2.5 -right-2.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      aria-label="Remove tier"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </fieldset>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base"
          >
            {isSubmitting ? (
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
