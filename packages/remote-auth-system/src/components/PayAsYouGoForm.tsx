import React from 'react';
import { EXPIRY_TIME, PAYMENT_TYPES } from '../common/common';

interface Props {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile?: File | null;
  handleSubmit: (formType: string) => void;
  handleReset: (formType: string) => void;
  loading?: boolean;
  paymentType?: string;
  expiryTime?: string;
}

const PayAsYouGoForm: React.FC<Props> = ({
  formData,
  handleChange,
  handleFileChange,
  selectedFile,
  handleSubmit,
  handleReset,
  loading = false,
  paymentType = PAYMENT_TYPES.MONTHLY,
  expiryTime = EXPIRY_TIME.DAYS_15
}) => {
  return (
    <form
      className="BP-form"
      onSubmit={(e) => {
        e.preventDefault();

        handleSubmit('payg');
      }}
    >
      <div className="BP-row">
        <div className="BP-field">
          <label>Engagement Type<span className="required">*</span></label>
          <select
            name="engagementType"
            value={formData.engagementType || 'BUSINESS_HOURS'}
            onChange={handleChange}
            disabled={loading}
            required
          >
            <option value="BUSINESS_HOURS">Business Hours</option>
            <option value="24_7_HOURS">24/7 Hours</option>
          </select>
        </div>

        <div className="BP-field">
          <label>Payment Type<span className="required">*</span></label>
          <select
            name="paymentType"
            value={paymentType}
            onChange={handleChange}
            disabled={loading}
            required
          >
            <option value={PAYMENT_TYPES.MONTHLY}>Monthly</option>
            <option value={PAYMENT_TYPES.YEARLY}>Yearly</option>
          </select>
        </div>
      </div>

      <div className="BP-row">
        <div className="BP-field">
          <label>Invoice Expiry Time<span className="required">*</span></label>
          <select
            name="expiryTime"
            value={expiryTime}
            onChange={handleChange}
            disabled={loading}
            required
          >
            <option value={EXPIRY_TIME.DAYS_15}>15 Days</option>
            <option value={EXPIRY_TIME.DAYS_30}>30 Days</option>
          </select>
        </div>

        <div className="BP-field">
          <label>CR Beyond 8 Hours<span className="required">*</span></label>
          <input
            type="number"
            name="crBeyond8Hours"
            value={formData.crBeyond8Hours || ''}
            onChange={handleChange}
            placeholder="Enter CR cost beyond 8 hrs"
            min="0"
            step="0.01"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="BP-row">
        <div className="BP-field">
          <label>Charge Per Ticket<span className="required">*</span></label>
          <input
            type="number"
            name="chargePerTicket"
            value={formData.chargePerTicket || ''}
            onChange={handleChange}
            placeholder="Enter ticket charge"
            min="0"
            step="0.01"
            disabled={loading}
            required
          />
        </div>

        <div className="BP-field">
          <label>Discount code<span className="required"></span></label>
          <input
            type="text"
            name="discountCode"
            value={formData.discountCode || ''}
            onChange={handleChange}
            placeholder="Enter discount code"
            disabled={loading}
          />
        </div>

      
      </div>

      <div className="BP-row">
        <div className="BP-field">
          <label>Contract Start Date<span className="required">*</span></label>
          <input
            type="date"
            name="contractStartDate"
            value={formData.contractStartDate || ''}
            onChange={handleChange}
            disabled={loading}
            required
             min={new Date().toISOString().split("T")[0]} 
          />
        </div>

        <div className="BP-field">
          <label>Contract End Date<span className="required">*</span></label>
          <input
            type="date"
            name="contractEndDate"
            value={formData.contractEndDate || ''}
            onChange={handleChange}
            disabled={loading}
            required
            min={formData.contractStartDate || ''}  
          />
        </div>
      </div>

      <div className="BP-row">       
          <div className="BP-field">
          <label>Plan Start Date<span className="required">*</span></label>
     
              <input
                 type="date"
                 name="startDate"
                value={formData.startDate || ''}
                onChange={handleChange}
                disabled={loading}
               required
            min={formData.contractStartDate || ''}  
            />

        </div>

        {handleFileChange && (
          <div className="BP-field">
            <label>Upload Agreement (PDF)<span className="required">*</span></label>
            <input
              type="file"
              name="agreementFile"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={loading}
              required
            />
            {selectedFile && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="BP-buttons">
        <button
          type="button"
          onClick={() => handleReset('payg')}
          className="BP-reset"
          disabled={loading}
        >
          Reset
        </button>
        <button
          type="submit"
          className="BP-submit"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Submit'}
        </button>
      </div>
    </form>
  );
};

export default PayAsYouGoForm;
