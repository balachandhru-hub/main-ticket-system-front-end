import { useEffect, useRef } from "react";
import { refreshAuthToken } from "../api/authApi";
import { REFRESH_INTERVAL_MS } from '../common/common';
import { useNavigate } from "react-router-dom";

export const useTokenRefresher = () => {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const startRefreshInterval = () => {
            intervalRef.current = setInterval(async () => {

                try {
                    await refreshAuthToken();
                } catch (err) {
                    navigate('/'); 
                }
            }, REFRESH_INTERVAL_MS);
        };

        startRefreshInterval();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [navigate]);
};
