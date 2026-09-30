import React, { useState, useMemo } from "react";
import "./InvoiceComparisonModal.css";
import type { AribaResponseDTO, LineItemComparisonDTO } from "../Dto/InvoiceExtractionDto";
import { FaEdit, FaTimes, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import { saveDraftReviewData, getInvoiceDataFromPdfId, type SaveDraftPayload } from "../api/callAxiosInvoiceExtract";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: AribaResponseDTO;
  poNumber: string;
  invoiceNumber?: string;
  pdfId: string | null;
  onAfterSave?: (updatedData: any) => void;
}

interface EditableDataState {
  poNumber: string;
  invoiceNumber: string;
  total: string;
  items: Record<number, {
    itemCode: string;
    itemDescription: string;
    qty: string;
    unit: string;
    line_item?: string;
  }>;
}

interface ReviewData {
  poNumber: string;
  invoiceNumber: string;
  total: string;
  lineItems: {
    lineItemIndex: number;
    itemCode: string;
    itemDescription: string;
    qty: string;
    unit: string;
  }[];
}

type FilterStatus = "all" | "matched" | "mismatched";

const InvoiceComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  poNumber,
  invoiceNumber = '',
  pdfId,
  onAfterSave,
}) => {
  const [editableData, setEditableData] = useState<EditableDataState>({
    poNumber: '',
    invoiceNumber: invoiceNumber,
    total: '',
    items: {},
  });

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [isSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  if (!isOpen) return null;

  const poComparison = data.po_number_comparison;
  const totalComparison = data.total_comparison;
  const allLineItems: LineItemComparisonDTO[] = data.Comparision_of_lineItems || [];


  const displayValue = (value: any) =>
    value === null || value === undefined ? "—" : value;

  const getStatusBadge = (status: string) => {
    const isMatched = status === "matched";
    const statusClass = isMatched ? "icm-status-matched" : "icm-status-mismatched";
    const StatusIcon = isMatched ? FaCheck : FaExclamationTriangle;
    const statusText = isMatched ? "Matched" : "Mismatched";

    return (
      <span className={`icm-status-badge ${statusClass}`}>
        <span className="icm-status-icon">
          <StatusIcon />
        </span>
        {statusText}
      </span>
    );
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(event.target.value as FilterStatus);
  };

  const shouldShowHeaderRow = (status: string) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "matched") return status === "matched";
    if (filterStatus === "mismatched") return status !== "matched";
    return false;
  };

  const filteredLineItems = useMemo(() => {
    return allLineItems;
  }, [allLineItems]);

  const handleCopyAribaRCT = () => {
    const newEditableData: EditableDataState = {
      poNumber: String(poComparison?.receipt_po_number || ''),
      invoiceNumber: editableData.invoiceNumber || invoiceNumber || '',
      total: String(totalComparison?.receipt_total || ''),
      items: {}
    };

    allLineItems.forEach((item, idx) => {
      newEditableData.items[idx] = {
        itemCode: String(item.receipt_item?.line_item || ''),
        itemDescription: String(item.receipt_item?.description || ''),
        qty: String(item.receipt_item?.quantity || ''),
        unit: String(item.receipt_item?.unit_of_measure || '')
      };
    });

    setEditableData(newEditableData);
    toast.success("Ariba RCT Data copied successfully!");
  };

  const handleCopyAribaRef = () => {
    const newEditableData: EditableDataState = {
      poNumber: String(data.ariba_reference_data?.ariba_po_number || ''),
      invoiceNumber: editableData.invoiceNumber || invoiceNumber || '',
      total: String(data.ariba_reference_data?.ariba_total || ''),
      items: {}
    };

    allLineItems.forEach((item, idx) => {
      const refItem = data.ariba_reference_data?.ariba_line_items?.find(
        (ri) => String(ri.line_item) === String(item.line_item_comparison_number)
      );

      newEditableData.items[idx] = {
        itemCode: String(refItem?.line_item || ''),
        itemDescription: String(refItem?.description || ''),
        qty: String(refItem?.quantity || ''),
        unit: String(refItem?.unit_of_measure || '')
      };
    });

    setEditableData(newEditableData);
    toast.success("Ariba Reference Data copied successfully!");
  };

  const handleCopyInvoice = () => {
    const newEditableData: EditableDataState = {
      poNumber: String(poComparison?.invoice_po_number || ''),
      invoiceNumber: editableData.invoiceNumber || invoiceNumber || '',
      total: String(totalComparison?.invoice_total || ''),
      items: {}
    };

    allLineItems.forEach((item, idx) => {
      newEditableData.items[idx] = {
        itemCode: String(item.invoice_item?.ItemCode || ''),
        itemDescription: String(item.invoice_item?.ItemDescription || ''),
        qty: String(item.invoice_item?.QTY || ''),
        unit: String(item.invoice_item?.Unit || '')
      };
    });

    setEditableData(newEditableData);
    toast.success("Invoice Data copied successfully!");
  };

  const handleItemFieldChange = (itemIndex: number, field: string, value: string) => {
    setEditableData((prev: EditableDataState) => ({
      ...prev,
      items: {
        ...prev.items,
        [itemIndex]: {
          ...(prev.items[itemIndex] || { itemCode: '', itemDescription: '', qty: '', unit: '' }),
          [field]: value
        }
      }
    }));
  };

  const handleHeaderFieldChange = (field: keyof Omit<EditableDataState, 'items'>, value: string) => {
    setEditableData((prev: EditableDataState) => ({
      ...prev,
      [field]: value
    }));
  };

  const CopyButton = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button className="icm-copy-button" onClick={onClick}>
      <span className="icm-copy-icon">
        <LuCopy />
      </span>
      {label}
    </button>
  );

  const hasDataToPush = () => {
    const hasHeaderData = editableData.poNumber || editableData.invoiceNumber || editableData.total;
    const hasLineItemData = Object.keys(editableData.items).length > 0 &&
      Object.values(editableData.items).some(item =>
        item.itemCode || item.itemDescription || item.qty || item.unit
      );
    return hasHeaderData || hasLineItemData;
  };

  const handleSaveDraft = async () => {
    if (!hasDataToPush()) {
      toast.warning("Nothing to save. Please enter data in the 'Data to be Pushed into Ariba' column before saving as draft.");
      return;
    }

    // Build line items with proper typing
    const lineItemsForDraft = allLineItems
      .map((item, idx) => {
        const itemData = editableData.items[idx];

        if (!itemData || (!itemData.itemCode && !itemData.itemDescription && !itemData.qty && !itemData.unit)) {
          return null;
        }

        return {
          Line_item: String(item.line_item_comparison_number),
          Item_description: itemData.itemDescription || '',
          QTY: itemData.qty || '',
          Unit: itemData.unit || '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const guaranteedPoNumber = editableData.poNumber ||
      poComparison?.ariba_po_number ||
      poNumber ||
      '';
    if (!guaranteedPoNumber) {
      toast.error("PO Number is required but missing. Please contact support.");
      return;
    }

    const payload: SaveDraftPayload = {
      pdfId: pdfId ? String(pdfId) : 'N/A',
      poNumber: String(poNumber),
      Invoice_Number: editableData.invoiceNumber || '',
      total: editableData.total || '',
      items: lineItemsForDraft,
    };

    try {
      toast.loading("Saving data to draft...", { toastId: 'draft-save' });

      const response = await saveDraftReviewData(payload);

      toast.dismiss('draft-save');

      if (response && 'statusCode' in response && response.statusCode >= 400) {
        toast.error(`${response.message}${response.description ? `: ${response.description}` : ''}`, {
          autoClose: 5000
        });
      } else {
        toast.success("Data saved in Draft successfully!", { autoClose: 3000 });
        if (pdfId && onAfterSave) {
          try {
            const updatedData = await getInvoiceDataFromPdfId(pdfId);
            onAfterSave(updatedData);
          } catch (e) {
          }
        }

        onClose();
      }
    } catch (error) {
      toast.dismiss('draft-save');
      toast.error("An unexpected network error occurred while saving the draft.", { autoClose: 5000 });
    }
  };

  const handleReview = () => {
    if (!hasDataToPush()) {
      toast.warning("Please fill in data to be pushed before reviewing.");
      return;
    }

    const finalLineItems: ReviewData['lineItems'] = allLineItems
      .map((item, idx) => {
        const itemData = editableData.items[idx];

        if (!itemData || (!itemData.itemCode && !itemData.itemDescription && !itemData.qty && !itemData.unit)) {
          return null;
        }

        return {
          lineItemIndex: item.line_item_comparison_number,
          itemCode: itemData.itemCode || '',
          itemDescription: itemData.itemDescription || '',
          qty: itemData.qty || '',
          unit: itemData.unit || '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // ✅ Use guaranteed PO number for review
    const guaranteedPoNumber = editableData.poNumber ||
      poComparison?.ariba_po_number ||
      poNumber ||
      '';

    const reviewPayload: ReviewData = {
      poNumber: guaranteedPoNumber,
      invoiceNumber: editableData.invoiceNumber,
      total: editableData.total,
      lineItems: finalLineItems,
    };
    setIsReviewing(true);
    setReviewData(reviewPayload);
    toast.info("Review mode activated. Please verify the data before submitting.");
  };

  const handleBackToComparison = () => {
    setIsReviewing(false);
    setReviewData(null);
    toast.info("Returned to Comparison view. You can edit the data.");
  };

  const renderReviewTable = () => (
    <div className="icm-review-section">
      <h3>Reviewed Data to be Pushed to Ariba</h3>

      <table className="icm-review-table icm-comparison-table">
        <thead>
          <tr>
            <th className="icm-field-column">Field</th>
            <th className="icm-data-column">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="icm-field-name">PO Number</td>
            <td>{displayValue(reviewData?.poNumber)}</td>
          </tr>
          <tr>
            <td className="icm-field-name">Invoice Number</td>
            <td>{displayValue(reviewData?.invoiceNumber)}</td>
          </tr>
          <tr>
            <td className="icm-field-name">Total</td>
            <td>{displayValue(reviewData?.total)}</td>
          </tr>
        </tbody>
      </table>

      {reviewData?.lineItems && reviewData.lineItems.length > 0 ? (
        <>
          <h4>Line Items</h4>
          <table className="icm-review-table icm-comparison-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Item Code</th>
                <th>Description</th>
                <th>QTY</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {reviewData.lineItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.lineItemIndex}</td>
                  <td>{displayValue(item.itemCode)}</td>
                  <td>{displayValue(item.itemDescription)}</td>
                  <td>{displayValue(item.qty)}</td>
                  <td>{displayValue(item.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="icm-no-data-message">
          No data was entered in the "Data to be Pushed into Ariba" column.
          Please go back and fill the fields.
        </p>
      )}
    </div>
  );

  return (
    <div className="icm-modal-overlay">
      <div className="icm-modal-container">
        <div className="icm-modal-header">
          <h2 className="icm-modal-title">
            {isReviewing ? "Review Data" : "Data Comparison"}
          </h2>
          <button onClick={onClose} className="icm-close-button" aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        {!isReviewing && (
          <div className="icm-action-buttons">
            <div className="icm-dropdown-wrapper">
              <select
                className="icm-dropdown"
                value={filterStatus}
                onChange={handleFilterChange}
                aria-label="Filter status"
              >
                <option value="all">Show All</option>
                <option value="matched">Show Matched</option>
                <option value="mismatched">Show Mismatched</option>
              </select>
            </div>

            <div className="icm-buttons-wrapper">
              <CopyButton
                label="Copy Ariba PO Data"
                onClick={handleCopyAribaRef}
              />
              <CopyButton
                label="Copy Ariba RCT Data"
                onClick={handleCopyAribaRCT}
              />
              <CopyButton
                label="Copy Invoice Data"
                onClick={handleCopyInvoice}
              />
              <button className="icm-edit-button" aria-label="Edit mode">
                <FaEdit className="icm-edit-icon" />
                Edit
              </button>
            </div>
          </div>
        )}

        <div className="icm-modal-content">
          {isReviewing ? (
            renderReviewTable()
          ) : (
            <>
              <div className="icm-comparison-section">
                <table className="icm-comparison-table">
                  <thead>
                    <tr>
                      <th className="icm-field-column">Field</th>
                      <th className="icm-data-column">Ariba PO Data</th>
                      <th className="icm-data-column">Ariba RCT Data</th>
                      <th className="icm-data-column">Invoice Extracted Data</th>
                      <th className="icm-status-column">Status</th>
                      <th className="icm-comments-column">Comments</th>
                      <th className="icm-data-column">Data to be Pushed into Ariba</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poComparison && shouldShowHeaderRow(poComparison.status) && (
                      <tr>
                        <td className="icm-field-name">PO Number</td>
                        <td>{displayValue(data.ariba_reference_data?.ariba_po_number)}</td>
                        <td>{displayValue(poComparison.receipt_po_number)}</td>
                        <td>{displayValue(poComparison.invoice_po_number)}</td>
                        <td>{getStatusBadge(poComparison.status)}</td>
                        <td>{displayValue(poComparison.error_comment)}</td>
                        <td>
                          <input
                            type="text"
                            value={editableData.poNumber || poComparison?.ariba_po_number || ''}
                            onChange={(e) => handleHeaderFieldChange('poNumber', e.target.value)}
                            className="icm-editable-input"
                            placeholder=""
                            aria-label="PO Number input"
                            disabled={true}
                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                          />
                        </td>
                      </tr>
                    )}

                    {shouldShowHeaderRow("matched") && (
                      <tr>
                        <td className="icm-field-name">Invoice Number</td>
                        <td>—</td>
                        <td>—</td>
                        <td>{displayValue(invoiceNumber)}</td>
                        <td>—</td>
                        <td>—</td>
                        <td>
                          <input
                            type="text"
                            value={editableData.invoiceNumber}
                            onChange={(e) => handleHeaderFieldChange('invoiceNumber', e.target.value)}
                            className="icm-editable-input"
                            placeholder=""
                            aria-label="Invoice Number input"
                          />
                        </td>
                      </tr>
                    )}

                    {totalComparison && shouldShowHeaderRow(totalComparison.status) && (
                      <tr>
                        <td className="icm-field-name">Total</td>
                        <td>{displayValue(data.ariba_reference_data?.ariba_total)}</td>
                        <td>{displayValue(totalComparison.receipt_total)}</td>
                        <td>{displayValue(totalComparison.invoice_total)}</td>
                        <td>{getStatusBadge(totalComparison.status)}</td>
                        <td>{displayValue(totalComparison.error_comment)}</td>
                        <td>
                          <input
                            type="text"
                            value={editableData.total}
                            onChange={(e) => handleHeaderFieldChange('total', e.target.value)}
                            className="icm-editable-input"
                            placeholder=""
                            aria-label="Total input"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(() => {
                const shouldShowRow = (status: string) => {
                  if (filterStatus === "all") return true;
                  if (filterStatus === "matched") return status === "matched";
                  if (filterStatus === "mismatched") return status !== "matched";
                  return false;
                };

                let hasAnyVisibleContent = false;
                const itemsContent = filteredLineItems?.map((item, idx) => {
                  const itemCodeStatus = item?.comparison?.ItemCode_vs_line_item || "unmatched";
                  const itemDescStatus = item?.comparison?.ItemDescription_vs_description || "unmatched";
                  const qtyStatus = item?.comparison?.QTY_vs_quantity || "unmatched";
                  const unitStatus = item?.comparison?.Unit_vs_unit_of_measure || "unmatched";
                  const hasVisibleRows =
                    shouldShowRow(itemCodeStatus) ||
                    shouldShowRow(itemDescStatus) ||
                    shouldShowRow(qtyStatus) ||
                    shouldShowRow(unitStatus);
                  if (!hasVisibleRows) return null;

                  hasAnyVisibleContent = true;

                  return (
                    <div key={idx} className="icm-item-section">
                      <div className="icm-item-header">
                        <h3>Item {item.line_item_comparison_number}</h3>
                      </div>

                      <table className="icm-comparison-table">
                        <thead>
                          <tr>
                            <th className="icm-field-column">Field</th>
                            <th className="icm-data-column">Ariba PO Data</th>
                            <th className="icm-data-column">Ariba RCT Data</th>
                            <th className="icm-data-column">Invoice Extracted Data</th>
                            <th className="icm-status-column">Status</th>
                            <th className="icm-comments-column">Comments</th>
                            <th className="icm-data-column">Data to be Pushed into Ariba</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const refLineItem = data.ariba_reference_data?.ariba_line_items?.find(
                              (ri) => String(ri.line_item) === String(item.line_item_comparison_number)
                            );

                            return (
                              <>
                                {shouldShowRow(itemCodeStatus) && (
                                  <tr>
                                    <td className="icm-field-name">Line item</td>
                                    <td>{displayValue(refLineItem?.line_item)}</td>
                                    <td>{displayValue(item.receipt_item?.line_item)}</td>
                                    <td>{displayValue(item.invoice_item?.ItemCode)}</td>
                                    <td>{getStatusBadge(itemCodeStatus)}</td>
                                    <td>
                                      {displayValue(
                                        item.comparison?.error_comments?.ItemCode_vs_line_item
                                      )}
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={editableData.items[idx]?.itemCode || ''}
                                        onChange={(e) => handleItemFieldChange(idx, 'itemCode', e.target.value)}
                                        className="icm-editable-input"
                                        aria-label={`Item ${item.line_item_comparison_number} code input`}
                                      />
                                    </td>
                                  </tr>
                                )}
                                {shouldShowRow(itemDescStatus) && (
                                  <tr>
                                    <td className="icm-field-name">Item Description</td>
                                    <td>{displayValue(refLineItem?.description)}</td>
                                    <td>{displayValue(item.receipt_item?.description)}</td>
                                    <td>{displayValue(item.invoice_item?.ItemDescription)}</td>
                                    <td>{getStatusBadge(itemDescStatus)}</td>
                                    <td>
                                      {displayValue(
                                        item.comparison?.error_comments?.ItemDescription_vs_description
                                      )}
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={editableData.items[idx]?.itemDescription || ''}
                                        onChange={(e) => handleItemFieldChange(idx, 'itemDescription', e.target.value)}
                                        className="icm-editable-input"
                                        placeholder=""
                                        aria-label={`Item ${item.line_item_comparison_number} description input`}
                                      />
                                    </td>
                                  </tr>
                                )}
                                {shouldShowRow(qtyStatus) && (
                                  <tr>
                                    <td className="icm-field-name">QTY</td>
                                    <td>{displayValue(refLineItem?.quantity)}</td>
                                    <td>{displayValue(item.receipt_item?.quantity)}</td>
                                    <td>{displayValue(item.invoice_item?.QTY)}</td>
                                    <td>{getStatusBadge(qtyStatus)}</td>
                                    <td>
                                      {displayValue(
                                        item.comparison?.error_comments?.QTY_vs_quantity
                                      )}
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={editableData.items[idx]?.qty || ''}
                                        onChange={(e) => handleItemFieldChange(idx, 'qty', e.target.value)}
                                        className="icm-editable-input"
                                        placeholder=""
                                        aria-label={`Item ${item.line_item_comparison_number} quantity input`}
                                      />
                                    </td>
                                  </tr>
                                )}
                                {shouldShowRow(unitStatus) && (
                                  <tr>
                                    <td className="icm-field-name">Unit</td>
                                    <td>{displayValue(refLineItem?.unit_of_measure)}</td>
                                    <td>{displayValue(item.receipt_item?.unit_of_measure)}</td>
                                    <td>{displayValue(item.invoice_item?.Unit)}</td>
                                    <td>{getStatusBadge(unitStatus)}</td>
                                    <td>
                                      {displayValue(
                                        item.comparison?.error_comments?.Unit_vs_unit_of_measure
                                      )}
                                    </td>
                                    <td>
                                      <input
                                        type="text"
                                        value={editableData.items[idx]?.unit || ''}
                                        onChange={(e) => handleItemFieldChange(idx, 'unit', e.target.value)}
                                        className="icm-editable-input"
                                        placeholder=""
                                        aria-label={`Item ${item.line_item_comparison_number} unit input`}
                                      />
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  );
                });

                if (!hasAnyVisibleContent && allLineItems.length > 0) {
                  return (
                    <p className="icm-no-data-message">
                      No line item fields found for the <strong>{filterStatus}</strong> filter status.
                    </p>
                  );
                }

                return itemsContent;
              })()}
            </>
          )}
        </div>

        <div className="icm-modal-footer">
          {isReviewing ? (
            <>
              <button
                className="icm-footer-button icm-footer-button-secondary"
                onClick={handleBackToComparison}
                disabled={isSubmitting}
              >
                Back to Edit
              </button>
              <button
                className="icm-footer-button icm-footer-button-primary"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </>
          ) : (
            <>
              <button
                className="icm-footer-button icm-footer-button-secondary"
                onClick={handleSaveDraft}
              >
                Save as Draft
              </button>
              <button
                className="icm-footer-button icm-footer-button-primary"
                onClick={handleReview}
              >
                Review
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceComparisonModal;