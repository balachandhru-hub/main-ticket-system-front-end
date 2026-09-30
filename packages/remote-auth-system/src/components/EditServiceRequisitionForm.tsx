import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './EditServiceRequisitionForm.css';
import { FaWandMagicSparkles, FaBuilding, FaChartArea, FaLocationDot, FaFileInvoiceDollar } from 'react-icons/fa6';
import { TbPackage, TbTruckDelivery } from 'react-icons/tb';
import { GrSend } from "react-icons/gr";
import BackButton from './BackButton';
import { updateServicePR } from '../api/servicePRApi';
import { toast } from 'react-toastify';
import { getMyProfile } from '../api/userApi';
import { getPRSmartDefaults } from '../api/smmaterialPRApi';

const EditServiceRequisitionForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [prNumber, setPrNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    purchaseOrg: '',
    vendor: '',
    description: '',
    commodityCode: '',
    contract: '',
    purchaseGroup: '',
    amount: '',
    serviceStartDate: '',
    serviceEndDate: '',
    glAccount: '',
    costCenter: '',
    title: '',
    prServiceUniqueName: '',
    deliveryDate: '',
    deliveryTo: '',
    companyCode: '',
    shipToPlant: '',
    billTo: '',
    currency: '',
    taxCode: '',
    uom: '',
  });

  const [smartDefaults, setSmartDefaults] = useState({
    companyCode: '',
    shipToPlant: '',
    billTo: '',
    purchaseGroup: '',
    currency: '',
    deliverTo: '',
    purchaseOrg: '',
    costCenter: '',
    taxCode: '',
  });

  // Initialize form with PR data
  useEffect(() => {
    const statePrData = location.state?.prData;

    if (!statePrData) {
      toast.error("No PR data found");
      navigate('/simply-pr', { state: { type: 'service' } });
      return;
    }

    setPrNumber(statePrData.prNumber);

    let itemData = statePrData;
    if (statePrData.lineItems && Array.isArray(statePrData.lineItems) && statePrData.lineItems.length > 0) {
      itemData = statePrData.lineItems[0];
    }

    setFormData({
      purchaseOrg: itemData.purchaseOrg || '',
      vendor: itemData.vendor || '',
      description: itemData.description || '',
      commodityCode: itemData.commodityCode || itemData.commodity || '',
      contract: itemData.contract || '',
      purchaseGroup: itemData.purchaseGroup || '',
      amount: itemData.amount || '',
      serviceStartDate: itemData.serviceStartDate ? itemData.serviceStartDate.split('T')[0] : '',
      serviceEndDate: itemData.serviceEndDate ? itemData.serviceEndDate.split('T')[0] : '',
      glAccount: itemData.glAccount || '',
      costCenter: itemData.costCenter || '',
      title: itemData.title || '',
      prServiceUniqueName: itemData.prServiceUniqueName || '',
      deliveryDate: itemData.deliveryDate ? itemData.deliveryDate.split('T')[0] : '',
      deliveryTo: itemData.deliveryTo || '',
      companyCode: itemData.companyCode || '1000',
      shipToPlant: itemData.shipToPlant || '',
      billTo: itemData.billTo || '',
      currency: itemData.currency || '',
      taxCode: itemData.taxCode || '',
      uom: itemData.uom || '',
    });

    // Fetch smart defaults
    const fetchSmartDefaults = async () => {
      try {
        const profileData = await getMyProfile();
        if ('aribaUserName' in profileData && profileData.aribaUserName) {
          const response = await getPRSmartDefaults(profileData.aribaUserName as string);
          if ('companyCode' in response) {
            setSmartDefaults({
              companyCode: response.companyCode,
              shipToPlant: response.shipToPlant,
              billTo: response.billTo,
              purchaseGroup: response.purchaseGroup,
              currency: response.currency,
              deliverTo: response.deliverTo || '',
              purchaseOrg: response.purchaseOrg,
              costCenter: response.costCenter,
              taxCode: response.taxCode || '',
            });
          }
        }
      } catch (error) {
    
      }
    };

    fetchSmartDefaults();
  }, [location.state, navigate]);

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const payload = {
      purchaseOrg: formData.purchaseOrg,
      vendor: formData.vendor,
      description: formData.description,
      commodityCode: formData.commodityCode,
      contract: formData.contract,
      purchaseGroup: formData.purchaseGroup,
      amount: parseFloat(formData.amount) || 0,
      serviceStartDate: formData.serviceStartDate || new Date().toISOString().split('T')[0],
      serviceEndDate: formData.serviceEndDate || new Date().toISOString().split('T')[0],
      glAccount: formData.glAccount,
      costCenter: formData.costCenter,
      title: formData.title,
      prServiceUniqueName: formData.prServiceUniqueName,
      deliveryDate: formData.deliveryDate || new Date().toISOString().split('T')[0],
      deliveryTo: formData.deliveryTo,
      taxCode: formData.taxCode,
      uom: formData.uom,
    };

    try {
      const response: any = await updateServicePR(prNumber, payload);
      if (response && (response.statusCode === 200 || response.success)) {
        toast.success("Service PR Updated Successfully!");
        navigate('/simply-pr', { state: { type: 'service' } });
      } else {
        toast.error(response.message || "Update Failed");
      }
    } catch (error) {
      toast.error("Failed to update Service PR");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="edit-service-page">
      <div className="edit-service-button-container">
        <BackButton
          className="edit-service-back-button"
          iconClassName="CD-add-icon"
          onClick={() => navigate('/simply-pr', { state: { type: 'service' } })}
        />
      </div>
      <div className='edit-service-header'>
        <h1>Edit Service Requisition (Non-Catalog)</h1>
      </div>
      <div className="edit-service-form-card">
        <div className="edit-service-form-header">
          <h2>Edit Service Request</h2>
        </div>

        <div className="edit-service-form-body">
          <div className="edit-service-row">
            <div className="edit-service-field">
              <label className="edit-service-label">Purchase Org</label>
              <input
                type="text"
                name="purchaseOrg"
                value={formData.purchaseOrg}
                onChange={handleInputChange}
                placeholder="Enter Purchase Org"
                className="edit-service-input"
              />
            </div>
            <div className="edit-service-field">
              <label className="edit-service-label">PR Unique Name*</label>
              <div className="edit-service-input-wrapper">
                <svg className="edit-service-search-icon" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  name="prServiceUniqueName"
                  value={formData.prServiceUniqueName}
                  onChange={handleInputChange}
                  placeholder="Enter PR Unique Name"
                  disabled
                  className="edit-service-input-with-icon"
                />
              </div>
            </div>
          </div>

          <div className="edit-service-field edit-service-full">
            <label className="edit-service-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the required service in detail..."
              className="edit-service-textarea"
              rows={3}
            />
            <small className="edit-service-helper-text">Title will auto-fill from first line</small>
          </div>

          <div className="edit-service-row">
            <div className="edit-service-field">
              <label className="edit-service-label">Commodity Code*</label>
              <input
                type="text"
                name="commodityCode"
                value={formData.commodityCode}
                onChange={handleInputChange}
                placeholder="Enter Commodity Code"
                className="edit-service-input"
              />
            </div>
            <div className="edit-service-field">
              <label className="edit-service-label">Contract (Optional)</label>
              <input
                type="text"
                name="contract"
                value={formData.contract}
                onChange={handleInputChange}
                placeholder="Enter Contract"
                className="edit-service-input"
              />
            </div>
            <div className="edit-service-field">
              <label className="edit-service-label">Purchase Group</label>
              <input
                type="text"
                name="purchaseGroup"
                value={formData.purchaseGroup}
                onChange={handleInputChange}
                placeholder="Enter Purchase Group"
                className="edit-service-input"
              />
            </div>
          </div>

          <div className="edit-service-row">
            <div className="edit-service-field">
              <label className="edit-service-label">Service Start Date*</label>
              <input
                type="date"
                name="serviceStartDate"
                value={formData.serviceStartDate}
                onChange={handleInputChange}
                className="edit-service-input"
              />
            </div>
            <div className="edit-service-field">
              <label className="edit-service-label">Service End Date*</label>
              <input
                type="date"
                name="serviceEndDate"
                value={formData.serviceEndDate}
                onChange={handleInputChange}
                className="edit-service-input"
              />
            </div>
            <div className='edit-service-field'>
              <label className="edit-service-label">Unit Price (AED)*</label>
              <input
                type="text"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Enter Unit Price"
                className="edit-service-input"
              />
            </div>
          </div>

          <div className="edit-service-row">
            <div className="edit-service-field">
              <label className="edit-service-label">GL Account*</label>
              <input
                type="text"
                name="glAccount"
                value={formData.glAccount}
                onChange={handleInputChange}
                placeholder="Enter GL Account"
                className="edit-service-input"
              />
            </div>
            <div className="edit-service-field">
              <label className="edit-service-label">Vendor*</label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                placeholder="Enter Vendor"
                className="edit-service-input"
              />
            </div>
            <div className="edit-service-field">
              <label className="edit-service-label">Cost Center*</label>
              <input
                type="text"
                name="costCenter"
                value={formData.costCenter}
                onChange={handleInputChange}
                placeholder="Enter Cost Center"
                className="edit-service-input"
              />
            </div>
          </div>

          <div className="edit-service-smart-defaults">
            <div className="edit-service-smart-header">
              <div className="edit-service-zap-icon-wrapper">
                <FaWandMagicSparkles />
              </div>
              <div>
                <div className="edit-service-smart-title">Smart Defaults Applied</div>
                <div className="edit-service-smart-subtitle">We've taken care of these for you</div>
              </div>
            </div>

            <div className="edit-service-defaults-grid">
              <div className="edit-service-default-item">
                <div className="edit-service-icon-box edit-service-bg-green-light">
                  <FaBuilding />
                </div>
                <div>
                  <div className="edit-service-default-label">Company Code</div>
                  <div className="edit-service-default-value">{smartDefaults.companyCode || '-'}</div>
                </div>
              </div>
              <div className="edit-service-default-item">
                <div className="edit-service-icon-box edit-service-bg-cyan-light">
                  <FaChartArea />
                </div>
                <div>
                  <div className="edit-service-default-label">Ship-to Plant</div>
                  <div className="edit-service-default-value">{smartDefaults.shipToPlant || '-'}</div>
                </div>
              </div>
              <div className="edit-service-default-item">
                <div className="edit-service-icon-box edit-service-bg-blue-light">
                  <FaLocationDot />
                </div>
                <div>
                  <div className="edit-service-default-label">Bill-to</div>
                  <div className="edit-service-default-value">{smartDefaults.billTo || '-'}</div>
                </div>
              </div>
              <div className="edit-service-default-item">
                <div className="edit-service-icon-box edit-service-bg-yellow-light">
                  <FaFileInvoiceDollar />
                </div>
                <div>
                  <div className="edit-service-default-label">Currency</div>
                  <div className="edit-service-default-value">{smartDefaults.currency || '-'}</div>
                </div>
              </div>
              <div className="edit-service-default-item">
                <div className="edit-service-icon-box edit-service-bg-purple-light">
                  <TbTruckDelivery />
                </div>
                <div>
                  <div className="edit-service-default-label">Delivery To</div>
                  <div className="edit-service-default-value">{smartDefaults.deliverTo || '-'}</div>
                </div>
              </div>
              <div className="edit-service-default-item">
                <div className="edit-service-icon-box edit-service-bg-purple-light">
                  <TbPackage />
                </div>
                <div>
                  <div className="edit-service-default-label">Uom</div>
                  <div className="edit-service-default-value">{formData.uom || '-'}</div>
                </div>
              </div>
            </div>

            <div className="edit-service-smart-footer">
              <div className="edit-service-footer-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span>Based on your profile & policy</span>
              </div>
              <button type="button" className="edit-service-override-link">Need to override?</button>
            </div>
          </div>

          <div className='edit-service-smart-btns'>
            <button type="button" className="edit-service-tag-button">Account Type: Expenses</button>
            <button type="button" className="edit-service-tag-button">Type: Services</button>
          </div>

          <div className="edit-service-footer">
            <button type="button" className="edit-service-submit-button" onClick={handleSubmit} disabled={isSubmitting}>
              <GrSend />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditServiceRequisitionForm;