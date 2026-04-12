import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/**
 * Guards routes that require an authenticated organizer (or admin).
 * - Authenticated users with a non-organizer role are redirected to /dashboard
 *   with a one-time toast so they understand why.
 */
const OrganizerRoute = () => {
  const { isAuthenticated, isOrganizer, isLoading } = useAuth();
  const location = useLocation();
  const toastFired = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isOrganizer && !toastFired.current) {
      toastFired.current = true;
      toast.error('Organizer access required. Upgrade your account to host events.');
    }
  }, [isLoading, isAuthenticated, isOrganizer]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isOrganizer) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default OrganizerRoute;
