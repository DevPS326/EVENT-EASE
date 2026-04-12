import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

/**
 * Landing page for Google OAuth redirect.
 *
 * Backend redirects to /oauth/callback?token=<jwt> after a successful
 * Google sign-in. This component reads the token, calls login(), then
 * redirects the user to their intended destination (or /dashboard).
 *
 * Keeping this as a separate public route (not behind ProtectedRoute)
 * is essential — login() hasn't been called yet when we land here.
 */
const OAuthCallback = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const params    = new URLSearchParams(location.search);
    const token     = params.get('token');
    const authError = params.get('error');

    if (authError) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    if (token) {
      login({ token });
      toast.success('Google sign-in successful!');
      // Respect any pre-auth intended destination stored in history state
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
      return;
    }

    // No token and no error — something unexpected; bail to login
    navigate('/login', { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
