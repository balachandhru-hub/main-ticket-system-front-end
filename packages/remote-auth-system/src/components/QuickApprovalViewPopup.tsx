import React, { useEffect, useState } from 'react';
import './QuickApprovalViewPopup.css';
import { getAttachmentCombineInvoice } from '../api/AribaApi';
import { useAuth } from './context/AuthContext';
import { USER_ROLES } from '../common/common';
import type { Invoice, ApprovalHistoryDto } from './QuickApproval';
import { uploadSignedContract } from '../api/uploadSignedContractApi';
import { toast } from "react-toastify";
import { downloadSignedContract } from '../api/downloadSignedContractApi';

// Define the expected response type for getAttachmentCombine
interface AttachmentResponse {
  contractAttachments?: string[];
  invoiceAttachments?: string[];
} 

interface QuickApprovalViewPopupProps {
  isOpen: boolean;
  selectedRow: Invoice | null;
  onClose: () => void;
  activeTab: 'invoice-contract' | 'approval-history';
  setActiveTab: (tab: 'invoice-contract' | 'approval-history') => void;
}

const QuickApprovalViewPopup: React.FC<QuickApprovalViewPopupProps> = ({
  isOpen,
  selectedRow,
  onClose,
  activeTab,
  setActiveTab,
}) => {
  const [viewLoading, setViewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [signedContractBase64, setSignedContractBase64] = useState<string | null>(null);
  const [signedContractName, setSignedContractName] = useState<string | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
const [fileToUpload, setFileToUpload] = useState<File | null>(null);
const [showConfirmPopup, setShowConfirmPopup] = useState(false);
    const { auth } = useAuth();
    const roleId = auth?.roleId;
     const isleadershipUser = roleId === USER_ROLES.LEADERSHIP_USER;


useEffect(() => {
  const fetchSignedContract = async () => {
    const approver = selectedRow?.approver;
    const number = selectedRow?.invoiceId;

    if (!approver || !number) return;

    try {
      const base64String = await downloadSignedContract(
        "INVOICE_UPLOAD",
        approver,
        number
      );

      if (base64String) {
        setSignedContractBase64(base64String);
        setSignedContractName(`${number}.pdf`);
      } else {
        setSignedContractBase64(null);
        setSignedContractName(null);
      }

    } catch (err) {
      setSignedContractBase64(null);
      setSignedContractName(null);
    }
  };

  if (isOpen && selectedRow) {
    fetchSignedContract();
  }
}, [isOpen, selectedRow?.invoiceId, selectedRow?.approver]);
       
    // ADD THIS FUNCTION — to open PDF in new tab
  const openPdfInNewTab = (base64: string) => {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteChars = atob(base64Data);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };


const downloadSignedPdf = () => {
  if (!signedContractBase64) return;

  const base64Data = signedContractBase64.includes(',')
    ? signedContractBase64.split(',')[1]
    : signedContractBase64;

  const byteChars = atob(base64Data);
  const byteNumbers = Array.from(byteChars).map(c => c.charCodeAt(0));
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${signedContractName || "Signed_Contract"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.type !== "application/pdf") {
    toast.warn("Only PDF files are allowed.");
    return;
  }

  setFileToUpload(file);
  setShowConfirmPopup(true); // open confirmation popup
};

const confirmUpload = async () => {
    if (!fileToUpload) return;

    setUploadingSigned(true);
    setShowConfirmPopup(false);

    try {
      const reader = new FileReader();

      reader.onloadend = async () => {
        const base64Str = (reader.result as string).split(",")[1];

        const approver = selectedRow?.approver;
        const number = selectedRow?.invoiceId;
        const type = "INVOICE_UPLOAD";

        if (!approver || !number) {
          toast.error("Missing approver or PR ID. Cannot upload.");
          setUploadingSigned(false);
          return;
        }

        let response;

        try {
          response = await uploadSignedContract(
            approver,
            number,
            type,
            fileToUpload
          );
        } catch (error: any) {
          toast.error("Can't upload file. Server rejected the request.");
          setUploadingSigned(false);
          return;
        }

        // ONLY SUCCESS IF 200 or 201
        if (
          !response ||
          !response.statusCode ||
          (response.statusCode !== 200 && response.statusCode !== 201)
        ) {
          toast.error(response?.message || "Can't upload file.");
          setUploadingSigned(false);
          return;
        }

        // SUCCESS → UPDATE FRONTEND
        setSignedContractBase64(base64Str);
        setSignedContractName(fileToUpload.name);

        toast.success("Signed contract uploaded successfully!");
        setUploadingSigned(false);
      };

      reader.readAsDataURL(fileToUpload);
    } catch (err) {
      toast.error("Can't upload file.");
      setUploadingSigned(false);
    } finally {
      setFileToUpload(null);
    }
  };

const cancelUpload = () => {
  setShowConfirmPopup(false);
  setFileToUpload(null);
};


  if (!isOpen || !selectedRow) return null;

  // Convert Base64 string to Blob
  const base64ToBlob = (b64: string, type = "application/pdf") => {
    const byteChars = atob(b64);
    const byteNums = new Array(byteChars.length)
      .fill(0)
      .map((_, i) => byteChars.charCodeAt(i));
    const byteArray = new Uint8Array(byteNums);
    return new Blob([byteArray], { type });
  };

  // View handler for displaying PDFs
  const handleView = async () => {
    setViewLoading(true);
    try {
      const payload = await getAttachmentCombineInvoice(selectedRow?.invoiceId);

      // Handle both possible response formats
      let contractAttachments: string[] = [];
      let invoiceAttachments: string[] = [];

      if (Array.isArray(payload)) {
        // Old format: payload is a string array
        invoiceAttachments = payload;
      } else {
        // New format: payload is an object with contractAttachments and invoiceAttachments
        contractAttachments = (payload as AttachmentResponse)?.contractAttachments || [];
        invoiceAttachments = (payload as AttachmentResponse)?.invoiceAttachments || [];
      }

      // Combine all attachments with proper names
      const combined = [
        ...invoiceAttachments.map((b64: string, index: number) => ({
          name: `Invoice PDF ${index + 1}`,
          base64: b64,
        })),
        ...contractAttachments.map((b64: string, index: number) => ({
          name: `Contract PDF ${index + 1}`,
          base64: b64,
        })),
      ];

      if (!combined.length) {
        toast.info("No attachments found.");
        return;
      }

      // Generate PDF sections
      const pdfEmbeds = combined
        .map(({ name, base64 }) => {
          const blob = base64ToBlob(base64);
          const url = URL.createObjectURL(blob);
          return `
            <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="padding: 10px; background: #f8f9fa; font-weight: bold; border-bottom: 1px solid #ddd;">
                ${name}
              </div>
              <iframe src="${url}" width="100%" height="600px" style="border: none;"></iframe>
            </div>
          `;
        })
        .join("");

      // Create styled modal HTML
      const html = `
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; }
              .modal-content { width: 90%; height: 90%; margin: 2% auto; background: white; border-radius: 8px; display: flex; flex-direction: column; }
              .modal-header { padding: 15px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; border-radius: 8px 8px 0 0; }
              .close-btn { background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
              .modal-body { flex: 1; padding: 20px; overflow-y: auto; }
            </style>
          </head>
          <body>
            <div class="modal">
              <div class="modal-content">
                <div class="modal-header">
                  <h3>PDF Documents (${combined.length})</h3>
                  <button class="close-btn" onclick="window.close()">Close</button>
                </div>
                <div class="modal-body">
                  ${pdfEmbeds}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
    } finally {
      setViewLoading(false);
    }
  };

  // Download multiple PDFs (contract + invoice)
  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      const payload = await getAttachmentCombineInvoice(selectedRow?.invoiceId);

      // Handle both possible response formats
      let contractAttachments: string[] = [];
      let invoiceAttachments: string[] = [];

      if (Array.isArray(payload)) {
        // Old format: payload is a string array
        invoiceAttachments = payload;
      } else {
        // New format: payload is an object with contractAttachments and invoiceAttachments
        contractAttachments = (payload as AttachmentResponse)?.contractAttachments || [];
        invoiceAttachments = (payload as AttachmentResponse)?.invoiceAttachments || [];
      }

      if (contractAttachments.length === 0 && invoiceAttachments.length === 0) {
        toast.error("No PDFs available to download");
        return;
      }

      // Download all contract PDFs
      for (let i = 0; i < contractAttachments.length; i++) {
        const blob = base64ToBlob(contractAttachments[i]);
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedRow?.invoiceId}_contract_${i + 1}.pdf`;
        a.click();

        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 200)); // small delay to avoid browser blocking
      }

      // Download all invoice PDFs
      for (let i = 0; i < invoiceAttachments.length; i++) {
        const blob = base64ToBlob(invoiceAttachments[i]);
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${selectedRow?.invoiceId}_invoice_${i + 1}.pdf`;
        a.click();

        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 200)); // small delay to avoid browser blocking
      }
    } catch (err) {
    } finally {
      setDownloadLoading(false);
    }
  };

  const invoiceDate = new Date(selectedRow.dueDate).toLocaleDateString('en-GB');

  const title = activeTab === 'invoice-contract' ? 'Invoice & Contract Details' : 'Approval History';

  return (
    <div className="view-popup-overlay">
      <div className="view-popup-content">
        <div className="view-popup-header">
          <h2>{title}</h2>
          <button className="view-popup-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="view-popup-tabs">
          <button
            className={`view-popup-tab-button ${activeTab === 'invoice-contract' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice-contract')}
          >
            Invoice & Contract
          </button>
          <button
            className={`view-popup-tab-button ${activeTab === 'approval-history' ? 'active' : ''}`}
            onClick={() => setActiveTab('approval-history')}
          >
            Approval History
          </button>
        </div>
        <div className="view-popup-body">
          <div className="view-popup-tab-content">
            {activeTab === 'invoice-contract' && (
              <>
                <div className="view-popup-card-grid">
                  <div className="view-popup-card">
                    <h3>Invoice</h3>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Supplier Name:</span>
                      <span className="view-popup-value">{selectedRow.supplier}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Invoice Number:</span>
                      <span className="view-popup-value">{selectedRow.invoiceId}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Invoice Date:</span>
                      <span className="view-popup-value">{invoiceDate}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Currency:</span>
                      <span className="view-popup-value">{selectedRow.currency || 'N/A'}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Total Invoice Amount:</span>
                      <span className="view-popup-value">{selectedRow.amount}</span>
                    </div>
                  </div>
                  <div className="view-popup-card">
                    <h3>Contract</h3>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Description:</span>
                      <span className="view-popup-value">{selectedRow.description}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Contract Value:</span>
                      <span className="view-popup-value">{selectedRow.contractValue}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Value Already Paid:</span>
                      <span className="view-popup-value">{selectedRow.valueAlreadyPaid}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Remaining Balance:</span>
                      <span className="view-popup-value">{selectedRow.remainingBalance}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Supplier Name:</span>
                      <span className="view-popup-value">{selectedRow.supplier}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Due Date:</span>
                      <span className="view-popup-value">{selectedRow.paymentDueDate}</span>
                    </div>
                  </div>
                </div>
                <div className="view-popup-actions">
                  <button
                    className="view-popup-button view"
                    onClick={handleView}
                    disabled={!selectedRow?.hasAttachment || viewLoading}
                  >
                    {viewLoading ? 'Loading...' : 'View'}
                  </button>
                  <button
                    className="view-popup-button download"
                    onClick={handleDownload}
                    disabled={!selectedRow?.hasAttachment || downloadLoading}
                  >
                    {downloadLoading ? 'Downloading...' : 'Download'}
                  </button>
                </div>

                {/* NEW: Signed Contract Upload & Management - Only show if selectedRow exists */}
                {selectedRow && isleadershipUser && (
                   <div className="signed-contract-section">
                    <h3>Signed Contract</h3>
                    <div className="upload-signed-wrapper">
                      <input
                        type="file"
                        accept="application/pdf"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileSelect}
                      />

                      <button
                        className="view-popup-button upload-signed"
                        disabled={uploadingSigned}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingSigned
                          ? "Uploading..."
                          : signedContractBase64
                          ? "Replace Signed Contract"
                          : "Upload Signed Contract"}
                      </button>
                    </div>
                    {signedContractBase64 && (
                      <div className="signed-contract-preview">
                        <div className="file-name">
                          {signedContractName || 'Signed_PR.pdf'}
                        </div>
                        <div className="signed-actions">
                          <button
                            className="view-popup-button small view"
                            onClick={() => openPdfInNewTab("data:application/pdf;base64," + signedContractBase64)}
                          >
                            View
                          </button>
                          <button
                            className="view-popup-button small download"
                            onClick={downloadSignedPdf}
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    )}

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
                  </div>
                )}
              </>
            )}
            {activeTab === 'approval-history' && (
              <div className="view-popup-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Approval Date & Time</th>
                      <th>User (Level)</th>
                      <th>Status</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRow.approvalHistory.map((history: ApprovalHistoryDto, index: number) => (
                      <tr key={index}>
                        <td>{history.approvalDate ? new Date(history.approvalDate).toLocaleString() : 'N/A'}</td>
                        <td>{history.level || 'N/A'}</td>
                        <td>{history.status}</td>
                        <td>{history.aribaUser}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="view-popup-footer">
          <div className="view-popup-footer-buttons">
            <button
              className="view-popup-button back"
              onClick={() => {
                if (activeTab === 'invoice-contract') {
                  onClose();
                } else {
                  setActiveTab('invoice-contract');
                }
              }}
            >
              Back
            </button>
            {activeTab === 'invoice-contract' && (
              <button
                className="view-popup-button next"
                onClick={() => setActiveTab('approval-history')}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickApprovalViewPopup;
