// ProtectedRoutes.tsx
import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './components/context/AuthContext';

const ProtectedRoutes: React.FC = () => {
  const { auth, loading, fetchAndSetAuth } = useAuth();

  useEffect(() => {
    if (!auth) {
      fetchAndSetAuth();
    }
  }, []);

  if (loading) return <div></div>;

  if (!auth) return <Navigate to="/" />;
  return <Outlet />;
};

export default ProtectedRoutes;
