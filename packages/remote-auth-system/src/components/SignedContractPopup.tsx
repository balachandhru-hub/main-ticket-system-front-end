// src/components/SignedContractPopup.tsx
import React, { useState, useRef, useEffect } from 'react';
import './SignedContractPopup.css';
import { uploadSignedContract } from "../api/uploadSignedContractApi";
import { downloadSignedContract } from '../api/downloadSignedContractApi';
import { USER_ROLES } from '../common/common';


interface SignedContractPopupProps {
  entityType: 'invoice' | 'pr' | 'contract' | string;
  entityId: string;
  approver: string;
  onClose?: () => void;
  onUploadSuccess?: (fileName: string) => void;
  userRole?: string;
}

const SignedContractPopup: React.FC<SignedContractPopupProps> = ({
  entityType,
  entityId,
  approver,
  onClose,
  onUploadSuccess,
  userRole,
}) => {
  const [signedDocBase64, setSignedDocBase64] = useState<string | null>(null);
  const [signedDocName, setSignedDocName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();
  const displayRef = entityId;

  const isLeadershipUser = userRole === USER_ROLES.LEADERSHIP_USER;
  const isOperationsUser = userRole === USER_ROLES.OPERATIONS_USER;
  const isFinanceOperationUser = userRole === USER_ROLES.FINANCE_OPERATION_USER;
  const canViewDownload = isLeadershipUser || isOperationsUser || isFinanceOperationUser;
  const canUpload = isLeadershipUser;

  const openPdfInNewTab = (base64: string) => {
    const data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteString = atob(data);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!signedDocBase64) return;
    const data = signedDocBase64.includes(',') ? signedDocBase64.split(',')[1] : signedDocBase64;
    const byteString = atob(data);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayRef}_SIGNED.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Only PDF files allowed");
      return;
    }

    setFileToUpload(file);
    setShowConfirmPopup(true);
  };

  const confirmUpload = async () => {
    if (!fileToUpload) return;

    setUploading(true);
    setShowConfirmPopup(false);

    const type = 
  entityType === "invoice" 
    ? "INVOICE_UPLOAD" 
    : entityType === "pr" 
    ? "PR_UPLOAD" 
    : entityType === "contract" 
    ? "CONTRACT_UPLOAD" 
    : "UNKNOWN_UPLOAD";

    try {
      const response = await uploadSignedContract(
        approver,
        entityId,
        type,
        fileToUpload
      );

      if (!response || response.statusCode !== 200) {
        alert(response?.message || "Can't upload file.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSignedDocBase64((reader.result as string).split(",")[1]);
        setSignedDocName(fileToUpload.name);
      };
      reader.readAsDataURL(fileToUpload);

      alert(`Signed document uploaded successfully! ID: ${response}`);
      onUploadSuccess?.(fileToUpload.name);

    } catch {
      alert("Can't upload. Server rejected request.");
    } finally {
      setUploading(false);
      setFileToUpload(null);
    }
  };

  const cancelUpload = () => {
    setShowConfirmPopup(false);
    setFileToUpload(null);
  };

  const handleClose = () => {
    onClose?.();
  };

  useEffect(() => {
    const fetchSignedDoc = async () => {
      setLoading(true);
      if (!entityId || !approver) {
        setLoading(false);
        return;
      }

      const type = 
    entityType === "invoice" 
      ? "INVOICE_UPLOAD" 
      : entityType === "pr" 
      ? "PR_UPLOAD" 
      : entityType === "contract" 
      ? "CONTRACT_UPLOAD" 
      : "UNKNOWN_UPLOAD";
      try {
        const base64String = await downloadSignedContract(type, approver, entityId);
        
        // Check if document exists
        if (base64String) {
          setSignedDocBase64(base64String);
          setSignedDocName(`${entityId}_SIGNED.pdf`);
        } else {
          setSignedDocBase64(null);
          setSignedDocName(null);
        }
      } catch (err) {
        setSignedDocBase64(null);
        setSignedDocName(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedDoc();
  }, [entityId, approver, entityType]);

  if (loading) {
    return (
      <div className="scp-overlay" onClick={handleClose}>
        <div className="scp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="scp-header">
            <h3>Signed {displayType} - {displayRef}</h3>
            <button className="scp-close" onClick={handleClose}>×</button>
          </div>
          <div className="scp-loading">Loading...</div>
          <div className="scp-footer">
            <button className="scp-btn cancel" onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="scp-overlay" onClick={handleClose}>
        <div className="scp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="scp-header">
            <h3>Signed {displayType} - {displayRef}</h3>
            <button className="scp-close" onClick={handleClose}>×</button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {signedDocBase64 ? (
            <>
              <div className="scp-preview">
                <div className="scp-file-name">
                  {signedDocName || `${displayRef}_SIGNED.pdf`}
                </div>
                <div>
                  {canViewDownload && (
                    <div className="scp-actions">
                      <button 
                        className="scp-btn small view"
                        onClick={() =>
                          openPdfInNewTab('data:application/pdf;base64,' + signedDocBase64)
                        }
                      >
                        View
                      </button>
                      <button className="scp-btn small download" onClick={downloadPdf}>
                        Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {canUpload && (
                <div className='scp-upload-w'>
                  <button 
                    className="scp-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : `Replace Signed ${displayType}`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="scp-no-contract">
              <p>No Signed Contract Uploaded Yet</p>
              {canUpload && (
                <div className='scp-upload-w'>
                  <button 
                    className="scp-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : `Upload Signed ${displayType}`}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="scp-footer">
            <button className="scp-btn cancel" onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>

      {showConfirmPopup && (
        <div className="scp-confirm-overlay">
          <div className="scp-confirm-box">
            <h4>Confirm Upload</h4>
            <p>Do you want to upload <strong>{fileToUpload?.name}</strong>?</p>
            <div className="scp-confirm-actions">
              <button className="scp-btn confirm-ok" onClick={confirmUpload}>OK</button>
              <button className="scp-btn confirm-cancel" onClick={cancelUpload}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SignedContractPopup;