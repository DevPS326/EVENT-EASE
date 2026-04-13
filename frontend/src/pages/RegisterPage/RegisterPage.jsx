import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const registerSchema = z
  .object({
    name:            z.string().min(2, 'Name must be at least 2 characters'),
    email:           z.string().email('Please enter a valid email address'),
    password:        z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    role:            z.enum(['user', 'organizer']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

const RegisterPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver:      zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'user' },
  });

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...payload } = data;
      const res = await client.post('/api/auth/signup', payload);
      login(res.data);
      toast.success('Account created! Welcome to EventEase.');
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const inputCls = (hasError) =>
    `w-full bg-slate-950/50 border ${
      hasError ? 'border-red-500/60 focus:ring-red-500' : 'border-slate-700 focus:ring-violet-500'
    } text-white px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all placeholder-slate-500`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden pt-20 pb-12">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10 mx-4"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-slate-400">Join EventEase and start booking today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="Jane Doe"
              {...register('name')}
              className={inputCls(!!errors.name)}
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              className={inputCls(!!errors.email)}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              {...register('password')}
              className={inputCls(!!errors.password)}
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              {...register('confirmPassword')}
              className={inputCls(!!errors.confirmPassword)}
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Role — controlled via RHF Controller */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">I want to</label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'user',      label: 'Buy Tickets', icon: '🎟' },
                    { value: 'organizer', label: 'Host Events',  icon: '🎤' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                        field.value === opt.value
                          ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
