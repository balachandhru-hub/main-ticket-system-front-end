import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './BulkUpload.css';
import BackButton from './BackButton';

import { createServicePR } from '../api/servicePRApi';
import { createMaterialPR } from '../api/smmaterialPRApi';
import type { ServicePRDto } from '../Dto/CreateServicePRDto';
import type { MaterialPRDto } from '../Dto/CreateMaterialPRDto';
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
  deliveryDate?: string;
  deliveryTo?: string;
  glAccount?: string;
  costCenter?: string;
  companyCode?: string;
  shipToPlant?: string;
  billTo?: string;
  taxCode?: string;
  currency?: string;
}

const BulkUploadPreview: React.FC = () => {
  const { type } = useParams<{ type: 'service' | 'material' }>();
  const navigate = useNavigate();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const location = useLocation();
  const [data, setData] = useState<LineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (location.state?.uploadSummary?.rows) {
      const mappedData: LineItem[] = location.state.uploadSummary.rows.map((row: any, index: number) => ({
        id: row.id || `row-${index}`,
        lineNo: Number(row.lineNo) || index + 1,
        uniqueId: String(row.uniqueId || ''),
        purchaseOrg: String(row.purchaseOrg || ''),
        vendor: String(row.vendor || ''),
        title: String(row.title || ''),
        description: String(row.description || ''),
        materialCode: row.materialCode ? String(row.materialCode) : undefined,
        commodity: String(row.commodity || ''),
        contract: row.contract ? String(row.contract) : undefined,
        purchaseGroup: row.purchaseGroup ? String(row.purchaseGroup) : undefined,
        expectedAmount: row.expectedAmount ? String(row.expectedAmount) : undefined,
        maximumAmount: row.maximumAmount ? String(row.maximumAmount) : undefined,
        serviceStartDate: row.serviceStartDate ? String(row.serviceStartDate) : undefined,
        serviceEndDate: row.serviceEndDate ? String(row.serviceEndDate) : undefined,
        quantity: row.quantity ? String(row.quantity) : undefined,
        uom: row.uom ? String(row.uom) : undefined,
        unitPrice: row.unitPrice ? String(row.unitPrice) : undefined,
        deliveryDate: row.deliveryDate ? String(row.deliveryDate) : undefined,
        deliveryTo: row.deliveryTo ? String(row.deliveryTo) : undefined,
        glAccount: row.glAccount ? String(row.glAccount) : undefined,
        costCenter: row.costCenter ? String(row.costCenter) : undefined,
        companyCode: row.companyCode ? String(row.companyCode) : undefined,
        shipToPlant: row.shipToPlant ? String(row.shipToPlant) : undefined,
        billTo: row.billTo ? String(row.billTo) : undefined,
        taxCode: row.taxCode ? String(row.taxCode) : undefined,
        currency: row.currency ? String(row.currency) : undefined,
      }));
      setData(mappedData);
    }
  }, [location.state]);

  const displayedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(data.length / itemsPerPage);

  const serviceColumns = [
    'LINE ITEM NO',
    'UNIQUE ID',
    'PURCHASE ORG',
    'VENDOR',
    'TITLE',
    'DESCRIPTION',
    'COMMODITY',
    'CONTRACT',
    'PURCHASE GROUP',
    'EXPECTED AMOUNT',
    'MAXIMUM AMOUNT',
    'SERVICE START DATE',
    'SERVICE END DATE',
    'GL ACCOUNT',
    'COST CENTER',
    'COMPANY CODE',
    'SHIP TO PLANT',
    'BILL TO',
    'TAX CODE',
  ];

  const materialColumns = [
    'LINE ITEM NO',
    'UNIQUE ID',
    'PURCHASE ORG',
    'VENDOR',
    'TITLE',
    'DESCRIPTION',
    'MATERIAL CODE',
    'COMMODITY',
    'CONTRACT',
    'PURCHASE GROUP',
    'QUANTITY',
    'UOM',
    'UNIT PRICE',
    'DELIVERY DATE',
    'DELIVERY TO',
    'GL ACCOUNT',
    'COST CENTER',
    'COMPANY CODE',
    'SHIP TO PLANT',
    'BILL TO',
    'TAX CODE',
  ];

  const columns = type === 'service' ? serviceColumns : materialColumns;

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

 const toggleSelectAll = () => {
  if (selectedRows.size === data.length) {
  
    setSelectedRows(new Set());
  } else {

    setSelectedRows(new Set(data.map(item => item.id)));
  }
};


  /* Safe date parsing helper */
  const safeDate = (dateStr: string | undefined): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
  };

  const extractCode = (str: any): string => {
    if (!str) return '';
    const s = String(str);
    return s.includes(' - ') ? s.split(' - ')[0].trim() : s.trim();
  };

  const submitItems = async (itemsToSubmit: LineItem[]) => {
    if (itemsToSubmit.length === 0) return;

    // Validation
    for (const item of itemsToSubmit) {
      if (!item.purchaseOrg || !item.vendor || !item.uniqueId || !item.title || !item.description || !item.uom || !item.costCenter) {
        toast.error(`Missing required fields in line ${item.lineNo}. Please check Purchase Org, Vendor, Unique ID, Title, Description, UOM, and Cost Center.`);
        return;
      }
      if (!item.materialCode) {
        toast.error(`Missing Material Code in line ${item.lineNo}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Group by Unique ID (PR Name)
      const groupedItems: { [key: string]: LineItem[] } = {};
      itemsToSubmit.forEach((item) => {
        const key = item.uniqueId || 'UNKNOWN_PR';
        if (!groupedItems[key]) groupedItems[key] = [];
        groupedItems[key].push(item);
      });

      if (type === 'service') {
        const payloads: ServicePRDto[] = Object.entries(groupedItems).map(([key, items]) => ({
          name: items[0].title,
          title: items[0].title,
          companyCode: items[0].companyCode || "1000",
          needBy: safeDate(items[0].serviceStartDate),
          prServiceUniqueName: key,
          lineItems: items.map((item, idx) => ({
            numberInCollection: idx + 1,
            quantity: 1,
            deliveryDate: safeDate(item.serviceStartDate),
            commodityCode: extractCode(item.commodity),
            materialCode: extractCode(item.materialCode) || extractCode(item.commodity) || '',
            description: item.description,
            amount: parseFloat(item.expectedAmount || '0') || 0,
            purchaseOrg: String(item.purchaseOrg || ''),
            purchaseGroup: item.purchaseGroup || '',
            costCenter: extractCode(item.costCenter),
            glAccount: extractCode(item.glAccount),
            expectedAmount: parseFloat(item.expectedAmount || '0') || 0,
            maxAmount: parseFloat(item.maximumAmount || '0') || 0,
            needBy: safeDate(item.serviceStartDate),
            companyCode: item.companyCode || "1000",
            isServiceChild: true,
            serviceStartDate: safeDate(item.serviceStartDate),
            serviceEndDate: safeDate(item.serviceEndDate),
            vendor: item.vendor,
            contract: extractCode(item.contract),
            taxCode: extractCode(item.taxCode),
            billTo: extractCode(item.billTo),
          }))
        }));

        const response = await createServicePR(payloads);
        if ('statusCode' in response && response.statusCode === 200) {
          toast.success("Service PR(s) Submitted Successfully!");
          navigate('/simply-pr', { state: { type: 'service' } });
        } else {
          const msg = (response as any).message || "Submission failed";
          toast.error(`Error: ${msg}`);
        }
      } else {
        // Material
        const payloads: MaterialPRDto[] = Object.entries(groupedItems).map(([key, items]) => ({
          Name: items[0].title,
          UniqueName: key,
          NeedBy: safeDate(items[0].deliveryDate),
          LineItems: items.map((item, idx) => ({
            NumberInCollection: idx + 1,
            Description: item.description,
            Quantity: parseInt(item.quantity || '0') || 0,
            UOM: item.uom || 'EA',
            Price: parseFloat(item.unitPrice || '0') || 0,
            Currency: item.currency || 'AED',
            CommodityCode: extractCode(item.commodity),
            Vendor: String(item.vendor || ''),
            Contract: extractCode(item.contract),
            PurchaseOrg: String(item.purchaseOrg || ''),
            GLAccount: extractCode(item.glAccount),
            CostCenter: extractCode(item.costCenter),
            MaterialCode: extractCode(item.materialCode),
            NeedBy: safeDate(item.deliveryDate),
          }))
        }));

        const response = await createMaterialPR(payloads);
        if (response.statusCode === 200 || response.statusCode < 300) {
          toast.success("Material PR(s) Submitted Successfully!");
          navigate('/simply-pr', { state: { type: 'material' } });
        } else {
          toast.error(`Error: ${response.message}`);
        }
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "An unknown error occurred during submission.";
      toast.error(`Submission Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSelected = () => {
    const selectedItems = data.filter((item) => selectedRows.has(item.id));
    submitItems(selectedItems);
  };

  const handleSingleSubmit = (item: LineItem) => {
    submitItems([item]);
  };
  const handleRemove = (id: string) => {
  setData(prev => prev.filter(item => item.id !== id));

  setSelectedRows(prev => {
    const newSet = new Set(prev);
    newSet.delete(id);
    return newSet;
  });
};

if (isSubmitting) {
    return (
      <div className="loader-container-user">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="bulk-upload-preview-container">
      <div className="bulk-upload-preview-header">
        <BackButton
          className="edit-material-back-button"
          iconClassName="CD-add-icon"
          onClick={() => navigate('/simply-pr', { state: { type } })}
        />
      </div>
      <div className="bulk-upload-preview-title">
        <h1>Bulk Upload</h1>
      </div>

      <div className="bulk-upload-preview-content">
        <h2 className="bulk-upload-line-items-title">Line Item(s)</h2>

        <div className="bulk-upload-table-wrapper">
          <table className="bulk-upload-table">
            <thead className="bulk-upload-table-head">
              <tr>
                <th className="bulk-upload-table-header bulk-upload-checkbox-col">
                  <input
                    type="checkbox"
                    
                    checked={selectedRows.size === data.length && data.length > 0}

                    onChange={toggleSelectAll}
                    className="bulk-upload-checkbox"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col} className="bulk-upload-table-header">
                    {col}
                  </th>
                ))}
                
                <th className="bulk-upload-table-header-action">ACTION</th>
              </tr>
            </thead>
            <tbody className="bulk-upload-table-body">
              {displayedData.map((item) => (
                <tr key={item.id} className="bulk-upload-table-row">
                  <td className="bulk-upload-table-cell bulk-upload-checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(item.id)}
                      onChange={() => toggleRowSelection(item.id)}
                      className="bulk-upload-checkbox"
                    />
                  </td>
                  <td className="bulk-upload-table-cell">{item.lineNo}</td>
                  <td className="bulk-upload-table-cell">{item.uniqueId}</td>
                  <td className="bulk-upload-table-cell">{item.purchaseOrg}</td>
                  <td className="bulk-upload-table-cell">{item.vendor}</td>
                  <td className="bulk-upload-table-cell">{item.title}</td>
                  <td className="bulk-upload-table-cell">{item.description}</td>
                  {type === 'service' && (
                    <>
                      <td className="bulk-upload-table-cell">{item.commodity}</td>
                      <td className="bulk-upload-table-cell">{item.contract || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.purchaseGroup || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.expectedAmount || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.maximumAmount || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.serviceStartDate || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.serviceEndDate || '-'}</td>
                    </>
                  )}
                  {type === 'material' && (
                    <>
                      <td className="bulk-upload-table-cell">{item.materialCode || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.commodity}</td>
                      <td className="bulk-upload-table-cell">{item.contract || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.purchaseGroup || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.quantity || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.uom || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.unitPrice || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.deliveryDate || '-'}</td>
                      <td className="bulk-upload-table-cell">{item.deliveryTo || '-'}</td>
                    </>
                  )}
                  <td className="bulk-upload-table-cell">{item.glAccount || '-'}</td>
                  <td className="bulk-upload-table-cell">{item.costCenter || '-'}</td>
                  <td className="bulk-upload-table-cell">{item.companyCode || '-'}</td>
                  <td className="bulk-upload-table-cell">{item.shipToPlant || '-'}</td>
                  <td className="bulk-upload-table-cell">{item.billTo || '-'}</td>
                  <td className="bulk-upload-table-cell">{item.taxCode || '-'}</td>

                  
                
                  <td className="bulk-upload-table-cell bulk-upload-action-cell">
                    <div className="bulk-upload-action-buttons">
                      <button
  className="bulk-upload-remove-btn"
  onClick={() => handleRemove(item.id)}
  disabled={isSubmitting}
>
  Remove
</button>
                      <button
                        className="bulk-upload-submit-row-btn"
                        onClick={() => handleSingleSubmit(item)}
                        disabled={isSubmitting}
                      >
                        Submit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bulk-upload-pagination">
          <span className="bulk-upload-pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <div className="bulk-upload-pagination-controls">
            <button
              className="bulk-upload-pagination-btn"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Preview
            </button>
            <button
              className="bulk-upload-pagination-btn"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bulk-upload-footer-actions">
          <button
            className="bulk-upload-footer-btn bulk-upload-submit-btn"
            onClick={handleSubmitSelected}
            disabled={selectedRows.size === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Requisition'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadPreview;