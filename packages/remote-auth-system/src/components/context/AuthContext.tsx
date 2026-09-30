// src/components/context/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { fetchAuthInfo } from '../../util/auth';

export type AuthInfo = {
  roleId: string;
  domainId: string;
  userId: string;
  personId: string;
};

const AuthContext = createContext<{
  auth: AuthInfo | null;
  loading: boolean;
  fetchAndSetAuth: () => Promise<void>;
}>({
  auth: null,
  loading: true,
  fetchAndSetAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAndSetAuth = async () => {
    setLoading(true);
    const result = await fetchAuthInfo();
    if ('roleId' in result) {
      setAuth(result as AuthInfo);
    } else {
      setAuth(null);
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ auth, loading, fetchAndSetAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
