import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { confirmPassword, ...payload } = formData;
      const res = await client.post('/api/auth/signup', payload);
      login(res.data);
      toast.success('Account created! Welcome to EventEase.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={formData[name]}
        onChange={handleChange}
        className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
      />
      {errors[name] && (
        <p className="text-red-400 text-xs mt-1">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden pt-20 pb-12">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10 mx-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-slate-400">Join EventEase and start booking today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Full Name" name="name" placeholder="Jane Doe" />
          <Field label="Email Address" name="email" type="email" placeholder="you@example.com" />
          <Field label="Password" name="password" type="password" placeholder="••••••••" />
          <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••" />

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">I want to</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'user', label: 'Buy Tickets', icon: '🎟' },
                { value: 'organizer', label: 'Host Events', icon: '🎤' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, role: opt.value }))}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    formData.role === opt.value
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg shadow-lg shadow-violet-500/20 transition-all transform active:scale-[0.98]"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
