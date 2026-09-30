import React from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import MaterialConcierge from './MaterialConcierge';
import ServiceConcierge from './ServiceConcierge';
import type { PRMode, ConciergeBaseProps } from '../Dto/ConciergeTpesDto';
import './ConciergeWrapper.css';

const ConciergeWrapper: React.FC<ConciergeBaseProps> = (props) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleModeChange = (newMode: PRMode) => {
        const segments = location.pathname.split('/');
        const index = segments.findIndex(s => s === 'concierge');

        if (index !== -1) {
            const newPath = [...segments.slice(0, index + 1), newMode].join('/');
            navigate(newPath);
        } else {
            navigate(`/${newMode}`);
        }
    };

    return (
        <div className="concierge-wrapper">
            <Routes>
                <Route index element={<Navigate to="material" replace />} />
                <Route 
                    path="material/*" 
                    element={<MaterialConcierge {...props} onModeChange={handleModeChange} />} 
                />
                <Route 
                    path="service/*" 
                    element={<ServiceConcierge {...props} onModeChange={handleModeChange} />} 
                />
            </Routes>
        </div>
    );
};

export default ConciergeWrapper;