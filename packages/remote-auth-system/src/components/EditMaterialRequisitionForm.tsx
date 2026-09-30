import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './EditMaterialRequisitionForm.css';
import { FaWandMagicSparkles, FaBuilding, FaChartArea, FaLocationDot, FaFileInvoiceDollar } from 'react-icons/fa6';
import { TbPackage } from 'react-icons/tb';
import { GrSend } from "react-icons/gr";
import BackButton from './BackButton';
import { toast } from 'react-toastify';
import { updateMaterialPR } from '../api/updateMaterialPRapi';
import { getMyProfile } from '../api/userApi';
import { getPRSmartDefaults } from '../api/smmaterialPRApi';

type LineItem = {
    id: string;
    lineNo: number;
    uniqueId: string;
    purchaseOrg: string;
    prNumber: string;
    prUniqueName: string;
    vendor: string;
    description: string;
    commodity: string;
    contract: string;
    purchaseGroup: string;
    materialcode: string;
    quantity: string;
    uom: string;
    unitPrice: string;
    deliveryDate: string;
    deliveryTo: string;
    glAccount: string;
    costCenter: string;
    companyCode?: string;
    shipToPlant?: string;
    billTo?: string;
    taxCode?: string;
    materialGroup?: string;
};

type SmartDefaults = {
    companyCode: string;
    shipToPlant: string;
    billTo: string;
    purchaseGroup: string;
    purchaseOrg: string;
    currency: string;
    deliverTo: string;
    costCenter: string;
    taxCode: string;
};

const EditMaterialRequisitionForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const initialLineItem = location.state?.lineItemData as LineItem | undefined;

    const [formData, setFormData] = useState({
        id: initialLineItem?.id || '',
        lineNo: initialLineItem?.lineNo || 0,
        purchaseOrg: initialLineItem?.purchaseOrg || '',
        prNumber: initialLineItem?.prNumber || '',
        prUniqueName: initialLineItem?.prUniqueName || '',
        vendor: initialLineItem?.vendor || '',
        description: initialLineItem?.description || '',
        materialCode: initialLineItem?.materialcode || '',
        commodity: initialLineItem?.commodity || '',
        contract: initialLineItem?.contract || '',
        purchaseGroup: initialLineItem?.purchaseGroup || '',
        quantity: initialLineItem?.quantity || '',
        uom: initialLineItem?.uom || '',
        unitPrice: initialLineItem?.unitPrice || '',
        deliveryDate: initialLineItem?.deliveryDate || '',
        deliveryTo: initialLineItem?.deliveryTo || '',
        glAccount: initialLineItem?.glAccount || '',
        costCenter: initialLineItem?.costCenter || '',
        taxCode: initialLineItem?.taxCode || '',
    });

    const [smartDefaults, setSmartDefaults] = useState<SmartDefaults>({
        companyCode: '',
        shipToPlant: '',
        billTo: '',
        purchaseGroup: '',
        purchaseOrg: '',
        currency: '',
        deliverTo: '',
        costCenter: '',
        taxCode: '',
    });

    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoadingSmartDefaults, setIsLoadingSmartDefaults] = useState(false);

    useEffect(() => {
        if (!initialLineItem) {
            toast.error("No item selected for editing. Returning to main form.");
            navigate('/simply-pr', { state: { type: 'material' } });
        }

        // Fetch smart defaults
        const fetchSmartDefaults = async () => {
            try {
                setIsLoadingSmartDefaults(true);
                const profileData = await getMyProfile();
                if ('aribaUserName' in profileData && profileData.aribaUserName) {
                    const response = await getPRSmartDefaults(profileData.aribaUserName as string);
                    if ('companyCode' in response) {
                        setSmartDefaults({
                            companyCode: response.companyCode,
                            shipToPlant: response.shipToPlant,
                            billTo: response.billTo,
                            purchaseGroup: response.purchaseGroup,
                            purchaseOrg: response.purchaseOrg,
                            currency: response.currency,
                            deliverTo: response.deliverTo || '',
                            costCenter: response.costCenter,
                            taxCode: response.taxCode || '',
                        });
                    }
                }
            } catch (error) {
                
            } finally {
                setIsLoadingSmartDefaults(false);
            }
        };

        fetchSmartDefaults();
    }, [initialLineItem, navigate]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const extractCode = (str: string): string => {
        if (!str) return '';
        return str.split(' - ')[0].trim();
    };

    const handleUpdate = async () => {
        if (!formData.description || !formData.deliveryDate || !formData.deliveryTo || !formData.vendor || !formData.prNumber) {
            toast.error('Please fill in all required fields.');
            return;
        }

        setIsUpdating(true);
        try {
            const updatePayload = {
                purchaseOrg: formData.purchaseOrg,
                vendor: formData.vendor,
                description: formData.description,
                commodity: extractCode(formData.commodity),
                contract: extractCode(formData.contract),
                purchaseGroup: formData.purchaseGroup,
                quantity: parseInt(formData.quantity) || 0,
                uom: formData.uom,
                amount: parseFloat(formData.unitPrice) || 0,
                deliveryDate: formData.deliveryDate,
                deliverTo: formData.deliveryTo,
                glAccount: extractCode(formData.glAccount),
                costCenter: extractCode(formData.costCenter),
                materialCode: extractCode(formData.materialCode),
                taxCode: formData.taxCode,
            };

            const prNumber = formData.prNumber;

            if (!prNumber) {
                toast.error('PR Number is missing. Cannot update.');
                setIsUpdating(false);
                return;
            }

            const response = await updateMaterialPR(prNumber, updatePayload);

            if (response.statusCode === 200 || response.statusCode < 300) {
                toast.success(`Line item ${formData.lineNo} updated successfully!`);
                navigate('/simply-pr', { state: { type: 'material' } });
            } else {
                toast.error(`Update failed: ${response.message}`);
            }
        } catch (error) {
            toast.error('Failed to update requisition. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="edit-material-page">
            <div className="edit-material-button-container">
                <BackButton
                    className="edit-material-back-button"
                    iconClassName="CD-add-icon"
                    onClick={() => navigate('/simply-pr', { state: { type: 'material' } })}
                />
            </div>
            <div className='edit-materail-header'>
                <h1>Edit Material Requisition Line Item: {formData.lineNo}</h1>
            </div>
            <div className="edit-material-form-card">
                <div className="edit-material-form-header">
                    <h2>Material Request</h2>
                </div>

                <div className="edit-material-form-body">
                    <div className="edit-material-row">
                        <div className="edit-material-field">
                            <label className="edit-material-label">Purchase Org</label>
                            <input
                                type="text"
                                name="purchaseOrg"
                                value={formData.purchaseOrg}
                                readOnly
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">PR Number</label>
                            <input
                                type="text"
                                name="prNumber"
                                value={formData.prNumber}
                                readOnly
                                className="edit-material-input"
                            />
                        </div>
                    </div>

                    <div className="edit-material-row">
                        <div className="edit-material-field">
                            <label className="edit-material-label">PR Unique Name*</label>
                            <input
                                type="text"
                                name="prUniqueName"
                                value={formData.prUniqueName}
                                onChange={handleInputChange}
                                placeholder="Enter PR Unique Name"
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">Vendor*</label>
                            <input
                                type="text"
                                name="vendor"
                                value={formData.vendor}
                                onChange={handleInputChange}
                                className="edit-material-input"
                                placeholder="Enter Vendor"
                            />
                        </div>
                    </div>

                    <div className="edit-material-field edit-material-full">
                        <label className="edit-material-label">Description*</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="edit-material-textarea"
                            rows={3}
                            placeholder="Describe the required material in detail..."
                        />
                        <small className="edit-material-helper-text">Title will auto-fill from first line</small>
                    </div>

                    <div className="edit-material-row">
                        <div className="edit-material-field">
                            <label className="edit-material-label">Material Code*</label>
                            <input
                                type="text"
                                name="materialCode"
                                value={formData.materialCode}
                                onChange={handleInputChange}
                                placeholder="Enter Material Code"
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">Commodity*</label>
                            <input
                                type="text"
                                name="commodity"
                                value={formData.commodity}
                                onChange={handleInputChange}
                                placeholder="Enter Commodity"
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">Contract (Optional)</label>
                            <input
                                type="text"
                                name="contract"
                                value={formData.contract}
                                onChange={handleInputChange}
                                placeholder="Enter Contract"
                                className="edit-material-input"
                            />
                        </div>
                    </div>

                    <div className="edit-material-quantity-section">
                        <div className="edit-material-quantity-row">
                            <div className="edit-material-field">
                                <label className="edit-material-label">Quantity*</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    placeholder="Enter Quantity"
                                    className="edit-material-input"
                                />
                            </div>
                            <div className="edit-material-field">
                                <label className="edit-material-label">UOM*</label>
                                <input
                                    type="text"
                                    name="uom"
                                    value={formData.uom}
                                    onChange={handleInputChange}
                                    placeholder="Enter UOM"
                                    className="edit-material-input"
                                />
                            </div>
                            <div className="edit-material-field">
                                <label className="edit-material-label">Unit Price (AED)*</label>
                                <input
                                    type="number"
                                    name="unitPrice"
                                    value={formData.unitPrice}
                                    onChange={handleInputChange}
                                    placeholder="Enter Unit Price"
                                    className="edit-material-input"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="edit-material-row">
                        <div className="edit-material-field">
                            <label className="edit-material-label">Delivery Date*</label>
                            <input
                                type="date"
                                name="deliveryDate"
                                value={formData.deliveryDate}
                                onChange={handleInputChange}
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">Delivery To*</label>
                            <input
                                type="text"
                                name="deliveryTo"
                                value={formData.deliveryTo}
                                onChange={handleInputChange}
                                placeholder="Enter Delivery To"
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">Purchase Group</label>
                            <input
                                type="text"
                                name="purchaseGroup"
                                value={formData.purchaseGroup}
                                onChange={handleInputChange}
                                placeholder="Enter Purchase Group"
                                className="edit-material-input"
                            />
                        </div>
                    </div>

                    <div className="edit-material-row">
                        <div className="edit-material-field">
                            <label className="edit-material-label">GL Account*</label>
                            <input
                                type="text"
                                name="glAccount"
                                value={formData.glAccount}
                                onChange={handleInputChange}
                                placeholder="Enter GL Account"
                                className="edit-material-input"
                            />
                        </div>
                        <div className="edit-material-field">
                            <label className="edit-material-label">Cost Center*</label>
                            <input
                                type="text"
                                name="costCenter"
                                value={formData.costCenter}
                                onChange={handleInputChange}
                                placeholder="Enter Cost Center"
                                className="edit-material-input"
                            />
                        </div>
                    </div>

                    <div className="edit-material-smart-defaults">
                        <div className="edit-material-smart-header">
                            <div className="edit-material-zap-icon-wrapper">
                                <FaWandMagicSparkles />
                            </div>
                            <div>
                                <div className="edit-material-smart-title">Smart Defaults Applied</div>
                                <div className="edit-material-smart-subtitle">We've taken care of these for you</div>
                            </div>
                        </div>

                        <div className="edit-material-defaults-grid">
                            <div className="edit-material-default-item">
                                <div className="edit-material-icon-box edit-material-bg-green-light">
                                    <FaBuilding />
                                </div>
                                <div>
                                    <div className="edit-material-default-label">Company Code</div>
                                    <div className="edit-material-default-value">
                                        {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.companyCode || '-')}
                                    </div>
                                </div>
                            </div>
                            <div className="edit-material-default-item">
                                <div className="edit-material-icon-box edit-material-bg-cyan-light">
                                    <FaChartArea />
                                </div>
                                <div>
                                    <div className="edit-material-default-label">Ship-to Plant</div>
                                    <div className="edit-material-default-value">
                                        {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.shipToPlant || '-')}
                                    </div>
                                </div>
                            </div>
                            <div className="edit-material-default-item">
                                <div className="edit-material-icon-box edit-material-bg-blue-light">
                                    <FaLocationDot />
                                </div>
                                <div>
                                    <div className="edit-material-default-label">Bill-to</div>
                                    <div className="edit-material-default-value">
                                        {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.billTo || '-')}
                                    </div>
                                </div>
                            </div>
                            <div className="edit-material-default-item">
                                <div className="edit-material-icon-box edit-material-bg-yellow-light">
                                    <FaFileInvoiceDollar />
                                </div>
                                <div>
                                    <div className="edit-material-default-label">Currency</div>
                                    <div className="edit-material-default-value">
                                        {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.currency || '-')}
                                    </div>
                                </div>
                            </div>
                            <div className="edit-material-default-item">
                                <div className="edit-material-icon-box edit-material-bg-purple-light">
                                    <TbPackage />
                                </div>
                                <div>
                                    <div className="edit-material-default-label">Delivery To</div>
                                    <div className="edit-material-default-value">
                                        {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.deliverTo || '-')}
                                    </div>
                                </div>
                            </div>
                            <div className="edit-material-default-item">
                                <div className="edit-material-icon-box edit-material-bg-yellow-light">
                                    <FaFileInvoiceDollar />
                                </div>
                                <div>
                                    <div className="edit-material-default-label">Tax Code</div>
                                    <div className="edit-material-default-value">
                                        {isLoadingSmartDefaults ? 'Loading...' : (smartDefaults.taxCode || '-')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="edit-material-smart-footer">
                            <div className="edit-material-footer-left">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                                <span>Based on your profile & policy</span>
                            </div>
                            <button type="button" className="edit-material-override-link">Need to override?</button>
                        </div>
                    </div>

                    <div className='edit-material-smart-btns'>
                        <button type="button" className="edit-material-tag-button">Account Type: Expenses</button>
                        <button type="button" className="edit-material-tag-button">Type: Materials</button>
                    </div>

                    <div className="edit-material-footer">
                        <button
                            type="button"
                            className="edit-material-submit-button"
                            onClick={handleUpdate}
                            disabled={isUpdating}
                        >
                            <GrSend />
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditMaterialRequisitionForm;