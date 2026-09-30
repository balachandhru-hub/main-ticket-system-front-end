import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Header.css';
import UserDropdown from './../components/UserDropdown/UserDropdown';
import { getDomainLogo } from '../api/domainApi';
import { useAuth } from '../components/context/AuthContext';
import { USER_ROLES } from '../common/common';

interface LogoData {
  fileBytes: string;
  contentType: string;
}

const DEFAULT_LOGO = '/assets/CAS-logo.png';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, loading: authLoading } = useAuth();

  const [logoSrc, setLogoSrc] = useState<string>(DEFAULT_LOGO);

  const [showWarning, setShowWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const roleId = auth?.roleId;
  const isbduser = roleId === USER_ROLES.BUSINESS_DEVELOPMENT_USER;

  const handleChatClick = (e: React.MouseEvent) => {
    if (location.pathname === '/user-queries') return;
    if ((window as any).hasUnsavedChanges) {
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation('/user-queries');
      setShowWarning(true);
    } else {
      navigate('/user-queries');
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!auth) {
      setLogoSrc(DEFAULT_LOGO);
      return;
    }

    const fetchLogo = async () => {
      try {
        const result = await getDomainLogo();

        if ('statusCode' in result) {
          setLogoSrc(DEFAULT_LOGO);
          return;
        }

        const { fileBytes, contentType } = result as LogoData;
        if (!fileBytes?.trim() || !contentType?.trim()) {
          setLogoSrc(DEFAULT_LOGO);
          return;
        }
        const mimeType = contentType.includes('/') ? contentType : `image/${contentType.toLowerCase()}`;
        const cleanBytes = fileBytes.replace(/\s/g, '');
        const dataUrl = `data:${mimeType};base64,${cleanBytes}`;
        setLogoSrc(dataUrl);
      } catch (err) {
        setLogoSrc(DEFAULT_LOGO);
      }
    };

    fetchLogo();
  }, [auth, authLoading]);

  const logoKey = auth ? `domain-${auth.domainId}` : 'default-logo';

  const handleLogoClick = (e: React.MouseEvent) => {
    if (location.pathname !== '/dashboard' && (window as any).hasUnsavedChanges) {
      e.preventDefault();
      setPendingNavigation('/dashboard');
      setShowWarning(true);
    } else if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const handleHeaderRightClick = (e: React.MouseEvent) => {
    if ((window as any).hasUnsavedChanges) {
      e.preventDefault();
      e.stopPropagation();
      setShowWarning(true);
    }
  };

  const handleConfirmNavigation = () => {
    (window as any).hasUnsavedChanges = false;
    setShowWarning(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelNavigation = () => {
    setShowWarning(false);
    setPendingNavigation(null);
  };

  if (location.pathname.includes('spend-analytics-dashboard')) {
    return null;
  }

  return (
    <>
      <header className="page-header">
        <div className="header-left" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <img
            key={logoKey}
            src={logoSrc}
            alt="Logo"
            className="logo"
          />
          <div className="header-text">
            <div className="title">Procurement Cockpit</div>
          </div>
        </div>

        <div className="header-right" onClick={handleHeaderRightClick}>
          {location.pathname !== '/' && (
            <>
              {isbduser && (
                <img src="/assets/Chat-Icon.png" alt="User Queries" className="bd-chat-icon" onClick={handleChatClick} />)}
              <UserDropdown /></>)}
        </div>
      </header>

      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-content-sm switch-confirm-modal">
            <div className="modal-header">
              <h3>Unsaved Changes</h3>
            </div>
            <div className="modal-body">
              <p>
                You have unsaved changes on this page. Are you sure you want to
                leave? Your changes will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={handleCancelNavigation}>
                Stay on Page
              </button>
              <button className="btn btn-danger" onClick={handleConfirmNavigation}>
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
