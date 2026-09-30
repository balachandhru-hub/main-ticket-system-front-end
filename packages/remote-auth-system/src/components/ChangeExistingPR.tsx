import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TbTruckDelivery } from "react-icons/tb";
import { FaFileInvoiceDollar, FaChartArea, FaLocationDot, FaBuilding, FaWandMagicSparkles } from "react-icons/fa6";
import { GrSend } from "react-icons/gr";
import './ChangeExistingPR.css';
import BackButton from './BackButton';

const ChangeExistingPR: React.FC = () => {
  const { prNumber } = useParams<{ prNumber: string }>();

  const [formData, setFormData] = useState({
    purchaseOrg: '',
    vendor: '',
    description: '',
    commodity: '',
    contract: '',
    purchaseGroup: '',
    expectedAmount: '',
    maximumAmount: '',
    serviceStartDate: '',
    serviceEndDate: '',
    glAccount: '',
    costCenter: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="prchange-container">
      <header className="prchange-page-header">
        <div className="pr-back-btn">
          <BackButton />
        </div>
      </header>

      <div className="prchange-form-card-wrapper">
        <div className="prchange-form-card">
          <div className="prchange-form-header-new">
            <h2>Change PR #{prNumber || 'Loading...'}</h2>
          </div>
          <div style={{ width: '140px' }}></div>
          <div className="prchange-form-body">
            <div className="prchange-row">
              <div className="prchange-field">
                <label className="prchange-label">Purchase Org*</label>
                <div className="prchange-input-wrapper">
                  <svg className="prchange-search-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input 
                    type="text" 
                    name="purchaseOrg"
                    value={formData.purchaseOrg} 
                    onChange={handleInputChange}
                    placeholder="Enter Purchase Org"
                    className="prchange-input-with-icon" 
                  />
                </div>
              </div>
              <div className="prchange-field">
                <label className="prchange-label">Vendor*</label>
                <div className="prchange-input-wrapper">
                  <svg className="prchange-search-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input 
                    type="text" 
                    name="vendor" 
                    value={formData.vendor} 
                    onChange={handleInputChange} 
                    placeholder="Enter Vendor" 
                    className="prchange-input-with-icon" 
                  />
                </div>
              </div>
            </div>

            <div className="prchange-field prchange-full">
              <label className="prchange-label">Description*</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                placeholder="Describe the required service in detail..." 
                className="prchange-textarea" 
                rows={5} 
              />
              <small className="prchange-helper-text">Title will auto-fill from first line</small>
            </div>

            <div className="prchange-row prchange-row-3cols">
              <div className="prchange-field">
                <label className="prchange-label">Commodity*</label>
                <input 
                  type="text" 
                  name="commodity" 
                  value={formData.commodity} 
                  onChange={handleInputChange} 
                  placeholder="Enter Commodity"
                  className="prchange-input" 
                />
              </div>
              <div className="prchange-field">
                <label className="prchange-label">Contract (Optional)</label>
                <input 
                  type="text" 
                  name="contract" 
                  value={formData.contract} 
                  onChange={handleInputChange} 
                  placeholder="Enter Contract"
                  className="prchange-input" 
                />
              </div>
              <div className="prchange-field">
                <label className="prchange-label">Purchase Group</label>
                <input
                  type="text"
                  name="purchaseGroup"
                  value={formData.purchaseGroup}
                  onChange={handleInputChange}
                  placeholder="Enter Purchase Group"
                  className="prchange-input"
                />
              </div>
            </div>

            <div className="prchange-amount-card">
              <div className="prchange-row">
                <div className="prchange-field">
                  <label className="prchange-label">Expected Amount (AED)*</label>
                  <input
                    type="text"
                    name="expectedAmount"
                    value={formData.expectedAmount}
                    onChange={handleInputChange}
                    placeholder="Enter Expected Amount"
                    className="prchange-input"
                  />
                </div>
                <div className="prchange-field">
                  <label className="prchange-label">Maximum Amount (AED)*</label>
                  <input
                    type="text"
                    name="maximumAmount"
                    value={formData.maximumAmount}
                    onChange={handleInputChange}
                    placeholder="Enter Maximum Amount"
                    className="prchange-input"
                  />
                </div>
              </div>
            </div>

            <div className="prchange-row">
              <div className="prchange-field">
                <label className="prchange-label">Service Start Date*</label>
                <input 
                  type="date" 
                  name="serviceStartDate" 
                  value={formData.serviceStartDate} 
                  onChange={handleInputChange} 
                  className="prchange-input" 
                />
              </div>
              <div className="prchange-field">
                <label className="prchange-label">Service End Date*</label>
                <input 
                  type="date" 
                  name="serviceEndDate" 
                  value={formData.serviceEndDate} 
                  onChange={handleInputChange} 
                  className="prchange-input" 
                />
              </div>
            </div>

            <div className="prchange-row">
              <div className="prchange-field">
                <label className="prchange-label">GL Account*</label>
                <input 
                  type="text" 
                  name="glAccount" 
                  value={formData.glAccount} 
                  onChange={handleInputChange} 
                  placeholder="Enter GL Account"
                  className="prchange-input" 
                />
              </div>
              <div className="prchange-field">
                <label className="prchange-label">Cost Center*</label>
                <input 
                  type="text" 
                  name="costCenter" 
                  value={formData.costCenter} 
                  onChange={handleInputChange} 
                  placeholder="Enter Cost Center"
                  className="prchange-input" 
                />
              </div>
            </div>

            <div className="prchange-smart-defaults">
              <div className="prchange-smart-header">
                <div className="prchange-zap-icon-wrapper">
                  <FaWandMagicSparkles />
                </div>
                <div>
                  <div className="prchange-smart-title">Smart Defaults Applied</div>
                  <div className="prchange-smart-subtitle">We've taken care of these for you</div>
                </div>
              </div>

              <div className="prchange-defaults-grid">
                <div className="prchange-default-item">
                  <div className="prchange-icon-box prchange-bg-green-light"><FaBuilding /></div>
                  <div>
                    <div className="prchange-default-label">Company Code</div>
                    <div className="prchange-default-value">-</div>
                  </div>
                </div>
                <div className="prchange-default-item">
                  <div className="prchange-icon-box prchange-bg-cyan-light"><FaChartArea /></div>
                  <div>
                    <div className="prchange-default-label">Ship-to Plant</div>
                    <div className="prchange-default-value">-</div>
                  </div>
                </div>
                <div className="prchange-default-item">
                  <div className="prchange-icon-box prchange-bg-blue-light"><FaLocationDot /></div>
                  <div>
                    <div className="prchange-default-label">Bill-to</div>
                    <div className="prchange-default-value">-</div>
                  </div>
                </div>
                <div className="prchange-default-item">
                  <div className="prchange-icon-box prchange-bg-yellow-light"><FaFileInvoiceDollar /></div>
                  <div>
                    <div className="prchange-default-label">Tax Code</div>
                    <div className="prchange-default-value">-</div>
                  </div>
                </div>
                <div className="prchange-default-item">
                  <div className="prchange-icon-box prchange-bg-orange-light"><TbTruckDelivery /></div>
                  <div>
                    <div className="prchange-default-label">Delivery Date</div>
                    <div className="prchange-default-value">-</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="prchange-footer">
            <button type="button" className="prchange-draft-button">Save Changes as Draft</button>
            <button type="button" className="prchange-submit-button">
              <GrSend /> Submit Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeExistingPR;