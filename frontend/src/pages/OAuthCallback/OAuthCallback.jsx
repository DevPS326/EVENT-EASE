import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

const OAuthCallback = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params    = new URLSearchParams(location.search);
        const token     = params.get('token');
        const authError = params.get('error');

        if (authError || !token) {
          toast.error('Google sign-in failed. Please try again.');
          navigate('/login', { replace: true });
          return;
        }

        // Store token first — client interceptor will attach it to the profile request
        localStorage.setItem('token', token);

        // Hydrate user context with real profile data (name, email, _id, role)
        // Without this, login({ token }) leaves user.name / user.email as undefined
        const { data: profile } = await client.get('/api/users/profile');

        login({ token, ...profile });
        toast.success('Signed in with Google!');
        navigate('/', { replace: true });
      } catch (err) {
        console.error('[OAuthCallback] Error processing token:', err);
        // Clean up partial state so the user isn't stuck in a broken session
        localStorage.removeItem('token');
        toast.error('Sign-in failed. Please try again.');
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
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
