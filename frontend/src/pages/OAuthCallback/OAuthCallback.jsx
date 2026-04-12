import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const OAuthCallback = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    try {
      const params     = new URLSearchParams(location.search);
      const token      = params.get('token');
      const authError  = params.get('error');

      if (authError || !token) {
        toast.error('Google sign-in failed. Please try again.');
        navigate('/login', { replace: true });
        return;
      }

      // Persist token to localStorage first so AuthContext hydrates correctly
      localStorage.setItem('token', token);
      login({ token });
      toast.success('Signed in with Google!');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('[OAuthCallback] Error processing token:', err);
      toast.error('Sign-in failed. Please try again.');
      navigate('/login', { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MUST return a visible element — never null or empty fragment
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      Processing Secure Login...
    </div>
  );
};

export default OAuthCallback;
