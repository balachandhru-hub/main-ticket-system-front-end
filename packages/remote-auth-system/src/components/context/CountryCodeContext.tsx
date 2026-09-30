import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchCountryCodes, type CountryCodeItem } from '../../api/countrycodeApi';

interface CountryCodeContextType {
  countryCodes: CountryCodeItem[]; 
  loading: boolean;
  error: string | null;
}

const CountryCodeContext = createContext<CountryCodeContextType>({
  countryCodes: [],
  loading: false,
  error: null,
});

export const CountryCodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countryCodes, setCountryCodes] = useState<CountryCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCountryCodes()
      .then((codes) => {
        setCountryCodes(codes);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load country codes');
        setLoading(false);
      });
  }, []);

  return (
    <CountryCodeContext.Provider value={{ countryCodes, loading, error }}>
      {children}
    </CountryCodeContext.Provider>
  );
};

export const useCountryCodes = () => useContext(CountryCodeContext);
