    import React, { createContext, useContext, useEffect, useState } from 'react';
    import { getAllCountry } from '../../api/regionApi';
    import { toast } from 'react-toastify';
    import { useNavigate } from 'react-router-dom';

    const CountryContext = createContext<string[]>([]);

    export const useCountries = () => useContext(CountryContext);

    export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const [countries, setCountries] = useState<string[]>([]);

        const navigate = useNavigate();

        useEffect(() => {
            const fetchCountries = async () => {
                try {
                    const data = await getAllCountry();
                    setCountries(data.sort());
                } catch (err) {
                    toast.error('Unable to Load the Country Details');
                    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    navigate('/')
                }
            };

            fetchCountries();
        }, []);

        return (
            <CountryContext.Provider value={countries}>
                {children}
            </CountryContext.Provider>
        );
    };
