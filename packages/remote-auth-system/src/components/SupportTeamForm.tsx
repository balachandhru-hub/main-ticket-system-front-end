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

const SupportTeamForm: React.FC<Props> = ({
  formData,
  handleChange,
  handleSubmit,
  handleReset,
  handleFileChange,
  selectedFile,
  loading = false,
  paymentType = PAYMENT_TYPES.MONTHLY,
  expiryTime = EXPIRY_TIME.DAYS_15
}) => {
  return (
    <form
      className="BP-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit('support');
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
          <label>Number of Resources<span className="required">*</span></label>
          <input
            type="number"
            name="resources"
            value={formData.resources || ''}
            onChange={handleChange}
            placeholder="Enter number of resources"
            min="1"
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="BP-row">
        <div className="BP-field">
          <label>CR Cost<span className="required">*</span></label>
          <input
            type="number"
            name="crCost"
            value={formData.crCost || ''}
            onChange={handleChange}
            placeholder="Enter CR cost"
            min="1"
            step="0.01"
            disabled={loading}
            required
          />
        </div>

        <div className="BP-field">
          <label>Number of Managers<span className="required">*</span></label>
          <input
            type="number"
            name="manager"
            value={formData.manager || 1}
            onChange={handleChange}
            placeholder="Enter number of managers"
            min="1"
            disabled={loading}
          />
        </div>
      </div>

      <div className="BP-row">
        <div className="BP-field">
          <label>Resource Cost<span className="required">*</span></label>
          <input
            type="number"
            name="resourceCost"
            value={formData.resourceCost || ''}
            onChange={handleChange}
            placeholder="Enter cost per resource"
            min="1"
            step="0.01"
            disabled={loading}
            required
          />
        </div>

        <div className="BP-field">
          <label>Manager Cost (Auto-calculated)<span className="required">*</span></label>
          <input
            type="number"
            name="managerCost"
            value={formData.managerCost || 3000}
            onChange={handleChange}
            placeholder="Manager cost"
            min="0"
            step="0.01"
            disabled={loading}
            readOnly
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
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
          <label> Contract End  Date<span className="required">*</span></label>
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

        <div className="BP-field">
          <label>Discount Code<span className="required"></span></label>
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

      {handleFileChange && (
        <div className="BP-row">
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
          <div className="BP-field"></div>
        </div>
      )}

      <div className="BP-buttons">
        <button
          type="button"
          onClick={() => handleReset('support')}
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

export default SupportTeamForm;