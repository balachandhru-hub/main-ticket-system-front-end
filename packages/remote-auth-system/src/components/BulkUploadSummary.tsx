import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit, FiX, FiCheck } from 'react-icons/fi';
import * as XLSX from "xlsx";
import { uploadBulkExcel, getMaterailDetails, uploadBulkExcelForService, } from '../api/smPrMaterialApi';
import { toast } from 'react-toastify';

interface LineItem {
    id: string;
    lineNo: number;
    uniqueId: string;
    purchaseOrg: string;
    vendor: string;
    title: string;
    description: string;
    materialCode?: string;
    commodity: string;
    contract?: string;
    purchaseGroup?: string;
    expectedAmount?: string;
    maximumAmount?: string;
    serviceStartDate?: string;
    serviceEndDate?: string;
    quantity?: string;
    uom?: string;
    unitPrice?: string;
    amount?: string;
    deliveryDate?: string;
    deliveryTo?: string;
    glAccount?: string;
    costCenter?: string;
    companyCode?: string;
    shipToPlant?: string;
    billTo?: string;
    taxCode?: string;
    currency?: string;
    needBy?: string;
    _raw?: any;
}

interface Props {
    data: LineItem[];
    setData: React.Dispatch<React.SetStateAction<LineItem[]>>;
    type: 'service' | 'material';
    onClose: () => void;
}

const mapToExcelData = (items: LineItem[], type: 'service' | 'material') => {
    const toNum = (val: string | number | undefined) => {
        if (val === undefined || val === null || val === '') return '';
        const num = Number(val);
        return isNaN(num) ? val : num;
    };

    const toStr = (val: string | number | undefined) => {
        if (val === undefined || val === null || val === '') return '';
        return String(val);
    };

    const toDate = (val: string | number | undefined) => {
        if (val === undefined || val === null || val === '') return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const setRawValue = (raw: any, keys: string[], value: any, defaultKey: string) => {
        const foundKey = keys.find(k => Object.prototype.hasOwnProperty.call(raw, k));
        if (foundKey) {
            raw[foundKey] = value;
        } else {
            raw[defaultKey] = value;
        }
    };

    return items.map(item => {
        if (type === 'service') {
            return {
                'PurchaseOrg': toStr(item.purchaseOrg),
                'Description': toStr(item.description),
                'Commodity': toStr(item.commodity),
                'Amount': toNum(item.amount),
                'ServiceStartDate': toDate(item.serviceStartDate),
                'ServiceEndDate': toDate(item.serviceEndDate),
                'Vendor': toStr(item.vendor),
                'Contract': toStr(item.contract),
                'Title': toStr(item.title),
                'Currency': toStr(item.currency),
                'GLAccount': toStr(item.glAccount),
                'CostCenter': toStr(item.costCenter),
                'CompanyCode': toStr(item.companyCode),
                'PurchaseGroup': toStr(item.purchaseGroup),
                'BillTo': toStr(item.billTo),
                'TaxCode': toStr(item.taxCode),
                'PRServiceUniqueName': toStr(item.uniqueId),
                'LineItemNumber': item.lineNo,
                'ExpectedAmount': toNum(item.expectedAmount),
                'MaxAmount': toNum(item.maximumAmount),
                'DeliverTo': toStr(item.deliveryTo),
                'MaterialCode': toStr(item.materialCode),
                'UOM': toStr(item.uom),
                'ShipToPlant': toStr(item.shipToPlant),
            };
        }

        const row = { ...(item._raw || {}) };

        setRawValue(row, ['LineItemNumber', 'LINE ITEM NO', 'Line Item No'], item.lineNo, 'LineItemNumber');
        setRawValue(row, ['PRUniqueName', 'PRUNIQUE NAME', 'PR Unique Name'], toStr(item.uniqueId), 'PRUniqueName');
        setRawValue(row, ['PurchaseOrg', 'PURCHASE ORG', 'Purchase Org'], toStr(item.purchaseOrg), 'PurchaseOrg');
        setRawValue(row, ['Vendor', 'VENDOR'], toStr(item.vendor), 'Vendor');
        setRawValue(row, ['Title', 'TITLE'], toStr(item.title), 'Title');
        setRawValue(row, ['Description', 'DESCRIPTION'], toStr(item.description), 'Description');
        setRawValue(row, ['Commodity', 'COMMODITY'], toStr(item.commodity), 'Commodity');
        setRawValue(row, ['Contract', 'CONTRACT'], toStr(item.contract), 'Contract');
        setRawValue(row, ['PurchaseGroup', 'PURCHASE GROUP', 'Purchase Group'], toStr(item.purchaseGroup), 'PurchaseGroup');
        setRawValue(row, ['GLAccount', 'GL ACCOUNT', 'GL Account'], toStr(item.glAccount), 'GLAccount');
        setRawValue(row, ['CostCenter', 'COST CENTER', 'Cost Center'], toStr(item.costCenter), 'CostCenter');
        setRawValue(row, ['CompanyCode', 'COMPANY CODE', 'Company Code'], toStr(item.companyCode), 'CompanyCode');
        setRawValue(row, ['ShipToPlant', 'SHIP TO PLANT', 'Ship To Plant'], toStr(item.shipToPlant), 'ShipToPlant');
        setRawValue(row, ['BillTo', 'BILL TO', 'Bill To'], toStr(item.billTo), 'BillTo');
        setRawValue(row, ['TaxCode', 'TAX CODE', 'Tax Code'], toStr(item.taxCode), 'TaxCode');
        setRawValue(row, ['Currency', 'CURRENCY'], toStr(item.currency), 'Currency');

        setRawValue(row, ['MaterialCode', 'MATERIAL CODE', 'Material Code'], toStr(item.materialCode), 'MaterialCode');
        setRawValue(row, ['Quantity', 'QUANTITY'], toNum(item.quantity), 'Quantity');
        setRawValue(row, ['UOM', 'UOM'], toStr(item.uom), 'UOM');
        setRawValue(row, ['Amount', 'AMOUNT', 'Unit Price', 'UNIT PRICE'], toNum(item.unitPrice), 'Amount');
        setRawValue(row, ['DeliveryDate', 'DELIVERY DATE', 'Delivery Date'], toDate(item.deliveryDate), 'DeliveryDate');
        setRawValue(row, ['NeedBy', 'NEED BY', 'Need By'], toDate(item.needBy), 'NeedBy');
        setRawValue(row, ['DeliverTo', 'DELIVER TO', 'Deliver To'], toStr(item.deliveryTo), 'DeliverTo');

        return row;
    });
};

const BulkUploadSummary: React.FC<Props> = ({ data, setData, type, onClose }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<LineItem | null>(null);
    const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (type !== 'material' && type !== 'service') return;

        const processRows = async () => {
            const rowsToUpdate = data.filter(item =>
                item.materialCode &&
                (!item.commodity || !item.taxCode || !item.uom) &&
                !processedIds.has(item.id)
            );

            if (rowsToUpdate.length === 0) return;

            setProcessedIds(prev => {
                const newSet = new Set(prev);
                rowsToUpdate.forEach(r => newSet.add(r.id));
                return newSet;
            });

            let hasChanges = false;
            const updatedData = [...data];

            await Promise.all(rowsToUpdate.map(async (row) => {
                try {
                    const details = await getMaterailDetails(row.materialCode!);
                    if (details) {
                        const index = updatedData.findIndex(r => r.id === row.id);
                        if (index !== -1) {
                            const currentItem = updatedData[index];
                            const newItem = { ...currentItem };
                            let changed = false;

                            if (!newItem.commodity && details.commodityCode) { newItem.commodity = details.commodityCode; changed = true; }
                            if (!newItem.taxCode && details.taxCode) { newItem.taxCode = details.taxCode; changed = true; }
                            if (!newItem.uom && details.unitOfMeasure) { newItem.uom = details.unitOfMeasure; changed = true; }

                            if (changed) {
                                updatedData[index] = newItem;
                                hasChanges = true;
                            }
                        }
                    }
                } catch (error) {
                }
            }));

            if (hasChanges) {
                setData(updatedData);
                toast.success("Auto-fetched missing material details");
            }
        };

        processRows();
    }, [data, type, processedIds, setData]);

    const navigate = useNavigate();

    const serviceColumns = [
        'LINE ITEM NO', 'UNIQUE ID', 'PURCHASE ORG', 'VENDOR', 'TITLE', 'DESCRIPTION', 'MATERIAL CODE',
        'COMMODITY', 'CONTRACT', 'PURCHASE GROUP', 'EXPECTED AMOUNT', 'MAXIMUM AMOUNT',
        'SERVICE START DATE', 'SERVICE END DATE', 'GL ACCOUNT', 'COST CENTER', 'COMPANY CODE',
        'SHIP TO PLANT', 'BILL TO', 'TAX CODE', 'CURRENCY', 'UOM', 'DELIVER TO'
    ];

    const materialColumns = [
        'LINE ITEM NO', 'UNIQUE ID', 'PURCHASE ORG', 'VENDOR', 'TITLE', 'DESCRIPTION',
        'MATERIAL CODE', 'COMMODITY', 'CONTRACT', 'PURCHASE GROUP', 'QUANTITY', 'UOM',
        'UNIT PRICE', 'DELIVERY DATE', 'DELIVERY TO', 'GL ACCOUNT', 'COST CENTER',
        'COMPANY CODE', 'SHIP TO PLANT', 'BILL TO', 'TAX CODE', 'CURRENCY',
    ];

    const columns = type === 'service' ? serviceColumns : materialColumns;
    const handleEditClick = (item: LineItem) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const handleSaveClick = async () => {
        if (!editForm) return;

        let updatedForm = { ...editForm };

        if (type === 'material' && updatedForm.materialCode) {
            const isMissingDetails = !updatedForm.commodity || !updatedForm.taxCode || !updatedForm.uom;

            if (isMissingDetails) {
                try {
                    const details = await getMaterailDetails(updatedForm.materialCode);
                    if (details) {
                        if (!updatedForm.commodity && details.commodityCode) updatedForm.commodity = details.commodityCode;
                        if (!updatedForm.taxCode && details.taxCode) updatedForm.taxCode = details.taxCode;
                        if (!updatedForm.uom && details.unitOfMeasure) updatedForm.uom = details.unitOfMeasure;
                        toast.success("Material details auto-fetched!");
                    }
                } catch (error) {
                   
                }
            }
        }

        setData(prev => prev.map(item => item.id === updatedForm.id ? updatedForm : item));
        setEditingId(null);
        setEditForm(null);
    };

    const handleCancelClick = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleInputChange = (field: keyof LineItem, value: string) => {
        if (!editForm) return;
        setEditForm({ ...editForm, [field]: value });
    };


    const handleSubmitSelected = async () => {
        if (data.length === 0) {
            toast.error("No data to submit.");
            return;
        }
        try {
            const mappedData = mapToExcelData(data, type);
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(mappedData);
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const file = new File([excelBuffer], `bulk_upload_${type}_${Date.now()}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            let response;
            if (type === 'service') {
                response = await uploadBulkExcelForService(file);
            } else {
                response = await uploadBulkExcel(file);
            }

            if (response && 'successfulUploads' in response) {
                navigate(`/bulk-upload/${type}`, {
                    state: {
                        uploadSummary: {
                            rows: data,
                            totalRows: data.length,
                            apiResponse: response
                        }
                    }
                });
                onClose();
            } else {
                toast.error("Upload completed with unknown status.");
            }
        } catch (error) {
            toast.error("Failed to submit requisition.");
        }
    };

    return (
        <div>

            <div className="bulk-upload-table-wrapper" style={{ marginTop: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                <table className="bulk-upload-table">
                    <thead className="bulk-upload-table-head" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                            {columns.map((col) => (
                                <th key={col} className="bulk-upload-table-header" style={{ position: 'sticky', top: 0, background: '#e3e3e3', zIndex: 10 }}>
                                    {col}
                                </th>
                            ))}
                            <th className="bulk-upload-table-header" style={{ position: 'sticky', top: 0, background: '#e3e3e3', zIndex: 10 }}>EDIT</th>
                        </tr>
                    </thead>
                    <tbody className="bulk-upload-table-body">
                        {data.map((item) => {
                            const isEditing = editingId === item.id;
                            return (
                                <tr key={item.id} className="bulk-upload-table-row">
                                    <td className="bulk-upload-table-cell">{item.lineNo}</td>
                                    <td className="bulk-upload-table-cell">{item.uniqueId}</td>
                                    <td className="bulk-upload-table-cell">{item.purchaseOrg}</td>
                                    <td className="bulk-upload-table-cell">{item.vendor}</td>
                                    <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.title} onChange={(e) => handleInputChange('title', e.target.value)} /> : item.title}</td>
                                    <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.description} onChange={(e) => handleInputChange('description', e.target.value)} /> : item.description}</td>
                                    {type === 'service' && (
                                        <>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.materialCode} onChange={(e) => handleInputChange('materialCode', e.target.value)} /> : (item.materialCode || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.commodity} onChange={(e) => handleInputChange('commodity', e.target.value)} /> : item.commodity}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.contract} onChange={(e) => handleInputChange('contract', e.target.value)} /> : (item.contract || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.purchaseGroup} onChange={(e) => handleInputChange('purchaseGroup', e.target.value)} /> : (item.purchaseGroup || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.expectedAmount} onChange={(e) => handleInputChange('expectedAmount', e.target.value)} /> : (item.expectedAmount || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.maximumAmount} onChange={(e) => handleInputChange('maximumAmount', e.target.value)} /> : (item.maximumAmount || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.serviceStartDate} onChange={(e) => handleInputChange('serviceStartDate', e.target.value)} /> : (item.serviceStartDate || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.serviceEndDate} onChange={(e) => handleInputChange('serviceEndDate', e.target.value)} /> : (item.serviceEndDate || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.glAccount} onChange={(e) => handleInputChange('glAccount', e.target.value)} /> : (item.glAccount || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.costCenter} onChange={(e) => handleInputChange('costCenter', e.target.value)} /> : (item.costCenter || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.companyCode} onChange={(e) => handleInputChange('companyCode', e.target.value)} /> : (item.companyCode || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.shipToPlant} onChange={(e) => handleInputChange('shipToPlant', e.target.value)} /> : (item.shipToPlant || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.billTo} onChange={(e) => handleInputChange('billTo', e.target.value)} /> : (item.billTo || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.taxCode} onChange={(e) => handleInputChange('taxCode', e.target.value)} /> : (item.taxCode || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.currency} onChange={(e) => handleInputChange('currency', e.target.value)} /> : (item.currency || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.uom} onChange={(e) => handleInputChange('uom', e.target.value)} /> : (item.uom || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.deliveryTo} onChange={(e) => handleInputChange('deliveryTo', e.target.value)} /> : (item.deliveryTo || '-')}</td>
                                        </>
                                    )}
                                    {type === 'material' && (
                                        <>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.materialCode} onChange={(e) => handleInputChange('materialCode', e.target.value)} /> : (item.materialCode || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.commodity} onChange={(e) => handleInputChange('commodity', e.target.value)} /> : item.commodity}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.contract} onChange={(e) => handleInputChange('contract', e.target.value)} /> : (item.contract || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.purchaseGroup} onChange={(e) => handleInputChange('purchaseGroup', e.target.value)} /> : (item.purchaseGroup || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} /> : (item.quantity || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.uom} onChange={(e) => handleInputChange('uom', e.target.value)} /> : (item.uom || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.unitPrice} onChange={(e) => handleInputChange('unitPrice', e.target.value)} /> : (item.unitPrice || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.deliveryDate} onChange={(e) => handleInputChange('deliveryDate', e.target.value)} /> : (item.deliveryDate || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.deliveryTo} onChange={(e) => handleInputChange('deliveryTo', e.target.value)} /> : (item.deliveryTo || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.glAccount} onChange={(e) => handleInputChange('glAccount', e.target.value)} /> : (item.glAccount || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.costCenter} onChange={(e) => handleInputChange('costCenter', e.target.value)} /> : (item.costCenter || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.companyCode} onChange={(e) => handleInputChange('companyCode', e.target.value)} /> : (item.companyCode || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.shipToPlant} onChange={(e) => handleInputChange('shipToPlant', e.target.value)} /> : (item.shipToPlant || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.billTo} onChange={(e) => handleInputChange('billTo', e.target.value)} /> : (item.billTo || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.taxCode} onChange={(e) => handleInputChange('taxCode', e.target.value)} /> : (item.taxCode || '-')}</td>
                                            <td className="bulk-upload-table-cell">{isEditing ? <input className="bulk-upload-edit-input" value={editForm?.currency} onChange={(e) => handleInputChange('currency', e.target.value)} /> : (item.currency || '-')}</td>
                                        </>
                                    )}
                                    <td className="bulk-upload-table-cell">
                                        {isEditing ? (
                                            <>
                                                <button className="bulk-upload-save-btn" onClick={handleSaveClick} title="Save"><FiCheck /></button>
                                                <button className="bulk-upload-cancel-btn" onClick={handleCancelClick} title="Cancel"><FiX /></button>
                                            </>
                                        ) : (
                                            <button
                                                className="bulk-upload-edit-btn"
                                                onClick={() => handleEditClick(item)}
                                                title="Edit"
                                            >
                                                <FiEdit /> Edit
                                            </button>
                                        )}
                                    </td>

                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="bulk-upload-footer-actions">
                <button
                    className="bulk-upload-footer-btn bulk-upload-submit-btn"
                    onClick={handleSubmitSelected}
                    style={{ marginTop: '10px' }}
                >
                    Submit
                </button>
            </div>
        </div >

    );
}

export default BulkUploadSummary;