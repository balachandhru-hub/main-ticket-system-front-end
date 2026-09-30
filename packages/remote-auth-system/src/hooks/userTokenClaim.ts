import { useEffect } from "react";
import { fetchAuthInfo } from "../util/auth";
import { useNavigate } from "react-router-dom";

export const useUserTokenClaim = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const getToken = async () => {
            try {
                await fetchAuthInfo();
            } catch (err) {
                navigate('/');
            }
        };
        getToken();
    }, [navigate]);
};
