import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ email: '', password: '', recaptchaToken: 'dummy-token' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for Google Auth Token in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const authError = params.get('error');

    if (token) {
        localStorage.setItem('token', token);
        // Optional: Fetch user details here if needed immediately
        // For now, we reload to let App.js auth check kick in
        window.location.href = '/dashboard'; 
    }
    if (authError) {
        setError('Google Authentication Failed. Please try again.');
    }
  }, [location]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      
      // Update global user state if passed as prop
      if(setUser) setUser(res.data);
      
      if (res.data.message === '2FA required') {
        // Handle 2FA redirect logic here if you have a separate page
        alert('2FA Code sent to email (Logic pending in this UI update)');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden pt-20">
       {/* Background Glows */}
       <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] -z-10"></div>
       <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] -z-10"></div>

       <div className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative z-10 mx-4">
         <div className="text-center mb-8">
           <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
           <p className="text-slate-400">Sign in to manage your events</p>
         </div>

         {error && (
           <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6 text-center">
             {error}
           </div>
         )}

         <form onSubmit={handleSubmit} className="space-y-5">
           <div>
             <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
             <input 
               type="email" 
               name="email" 
               required 
               className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
               placeholder="you@example.com"
               onChange={handleChange}
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
             <input 
               type="password" 
               name="password" 
               required 
               className="w-full bg-slate-950/50 border border-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
               placeholder="••••••••"
               onChange={handleChange}
             />
           </div>

           {/* reCAPTCHA Placeholder (Visual only for now) */}
           <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-400">I'm not a robot</span>
              <div className="w-6 h-6 border-2 border-slate-500 rounded-sm"></div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-lg shadow-lg shadow-violet-500/20 transition-all transform active:scale-[0.98]"
           >
             {loading ? 'Signing In...' : 'Sign In'}
           </button>
         </form>

         <div className="mt-6 flex items-center gap-4">
           <div className="h-px bg-slate-700 flex-1"></div>
           <span className="text-slate-500 text-sm">OR</span>
           <div className="h-px bg-slate-700 flex-1"></div>
         </div>

         <button 
           onClick={handleGoogleLogin}
           className="w-full mt-6 bg-white text-slate-900 font-semibold py-3.5 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-colors shadow-lg"
         >
           <svg className="w-5 h-5" viewBox="0 0 24 24">
             <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
             <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
             <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
             <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
           </svg>
           Sign in with Google
         </button>

         <p className="mt-8 text-center text-slate-400">
           Don't have an account?{' '}
           <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline">
             Sign Up
           </Link>
         </p>
       </div>
    </div>
  );
};

export default Login;