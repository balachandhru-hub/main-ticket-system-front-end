import { useState } from "react";

import "./AribaCompare.css";
import type { 
  AribaResponseDTO, 
  // ComparisonDTO, 
  ComparisonTableItemDTO, 
  HeaderIssueDTO,
} from "../Dto/InvoiceExtractionDto";
import type { DynamicInvoice } from "./InvoiceExtractorTable";
import { uploadUpdateAribaData } from "../api/callAxiosInvoiceExtract";
import { toast } from "react-toastify";

interface Props {
  data: AribaResponseDTO;
  setCompareModal: React.Dispatch<React.SetStateAction<boolean>>;
  invoices: DynamicInvoice[];
}

const InvoiceComparisonTable: React.FC<Props> = ({ data, setCompareModal, invoices }) => {
  const [selectedComparison] = useState(0);

  // ✅ Safe access: currentComparison can be undefined
  const currentComparison = data.comparison?.[selectedComparison];

  // Only use headerIssues if currentComparison exists
  const editableHeader: HeaderIssueDTO[] = currentComparison?.headerIssues ?? [];

  // State to store editable items (for QTY only)
  const [editableItems, setEditableItems] = useState<ComparisonTableItemDTO[]>(
    currentComparison?.comparisonTable ? JSON.parse(JSON.stringify(currentComparison.comparisonTable)) : []
  );

  const originalFieldMap: Record<string, string> = {
    "Item Code": "PO Material Code",
    "QTY": "RCT Quantity",
    "Unit": "PO Unit Of Measure (Unit of Measure)",
    "Unit Price": "Unit Price",
    "Amount": "Amount_Accepted",
    "Discount": "Discount",
    "VAT": "VAT",
    "VAT Amount": "VAT Amount",
    "Amount Incl VAT": "Amount_Accepted",
    "Description": "RCT Description",
  };

  const tableFields = ["Item Code", "QTY", "Unit", "Unit Price", "Amount", "Discount", "VAT", "VAT Amount", "Amount Incl VAT", "Description"];

  const getIssueStatus = (
    extractedValue: string | null | undefined,
    originalValue: string | null | undefined
  ): "match" | "mismatch" => {
    return extractedValue === originalValue ? "match" : "mismatch";
  };

  const handleQTYChange = (itemIdx: number, value: string) => {
    setEditableItems(prevItems => {
      if (itemIdx < 0 || itemIdx >= prevItems.length) return prevItems;
      return prevItems.map((item, idx) =>
        idx === itemIdx
          ? { ...item, extractedData: { ...item.extractedData, QTY: value } }
          : item
      );
    });
  };

  const updateAribaDatabase = async () => {
    try {
      const merged = invoices.map(item => ({
        ...item,
        details: editableItems.map((d, dIndex) => {
          const ex = d.extractedData ?? {};
          return {
            sno: dIndex + 1,
            ItemCode: ex["Item Code"] ?? ex.ItemCode ?? "UNKNOWN",
            ItemDescription: item?.details?.[0]?.["ItemDescription"] ?? "N/A",
            QTY: ex["QTY"] ?? "0",
            Unit: ex["Unit"] ?? "PCS",
            UnitPrice: ex["Unit Price"] ?? ex.UnitPrice ?? "0.00",
            Amount: ex["Amount"] ?? "0.00",
            Discount: ex["Discount"] ?? "0.00",
            VAT: ex["VAT"] ?? "0.00",
            VATAmount: ex["VAT Amount"] ?? ex.VATAmount ?? "0.00",
            AmountInclVAT: ex["Amount Incl VAT"] ?? ex.AmountInclVAT ?? "0.00",
          };
        }),
      }));

     await uploadUpdateAribaData(merged);
    } catch (err) {
      toast.error("Failed to update Ariba data.");
    }
  };

  return (
    <div className="modal-overlay-compare-view">
      <div className="modal-container-compare-view">
        {/* Modal Header */}
        <div className="modal-header-compare-view">
          <div className="header-content-compare-view">
            <div className="header-icon-compare-view">
              <svg viewBox="0 0 24 24" className="icon-compare-view">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            <div className="header-text-compare-view">
              <h2 className="title-compare-view">Invoice Comparison</h2>
              <p className="subtitle-compare-view">Compare ariba data with invoice records</p>
            </div>
          </div>
          <button className="close-button-compare-view" onClick={()=>setCompareModal(false)}>
            <svg viewBox="0 0 24 24" className="close-icon-compare-view">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content-compare-view">
          {/* Header Issues Section */}
          <div className="section-compare-view">
            <div className="section-header-compare-view">
              <h3 className="section-title-compare-view">Header Information</h3>
              <div className="section-badge-compare-view">
                {editableHeader.length > 0 ? editableHeader.filter(item => getIssueStatus(item.extractedValue, item.originalValue) === 'mismatch').length : <p>No data found.</p>} Issues
              </div>
            </div>
            
            <div className="table-container-compare-view">
              <table className="header-table-compare-view">
                <thead className="table-header-compare-view">
                  <tr>
                    <th className="th-compare-view">Field</th>
                    <th className="th-compare-view">Invoice Value</th>
                    <th className="th-compare-view">Ariba Value</th>
                    <th className="th-compare-view">Status</th>
                    <th className="th-compare-view">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {editableHeader.length > 0 ? editableHeader.map((issue, idx) => (
                    <tr key={idx} className="table-row-compare-view">
                      <td className="td-field-compare-view">{issue.field}</td>
                      <td className="td-compare-view">{issue.extractedValue ?? "N/A"}</td>
                      <td className="td-compare-view">{issue.originalValue ?? "N/A"}</td>
                      <td className="td-status-compare-view">
                        <span
                          className={`status-badge-compare-view ${
                            getIssueStatus(issue?.extractedValue, issue?.originalValue) === "match"
                              ? "status-match-compare-view"
                              : "status-mismatch-compare-view"
                          }`}
                        >
                          {getIssueStatus(issue?.extractedValue, issue?.originalValue) === "match"
                            ? "✓ Match"
                            : "✗ Mismatch"}
                        </span>
                      </td>
                      <td className="td-comment-compare-view" title={issue?.comment}>{issue?.comment}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="no-data-compare-view">No header data found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Line Items Comparison */}
          <div className="section-compare-view">
            <div className="section-header-compare-view">
              <h3 className="section-title-compare-view">Line Items Comparison</h3>
              <div className="section-badge-compare-view">
                {editableItems.length} Items
              </div>
            </div>

            {editableItems.length > 0 ? (
              <div className="tables-wrapper-compare-view">
                {/* Original Data Table */}
                <div className="table-section-compare-view">
                  <div className="table-section-header-compare-view original-header-compare-view">
                    <h4 className="table-title-compare-view">Invoice Data</h4>
                    <div className="table-icon-compare-view">
                      <svg viewBox="0 0 24 24" className="icon-small-compare-view">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="table-container-compare-view">
                    <table className="data-table-compare-view">
                      <thead className="table-header-original-compare-view">
                        <tr>
                          <th className="th-item-compare-view">Item</th>
                          {tableFields.map(field => (
                            <th key={field} className="th-field-compare-view">{field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editableItems.map((item, idx) => (
                          <tr key={idx} className="data-row-compare-view">
                            <td className="td-item-compare-view" title={item.itemDescription}>
                              <div className="item-name-compare-view">{item.itemDescription}</div>
                            </td>
                            {tableFields.map(field => {
                              const isMatch = getIssueStatus(
                                item.extractedData[field],
                                item.originalData[originalFieldMap[field] || field]
                              ) === "match";
                              
                              return (
                                <td 
                                  key={field} 
                                  className={`td-data-compare-view ${isMatch ? "cell-match-compare-view" : "cell-mismatch-compare-view"}`}
                                >
                                  <div className="cell-content-compare-view">
                                    {item.originalData[originalFieldMap[field] || field] ?? "N/A"}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Extracted Data Table */}
                <div className="table-section-compare-view">
                  <div className="table-section-header-compare-view extracted-header-compare-view">
                    <h4 className="table-title-compare-view">Ariba Data</h4>
                    <div className="table-icon-compare-view">
                      <svg viewBox="0 0 24 24" className="icon-small-compare-view">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="table-container-compare-view">
                    <table className="data-table-compare-view">
                      <thead className="table-header-extracted-compare-view">
                        <tr>
                          <th className="th-item-compare-view">Item</th>
                          {tableFields.map(field => (
                            <th key={field} className="th-field-compare-view">{field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editableItems.map((item, idx) => (
                          <tr key={idx} className="data-row-compare-view">
                            <td className="td-item-compare-view" title={item.itemDescription}>
                              <div className="item-name-compare-view">{item.itemDescription}</div>
                            </td>
                            {tableFields.map(field => {
                              const isMatch = getIssueStatus(
                                item.extractedData[field],
                                item.originalData[originalFieldMap[field] || field]
                              ) === "match";
                              
                              return (
                                <td 
                                  key={field} 
                                  className={`td-data-compare-view ${isMatch ? "cell-match-compare-view" : "cell-mismatch-compare-view"}`}
                                >
                                  <div className="cell-content-compare-view">
                                    {field === "QTY" ? (
                                      <input
                                        type="number"
                                        value={item.extractedData[field] ?? ""}
                                        onChange={(e) => handleQTYChange(idx, e.target.value)}
                                        className={`input-editable-compare-view ${isMatch ? "input-match-compare-view" : "input-mismatch-compare-view"}`}
                                      />
                                    ) : (
                                      item.extractedData[field] ?? "N/A"
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data-section-compare-view">
                <div className="no-data-icon-compare-view">
                  <svg viewBox="0 0 24 24" className="icon-large-compare-view">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="no-data-text-compare-view">No line items found</p>
              </div>
            )}
          </div>

          {/* Issues Summary */}
          {editableItems.some(item => item.issues && item.issues.length > 0) && (
            <div className="section-compare-view">
              <div className="section-header-compare-view">
                <h3 className="section-title-compare-view">Issues Summary</h3>
                <div className="section-badge-compare-view warning-badge-compare-view">
                  Attention Required
                </div>
              </div>
              
              <div className="issues-container-compare-view">
                {editableItems.map((item, idx) => 
                  item.issues && item.issues.length > 0 ? (
                    <div key={idx} className="issue-item-compare-view">
                      <div className="issue-header-compare-view">
                        <h5 className="issue-title-compare-view">{item.itemDescription}</h5>
                        <span className="issue-count-compare-view">{item.issues.length} issue(s)</span>
                      </div>
                      <div className="issue-details-compare-view">
                        {item.issues.map((issue, iIdx) => (
                          <div key={iIdx} className="issue-detail-compare-view">
                            <div className="issue-badge-compare-view">{issue.field}</div>
                            <div className="issue-content-compare-view">
                              <strong className="issue-type-compare-view">{issue.issue}</strong>
                              <p className="issue-comment-compare-view">{issue.comment}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-compare-view">
          <div className="footer-actions-compare-view">
            <button className="button-secondary-compare-view" onClick={()=>setCompareModal(false)}>
              <svg viewBox="0 0 24 24" className="button-icon-compare-view">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              Reject
            </button>
            <button className="button-primary-compare-view" onClick={(e)=>{
              e.stopPropagation();
              updateAribaDatabase()
            }}>
              <svg viewBox="0 0 24 24" className="button-icon-compare-view" >
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
              </svg>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceComparisonTable;
