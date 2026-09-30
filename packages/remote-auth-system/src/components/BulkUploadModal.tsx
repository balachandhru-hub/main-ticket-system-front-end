import React, { useState } from 'react';
import './BulkUpload.css';
import { useNavigate } from 'react-router-dom';
import * as XLSX from "xlsx";
import BulkUploadSummary from './BulkUploadSummary';
import { uploadBulkExcel, uploadBulkExcelForService } from '../api/smPrMaterialApi';
import { toast } from 'react-toastify';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'service' | 'material';
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, type }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [flag, setFlag] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleBack = () => {
    setFlag(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setLoading(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);

          if (jsonData.length === 0) {
            toast.error('The uploaded file is empty.');
            setLoading(false);
            return;
          }

          const headerData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (headerData.length > 0) {
            const headers = (headerData[0] as string[]).map(h => String(h).trim());

            let requiredFieldChecks: { key: string; oneOf: string[] }[] = [];

            if (type === 'service') {
              requiredFieldChecks = [
                { key: 'PRServiceUniqueName', oneOf: ['PRServiceUniqueName', 'PR Service Unique Name', 'PR SERVICE UNIQUE NAME'] },
                { key: 'ServiceStartDate', oneOf: ['ServiceStartDate', 'Service Start Date', 'SERVICE START DATE'] },
                { key: 'ServiceEndDate', oneOf: ['ServiceEndDate', 'Service End Date', 'SERVICE END DATE'] },
                { key: 'MaterialCode', oneOf: ['MaterialCode', 'Material Code', 'MATERIAL CODE'] },
                { key: 'Cost Center', oneOf: ['COST CENTER', 'CostCenter', 'Cost Center'] },
                { key: 'Company Code', oneOf: ['COMPANY CODE', 'CompanyCode', 'Company Code'] },
              ];
            } else {
              // Material checks
              requiredFieldChecks = [
                { key: 'Cost Center', oneOf: ['COST CENTER', 'CostCenter', 'Cost Center'] },
                { key: 'Company Code', oneOf: ['COMPANY CODE', 'CompanyCode', 'Company Code'] },
                { key: 'Material Code', oneOf: ['MATERIAL CODE', 'MaterialCode', 'Material Code'] },
                { key: 'PRUniqueName', oneOf: ['PRUniqueName', 'PR-UniqueName', 'PR Unique Name'] },
              ];
            }

            const missingCols = requiredFieldChecks
              .filter(field => !field.oneOf.some(col => headers.includes(col)))
              .map(field => field.key);

            if (missingCols.length > 0) {
              toast.error(`Missing required column headers: ${missingCols.join(', ')}. Please check your file template.`);
              setLoading(false);
              return;
            }
          }

          if (jsonData.length > 1000) {
            toast.error("Error: The file contains more than 1000 rows. Please upload a smaller file.");
            setLoading(false);
            return;
          }

          const formatExcelDate = (val: any) => {
            if (!val) return '';
            const num = Number(val);
            if (!isNaN(num) && num > 35000 && num < 60000) {
              const date = new Date((num - 25569) * 86400 * 1000);
              const y = date.getUTCFullYear();
              const m = String(date.getUTCMonth() + 1).padStart(2, '0');
              const d = String(date.getUTCDate()).padStart(2, '0');
              return `${y}-${m}-${d}`;
            }
            return val;
          };

          const rows = jsonData.map((row: any, index: number) => {
            const tempPrNumber = `TEMP_${Date.now()}_${index}`;

            if (type === 'service') {
              const getVal = (r: any, keys: string[]) => {
                for (const k of keys) {
                  if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
                }
                return undefined;
              };

              return {
                prNumber: tempPrNumber,
                lineItems: [{
                  id: `${tempPrNumber}-1`,
                  lineNo: getVal(row, ['LineItemNumber', 'LINE ITEM NO', 'Line Item No']) || (index + 1),
                  uniqueId: getVal(row, ['PRServiceUniqueName', 'PR SERVICE UNIQUE NAME', 'PR Service Unique Name']) || `UI-${index}`,
                  purchaseOrg: getVal(row, ['PurchaseOrg', 'PURCHASE ORG', 'Purchase Org']),
                  vendor: getVal(row, ['Vendor', 'VENDOR']),
                  title: getVal(row, ['Title', 'TITLE']),
                  description: getVal(row, ['Description', 'DESCRIPTION']),
                  materialCode: getVal(row, ['MaterialCode', 'MATERIAL CODE', 'Material Code']),
                  commodity: getVal(row, ['Commodity', 'COMMODITY']),
                  contract: getVal(row, ['Contract', 'CONTRACT']),
                  purchaseGroup: getVal(row, ['PurchaseGroup', 'PURCHASE GROUP', 'Purchase Group']),
                  expectedAmount: getVal(row, ['ExpectedAmount', 'EXPECTED AMOUNT', 'Expected Amount']) || getVal(row, ['Amount', 'AMOUNT']),
                  maximumAmount: getVal(row, ['MaxAmount', 'MAXIMUM AMOUNT', 'Max Amount']) || getVal(row, ['ExpectedAmount', 'EXPECTED AMOUNT', 'Expected Amount']) || getVal(row, ['Amount', 'AMOUNT']),
                  amount: getVal(row, ['Amount', 'AMOUNT']) || getVal(row, ['ExpectedAmount', 'EXPECTED AMOUNT', 'Expected Amount']),
                  serviceStartDate: formatExcelDate(getVal(row, ['ServiceStartDate', 'SERVICE START DATE', 'Service Start Date'])),
                  serviceEndDate: formatExcelDate(getVal(row, ['ServiceEndDate', 'SERVICE END DATE', 'Service End Date'])),
                  glAccount: getVal(row, ['GLAccount', 'GL ACCOUNT', 'GL Account']),
                  costCenter: getVal(row, ['CostCenter', 'COST CENTER', 'Cost Center']),
                  companyCode: getVal(row, ['CompanyCode', 'COMPANY CODE', 'Company Code']),
                  shipToPlant: getVal(row, ['ShipToPlant', 'SHIP TO PLANT', 'Ship To Plant']),
                  billTo: getVal(row, ['BillTo', 'BILL TO', 'Bill To']),
                  taxCode: getVal(row, ['TaxCode', 'TAX CODE', 'Tax Code']),
                  deliveryTo: getVal(row, ['DeliverTo', 'DELIVER TO', 'Deliver To']),
                  uom: getVal(row, ['UOM', 'uom']),
                  currency: getVal(row, ['Currency', 'CURRENCY']),
                  // needBy: getVal(row, ['NeedBy', 'NEED BY', 'Need By']), // Removed as per user request
                  _raw: row
                }]
              };
            } else {
              return {
                prNumber: tempPrNumber,
                lineItems: [{
                  id: `${tempPrNumber}-1`,
                  lineNo: row['LineItemNumber'] || (index + 1),
                  uniqueId: row['PRUniqueName'] || `UI-${index}`,
                  purchaseOrg: row['PurchaseOrg'],
                  vendor: row['Vendor'],
                  title: row['Title'],
                  description: row['Description'],
                  materialCode: row['MaterialCode'],
                  commodity: row['Commodity'],
                  contract: row['Contract'],
                  purchaseGroup: row['PurchaseGroup'],
                  quantity: row['Quantity'],
                  uom: row['UOM'],
                  unitPrice: row['Amount'],
                  deliveryTo: row['DeliverTo'],
                  glAccount: row['GLAccount'] || row['GL ACCOUNT'],
                  costCenter: row['CostCenter'] || row['COST CENTER'],
                  companyCode: row['CompanyCode'] || row['COMPANY CODE'],
                  shipToPlant: row['ShipToPlant'],
                  billTo: row['BillTo'],
                  taxCode: row['TaxCode'],
                  deliveryDate: row['DeliveryDate'],
                  needBy: row['NeedBy'],
                  currency: row['Currency'] || row['CURRENCY'] || row['currency'],
                  _raw: row
                }]
              };
            }
          });
          const flatRows = rows.flatMap((prItem: any) => prItem.lineItems);

          const missingDetails: string[] = [];
          flatRows.forEach((row: any, index: number) => {
            const missingFields = [];
            if (!row.companyCode) missingFields.push('Company Code');
            if (!row.costCenter) missingFields.push('Cost Center');
            if (type === 'material' && !row.materialCode) missingFields.push('Material Code');

            if (missingFields.length > 0) {
              const identifier = type === 'material' && row.materialCode
                ? `Material Code ${row.materialCode}`
                : `Row ${index + 1}`;
              missingDetails.push(`${identifier} is missing: ${missingFields.join(', ')}`);
            }
          });

          if (missingDetails.length > 0) {
            const message = missingDetails.length > 5
              ? `Missing Data:\n${missingDetails.slice(0, 5).join('\n')}\n...and ${missingDetails.length - 5} more.`
              : `Missing Data:\n${missingDetails.join('\n')}`;

            toast.warn(message, { autoClose: 10000, style: { whiteSpace: 'pre-line' } });
          }

          setData(flatRows);
          setFlag(true);
          setLoading(false);

        } catch (parseError) {
          toast.error("Failed to process Excel file.");
          setLoading(false);
        }
      };

      reader.readAsBinaryString(file);
    }
  };
  const handleStart = async () => {
    if (!selectedFile) return;
    try {
      let response;
      if (type === 'service') {
        response = await uploadBulkExcelForService(selectedFile);
      } else {
        response = await uploadBulkExcel(selectedFile);
      }

      if ("totalRows" in response && response.totalRows > 1000) {
        toast.error("Error: The file contains more than 1000 rows. Please upload a smaller file.");
        setLoading(false);
        return;
      }
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
    } catch (error) {
      toast.error("Failed to process Excel file.");
      setLoading(false);
    }
  };

  const handleChooseClick = () => {
    document.getElementById('file-input')?.click();
  };

  return (
    <div className="bulk-upload-overlay" onClick={onClose}>
      <div
        className="bulk-upload-modal"
        onClick={(e) => e.stopPropagation()}
        style={flag ? { maxWidth: '90vw', width: '90%' } : {}}
      >
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          {flag && <h2 className="bulk-upload-title" >Bulk Upload Preview</h2>}
          <button
            className="bulk-upload-close-btn"
            onClick={flag ? handleBack : onClose}
            
          >
            ×
          </button>
        </div>

        {!flag ? (
          <>
            <div className="bulk-upload-icon-container">
              <div className="bulk-upload-excel-icon">
                <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                  <rect width="64" height="64" rx="12" fill="#217346" />
                  <path d="M16 12h32v40H16z" fill="#185C37" />
                  <text x="32" y="48" fill="white" fontSize="32" fontWeight="bold" textAnchor="middle">X</text>
                </svg>
              </div>
            </div>

            <h2 className="bulk-upload-title">Import from Excel</h2>
            <p className="bulk-upload-subtitle">
              Upload multiple {type === 'service' ? 'service' : 'material'} lines in seconds
            </p>

            <div className="bulk-upload-buttons">
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                className="bulk-upload-choose-btn"
                onClick={handleChooseClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {selectedFile ? selectedFile.name : 'Choose Excel File'}
              </button>
              <button
                className="bulk-upload-start-btn"
                onClick={handleStart}
                disabled={!selectedFile || loading}
              >
                {loading ? "Uploading..." : "Start"}
              </button>
            </div>

            <p className="bulk-upload-info">
              Supports bulk upload • Auto-validation • Template available
            </p>
          </>
        ) : (
          <BulkUploadSummary data={data} setData={setData} type={type} onClose={onClose} />
        )}
      </div>
    </div>
  );
};

export default BulkUploadModal;