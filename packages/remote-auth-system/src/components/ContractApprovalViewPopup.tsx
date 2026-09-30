import React, { useState ,useEffect } from 'react';
import './ContractApprovalViewPopup.css';
import { getAttachmentCombine, getAttachmentContractData } from '../api/AribaApi';
import { useAuth } from './context/AuthContext';
import { USER_ROLES } from '../common/common';
import type { Invoice, ApprovalHistoryDto } from './ContractApproval';
import { useNavigate } from 'react-router-dom';
import { downloadSignedContract } from '../api/downloadSignedContractApi';
// import type ContractApproval from './ContractApproval';
import { toast } from "react-toastify";
import { uploadSignedContract } from '../api/uploadSignedContractApi';



// Define the expected response type for getAttachmentCombine
// interface AttachmentResponse {
//   contractAttachments?: string[];
//   invoiceAttachments?: string[];
// } 

interface ContractApprovalViewPopupProps {
  isOpen: boolean;
  selectedRow: Invoice | null;
  onClose: () => void;
  activeTab: 'contract' | 'approval-history';
  setActiveTab: (tab: 'contract' | 'approval-history') => void;
}

const ContractApprovalViewPopup: React.FC<ContractApprovalViewPopupProps> = ({
  isOpen,
  selectedRow,
  onClose,
  activeTab,
  setActiveTab,
}) => {
  const [viewLoading,setViewLoading ] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const navigate=useNavigate()

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
    const number = selectedRow?.contractTaskId;

    if (!approver || !number) return;

    try {
      const base64String = await downloadSignedContract(
        "CONTRACT_UPLOAD",
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
}, [isOpen, selectedRow?.contractTaskId, selectedRow?.approver]);
       
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
        const number = selectedRow?.contractTaskId;
        const type = "Contract_UPLOAD";

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
    const payload = await getAttachmentContractData(
      selectedRow?.contractTaskId
    );
    const contractAttachmentsPr = payload?.contractAttachments || [];
    const combined = [
      ...contractAttachmentsPr.map((b64: string, index: number) => ({
        name: `Contract PDF ${index + 1}`,
        base64: b64,
      })),
    ];
    if (!combined.length) {
      alert("No attachments found.");
      return;
    }
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
  } catch (err:any) {
    if(err.status === 401){
     
      navigate("/")
      }
  } finally {
    setViewLoading(false);
  }
};

  const base64ToBlobs = (b64: string, type = "application/pdf") => {
  const cleanBase64 = b64.split(",").pop() || b64; // handles prefixed data
  const byteChars = atob(cleanBase64);
  const byteNums = new Array(byteChars.length)
    .fill(0)
    .map((_, i) => byteChars.charCodeAt(i));
  const byteArray = new Uint8Array(byteNums);
  return new Blob([byteArray], { type });
};
  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
    const payload = (await getAttachmentCombine(selectedRow?.contractTaskId)) as{
      contractAttachments: string[];
    }
    const contractAttachments= payload.contractAttachments || []

    if ( contractAttachments.length === 0) {
      alert("No PDFs available to download");
      return;
    }
  for (let i = 0; i < contractAttachments.length; i++) {
      const blob = base64ToBlobs(contractAttachments[i]);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `contracts_${i + 1}.pdf`;
      a.click();

      URL.revokeObjectURL(url);
      await new Promise((r) => setTimeout(r, 200)); 
    }
  
  } catch (err:any) {
   if(err.status === 401){
     
      navigate("/")
      }
  } finally {
    setDownloadLoading(false);
  }
  };

    const formatAmount = (amount?: number | string): string => {
    if (amount === null || amount === undefined || amount === '') return '-';

    const value = Number(amount);
    if (isNaN(value)) return '-';

    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

//   const invoiceDate = new Date(selectedRow.dueDate).toLocaleDateString('en-GB');

  const title = activeTab === 'contract' ? 'Contract Details' : 'Approval History';
const isCWWorkspace =selectedRow?.workspaceId?.startsWith("CW");
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
            className={`view-popup-tab-button ${activeTab === 'contract' ? 'active' : ''}`}
            onClick={() => setActiveTab('contract')}
          >
            Contract
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
            {activeTab === 'contract' && (
              <>
                <div className="view-popup-cards-wrapper">
                  <div className="view-popup-card">
                    <h3>Contract</h3>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Description:</span>
                      <span className="view-popup-value">{selectedRow.description}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Contract Value:</span>
                      <span className="view-popup-value">{formatAmount(selectedRow.totalAmount)}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Property Name:</span>
                      <span className="view-popup-value">{selectedRow.supplierName}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Contract Start Date:</span>
                      <span className="view-popup-value">{selectedRow.beginDate}</span>
                    </div>
                    <div className="view-popup-detail-row">
                      <span className="view-popup-label">Contract End Date:</span>
                      <span className="view-popup-value">{selectedRow.endDate}</span>
                    </div>
                  </div>
                </div>
                <div className="view-popup-actions">
                  <button
                    className="view-popup-button view"
                   disabled={!isCWWorkspace}
                       onClick={handleView}
                  >
                    {viewLoading ? 'Loading...' : 'View'}
                  </button>
                  <button
                    className="view-popup-button download"
                    onClick={handleDownload}
                    disabled={!isCWWorkspace}
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
                        <td>{selectedRow.approver}</td>
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
                if (activeTab === 'contract') {
                  onClose();
                } else {
                  setActiveTab('contract');
                }
              }}
            >
              Back
            </button>
            {activeTab === 'contract' && (
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

export default ContractApprovalViewPopup;