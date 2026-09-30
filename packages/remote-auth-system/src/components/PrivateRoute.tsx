// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute: React.FC = () => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
     jwtDecode(token);
    return <Outlet />;
  } catch (error) {
    return <Navigate to="/" replace />;
  }
};

export default PrivateRoute;
