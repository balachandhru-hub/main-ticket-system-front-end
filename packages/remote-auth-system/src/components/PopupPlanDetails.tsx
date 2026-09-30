import React, { useState } from 'react';
import './PopupBase.css';
import { IoCloseOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import type { CustomerListResponseDto } from '../Dto/CustomerListResponseDto';
import { formatDateToLocal } from '../util/dateConvert';
import { assetGetById } from '../api/assetApi'; // Import the API function
import type { AssetDownloadDto } from '../Dto/AssetDownloadDto';
import type { ErrorResponseDto } from '../Dto/ErrorResponseDto';
import { toast } from 'react-toastify';

interface Props {
  onClose: () => void;
  data: CustomerListResponseDto | null;
  domainId: string; 
}

function formatEnumLabel(value?: string): string {
  if (!value) return '';

  if (value.includes('24') && value.includes('7')) {
    return '24/7';
  }
  
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


function isAssetDownloadDto(response: AssetDownloadDto | ErrorResponseDto): response is AssetDownloadDto {
  return 'fileBytes' in response;
}


function isErrorResponseDto(response: AssetDownloadDto | ErrorResponseDto): response is ErrorResponseDto {
  return 'message' in response && 'description' in response;
}

const PopupPlanDetails: React.FC<Props> = ({ onClose, data, domainId }) => {
  const navigate = useNavigate();
  const [isLoadingContract, setIsLoadingContract] = useState(false);

  const handleAddPlan = () => {
    if (domainId) {
      navigate('/business-plan', { state: { domainId } }); 
    } else {
      toast.warn('Domain ID is missing. Cannot navigate.');
    }
  };

  const handleViewContract = async () => {
    if (!data?.asset?.id) {
      toast.error('No contract found for this plan.');
      return;
    }

    try {
      setIsLoadingContract(true);
      
      const response = await assetGetById(data.asset.id);
      
      if (isErrorResponseDto(response)) {
        toast.error(`Error: ${response.message}`);
        return;
      }
      
  
      if (!isAssetDownloadDto(response)) {
        toast.error('Unexpected response format from server.');
        return;
      }
      
      const assetData = response;

      if (!assetData.fileBytes) {
        toast.error('No contract data available.');
        return;
      }
      
      const base64Data = assetData.fileBytes;
      
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      
      try {
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const blobUrl = URL.createObjectURL(blob);
        
        const newWindow = window.open('', '_blank');
        
        if (newWindow) {
          newWindow.location.href = blobUrl;
          
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${assetData.fileName || 'Contract'}</title>
              <style>
                body { margin: 0; padding: 0; }
                embed { width: 100%; height: 100vh; }
              </style>
            </head>
            <body>
              <embed src="${blobUrl}" type="application/pdf" width="100%" height="100%">
              <p>If you cannot see the PDF, <a href="${blobUrl}" download="${assetData.fileName || data.asset.fileName || data.asset.assetName || 'contract.pdf'}">Click here to download</a>.</p>
            </body>
            </html>
          `);
          newWindow.document.close();
        } else {
  
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = assetData.fileName || data.asset.fileName || data.asset.assetName || 'contract.pdf';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 30000);
        
      } catch (base64Error) {
        toast.error('Error processing the contract file. The file may be corrupted.');
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Unable to load contract: ${errorMessage}`);
    } finally {
      setIsLoadingContract(false);
    }
  };


  return (
    <div className="popup-overlay">
      <div className="plan-popup-box">
        <div className="plan-popup-header">
          <h3>PLAN DETAILS</h3>
          <button onClick={onClose} className="plan-close-icon">
            <IoCloseOutline size={18} />
          </button>
        </div>
        <div className="plan-popup-content">
          {!data?.planDetails ? (
            <button className="plan-add" onClick={handleAddPlan}>
              Add Plans
            </button>
          ) : (
            <>
              <div className="row"><span className="key">Plan type</span><span className="colon">:</span><span className="value">{formatEnumLabel(data.planDetails.planType)}</span></div>
              <div className="row"><span className="key">Engagement type</span><span className="colon">:</span><span className="value">{formatEnumLabel(data.planDetails.engagementType)}</span></div>
              <div className="row"><span className="key">No.of Consultants</span><span className="colon">:</span><span className="value">{data.planDetails.noOfConsultants}</span></div>
              <div className="row"><span className="key">Monthly hours</span><span className="colon">:</span><span className="value">{data.planDetails.monthlyHours}</span></div>
              <div className="row"><span className="key">CR charges for additional hours</span><span className="colon">:</span><span className="value">{data.planDetails.crChargesForAdditionalHours}</span></div>

              
              <div className="row">
                <span className="key">CR hours beyond limit</span>
                <span className="colon">:</span>
                <span className="value">{data.planDetails.crHoursBeyondLimit != null ? data.planDetails.crHoursBeyondLimit : ''}</span>
              </div>
              <div className="row">
                <span className="key">Ticket charge</span>
                <span className="colon">:</span>
                <span className="value">{data.planDetails.ticketCharge != null ? data.planDetails.ticketCharge : ''}</span>
              </div>

              <div className="row"><span className="key">Payment Type</span><span className="colon">:</span><span className="value">{formatEnumLabel(data.planDetails.paymentType)}</span></div>
              <div className="row"><span className="key">Plan start date</span><span className="colon">:</span><span className="value">{data.planDetails.planStartDate != undefined ? formatDateToLocal(data.planDetails.planStartDate) : data.planDetails.planStartDate}</span></div>
              <div className="row"><span className="key">Plan end date / renewal date</span><span className="colon">:</span><span className="value">{data.planDetails.planEndDateOrRenewalDate != undefined ? formatDateToLocal(data.planDetails.planEndDateOrRenewalDate) : data.planDetails.planEndDateOrRenewalDate}</span></div>
              <div className="row"><span className="key">Contract start date</span><span className="colon">:</span><span className="value">{data.planDetails.contractStartDate != undefined ? formatDateToLocal(data.planDetails.contractStartDate) : data.planDetails.contractStartDate}</span></div>
              <div className="row"><span className="key">Contract end date</span><span className="colon">:</span><span className="value">{data.planDetails.contractEndDate != undefined ? formatDateToLocal(data.planDetails.contractEndDate) : data.planDetails.contractEndDate}</span></div>
              <div className="row"><span className="key">Payment amount</span><span className="colon">:</span><span className="value">{data.planDetails.paymentAmount}</span></div>
              <div className="row"><span className="key">Plan status</span><span className="colon">:</span><span className="value">{formatEnumLabel(data.planDetails.planStatus)}</span></div>
            </>
          )}
        </div>
        {data?.planDetails && (
              <div className="button-wrapper">
              <button 
                className="view-pr-button"
                onClick={handleViewContract}
                disabled={isLoadingContract}
              >
                {isLoadingContract ? 'Loading...' : 'View Contract'}
              </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default PopupPlanDetails;