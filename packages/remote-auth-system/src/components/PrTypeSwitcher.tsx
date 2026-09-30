import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

import PublicRelations from './PublicRelations';
import ServiceRelations from './ServiceRelations';

interface PrTypeSwitcherProps {
    module: 'public-relations' | 'concierge' | 'pr-entertainment';
    onBack?: () => void;
    userId?: string;
    exitConfirmed?: boolean;
    onResetExitFlag?: () => void;
    onViewModeChange?: (viewMode: 'form' | 'summary' | 'edit' | 'draft') => void;
}

const PrTypeSwitcher: React.FC<PrTypeSwitcherProps> = ({
    module,
    onBack,
    userId,
    exitConfirmed = false,
    onResetExitFlag,
    onViewModeChange
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { type } = useParams();

    const prType: 'Material' | 'Service' = type?.toLowerCase() === 'service' ? 'Service' : 'Material';

    const handleTypeChange = (newType: 'Material' | 'Service') => {
        const target = newType === 'Material' ? 'material' : 'service';
        const segments = location.pathname.split('/');
        const moduleIndex = segments.findIndex(s => s === module);

        if (moduleIndex !== -1) {
            const newPath = [...segments.slice(0, moduleIndex + 1), target].join('/');
            navigate(newPath);
        } else {
            navigate(`/${module}/${target}`);
        }
    };

    const commonProps = {
        onBack,
        userId,
        exitConfirmed,
        onResetExitFlag,
        onViewModeChange,
        currentType: prType,
        onTypeChange: handleTypeChange,
    };
    return prType === 'Service' 
        ? <ServiceRelations {...commonProps} /> 
        : <PublicRelations {...commonProps} />;
};

export default PrTypeSwitcher;