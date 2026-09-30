declare global {
  interface Window {
    hasUnsavedChanges?: boolean;
    savePRDraft?: () => Promise<void>;
  }
}

import React, { useState, useEffect, useRef } from 'react';
import './AdminNavBar.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { USER_ROLES, type UserRole } from '../common/common';
import {
  Download,
  Loader2,
  ChevronDown,
  PlayCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { getLatestExtension, getLinkByType } from '../api/extensionApi';

export type AdminTab =
  | 'Dashboard'
  | 'Company Names'
  | 'Menu'
  | 'New Ticket'
  | 'Chatbot'
  | 'Bots'
  | 'Apps'
  | 'Invoice Dashboard'
  | 'Buyer Invoice Dashboard';

interface AdminNavBarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  showCreateUser?: boolean;
  userRole: UserRole;
  expandedCompany: boolean;
}

const AdminNavBar: React.FC<AdminNavBarProps> = ({
  activeTab,
  onTabChange,
  showCreateUser,
  userRole,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isManager = userRole === USER_ROLES.MANAGER;
  const isBDUser = userRole === USER_ROLES.BUSINESS_DEVELOPMENT_USER;
  const isUserRole = userRole === USER_ROLES.BUSINESS_USER || userRole === USER_ROLES.BUSINESS_ADMIN_USER || userRole === USER_ROLES.LEADERSHIP_USER;
  const isSupplierUser = userRole === USER_ROLES.SUPPLIER_USER;
  const isOperationsUser =userRole === USER_ROLES.OPERATIONS_USER;
  const isFinanceOperationUser = userRole === USER_ROLES.FINANCE_OPERATION_USER;
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<AdminTab | null>(null);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [extensionId, setExtensionId] = useState<string>('');
  const [extensionData, setExtensionData] = useState<{ fileBytes: string; fileName: string } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [videoLink, setVideoLink] = useState<string>('');
  const [docLink, setDocLink] = useState<string>('');

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [popoverOpen]);

  useEffect(() => {
    if (!(isUserRole || isOperationsUser || isFinanceOperationUser)) {
    return;
  }
    const fetchExtension = async () => {
      try {
        const response = await getLatestExtension();

        if ('fileBytes' in response && response.fileBytes) {
          setExtensionData({
            fileBytes: response.fileBytes,
            fileName: response.fileName || 'extension.zip',
          });
          setExtensionId(response.id || '');
          setHasExtension(true);
        } else if ('statusCode' in response) {
          if (response.statusCode === 204) {
            setHasExtension(false);
            setExtensionData(null);
          } else if (response.statusCode === 200 && 'id' in response) {
            setExtensionId(response.id);
            if (response.fileBytes && response.fileName) {
              setExtensionData({
                fileBytes: response.fileBytes,
                fileName: response.fileName,
              });
              setHasExtension(true);
            } else {
              setHasExtension(false);
            }
          } else {
            setHasExtension(false);
          }
        } else {
          setHasExtension(false);
        }
      } catch (err) {
        toast.error('Failed to fetch extension.');
        setHasExtension(false);
      }
    };
    fetchExtension();
  }, [isUserRole, isOperationsUser, isFinanceOperationUser]);

  useEffect(() => {
    if (!(isUserRole || isOperationsUser || isFinanceOperationUser)) {
    return;
  }
    const fetchLinks = async () => {
      try {
        const videoResponse = await getLinkByType('Video');
        setVideoLink(videoResponse.linkUrl || '');

        const docResponse = await getLinkByType('Document');
        setDocLink(docResponse.linkUrl || '');
      } catch (err) {
        toast.error('Failed to fetch tutorial/document links.');
      }
    };
    fetchLinks();
  }, [isUserRole, isOperationsUser, isFinanceOperationUser]);

  const base64ToBlob = (base64: string, contentType = 'application/zip'): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  const handleDownload = async () => {
    if (!extensionData || !hasExtension) {
      toast.error('No extension available to download.');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = base64ToBlob(extensionData.fileBytes);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = extensionData.fileName || `extension-${extensionId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      setPopoverOpen(false);
    } catch (err) {
      toast.error('Failed to download extension.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTabClick = (tab: AdminTab, route: string) => {
    if (window.hasUnsavedChanges) {
      setShowUnsavedModal(true);
      setPendingTab(tab);
      setPendingRoute(route);
    } else {
      onTabChange(tab);
      navigate(route);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    if (pendingTab && pendingRoute) {
      window.hasUnsavedChanges = false;
      onTabChange(pendingTab);
      navigate(pendingRoute);
      setPendingTab(null);
      setPendingRoute(null);
    }
  };

  const handleCancelLeave = () => {
    setShowUnsavedModal(false);
    setPendingTab(null);
    setPendingRoute(null);
  };

  if (location.pathname.includes('spend-analytics-dashboard') || location.pathname.includes('buyer-invoice') || activeTab === 'Buyer Invoice Dashboard') {
    return null;
  }

  return (
    <div className="navbar-wrapper">
      <div className="navbar">
        {(isUserRole || isOperationsUser || isFinanceOperationUser) && (
          <button
            className={activeTab === 'Chatbot' ? 'active' : ''}
            onClick={() => handleTabClick('Chatbot', '/dashboard/chat-bot')}
          >
            Chatbot
          </button>
        )}
        {(isManager || isUserRole || isOperationsUser || isFinanceOperationUser) && (
          <button
            className={activeTab === 'Dashboard' ? 'active' : ''}
            onClick={() => handleTabClick('Dashboard', '/dashboard')}
          >
            Dashboard
          </button>
        )}
        {isSupplierUser && (
          <button
            className={activeTab === 'Invoice Dashboard' ? 'active' : ''}
            onClick={() => handleTabClick('Invoice Dashboard', '/dashboard/invoice')}
          >
            Invoice Dashboard
          </button>
        )}
        {isBDUser && (
          <button
            className={activeTab === 'Company Names' ? 'active' : ''}
            onClick={() => handleTabClick('Company Names', '/dashboard/company')}
          >
            Company Names
          </button>
        )}
        {isManager && (
          <button
            className={activeTab === 'Menu' ? 'active' : ''}
            onClick={() => handleTabClick('Menu', '/dashboard/menu')}
          >
            Menu
          </button>
        )}
        {showCreateUser && isManager && (
          <button onClick={() => navigate('/createUser')}>Create User</button>
        )}
        {(isUserRole || isOperationsUser || isFinanceOperationUser) && (
          <button
            className={activeTab === 'New Ticket' ? 'active' : ''}
            onClick={() => handleTabClick('New Ticket', '/dashboard/ticket')}
          >
            New Ticket
          </button>
        )}
        {(isSupplierUser || isUserRole || isOperationsUser || isFinanceOperationUser) && (
          <button
            className={activeTab === 'Bots' ? 'active' : ''}
            onClick={() => handleTabClick('Bots', '/dashboard/bots')}
          >
            Bots
          </button>
        )}
        {(isSupplierUser || isUserRole || isOperationsUser || isFinanceOperationUser) && (
          <button
            className={activeTab === 'Apps' ? 'active' : ''}
            onClick={() => handleTabClick('Apps', '/dashboard/apps')}
          >
            Apps
          </button>
        )}

      </div>

      <div className="admin-navbar-right">
        {(isUserRole || isOperationsUser || isFinanceOperationUser) && !location.pathname.includes('/advance-payment') && (
          <div className="extension-popover-wrapper" ref={popoverRef}>

            <button
              className="extension-main-btn"
              onClick={() => setPopoverOpen(!popoverOpen)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Extension
                </>
              )}
              <ChevronDown
                size={16}
                className={`chevron ${popoverOpen ? 'rotated' : ''}`}
              />
            </button>

            <div className={`extension-popover ${popoverOpen ? 'open' : ''}`}>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={isDownloading || !hasExtension}
                className="popover-item download"
              >
                <Download size={16} />
                <div>
                  <strong>Download Extension</strong>
                  <small>.zip file • Latest version</small>
                </div>
                {!hasExtension && <span className="not-available">Not uploaded yet</span>}
              </button>

              {videoLink ? (
                <a
                  href={videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="popover-item"
                  onClick={() => setPopoverOpen(false)}
                >
                  <PlayCircle size={16} />
                  <div>
                    <strong>Watch Tutorial Video</strong>
                    <small>How to install & use the extension</small>
                  </div>
                  <ExternalLink size={14} className="external-icon" />
                </a>
              ) : (
                <div className="popover-item disabled">
                  <PlayCircle size={16} />
                  <div>
                    <strong>Watch Tutorial Video</strong>
                    <small>Not available</small>
                  </div>
                </div>
              )}

              {docLink ? (
                <a
                  href={docLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="popover-item"
                  onClick={() => setPopoverOpen(false)}
                >
                  <FileText size={16} />
                  <div>
                    <strong>Read Documentation</strong>
                    <small>Detailed guide & API reference</small>
                  </div>
                  <ExternalLink size={14} className="external-icon" />
                </a>
              ) : (
                <div className="popover-item disabled">
                  <FileText size={16} />
                  <div>
                    <strong>Read Documentation</strong>
                    <small>Not available</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showUnsavedModal && (
  <div className="modal-overlay">
    <div className="modal-content-sm switch-confirm-modal">
      <div className="modal-header">
        <h3>Unsaved Changes</h3>
      </div>
      <div className="modal-body">
        <p>You have unsaved changes in your draft.<br /><br />
           Do you want to save these changes before leaving?
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-cancel" onClick={handleCancelLeave}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={handleConfirmLeave}>
          Discard
        </button>
        <button
          className="btn btn-submit"
          onClick={async () => {
            if (window.savePRDraft) {
              await window.savePRDraft();
            }
            handleConfirmLeave();
          }}
        >
          Save as Draft
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default AdminNavBar;
