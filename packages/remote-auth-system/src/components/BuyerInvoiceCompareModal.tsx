import React, { useState, useMemo, useEffect } from "react";
import "./BuyerInvoiceCompareModal.css";
import type { AribaResponseDTO, LineItemComparisonDTO } from "../Dto/InvoiceExtractionDto";
import { FaEdit, FaTimes, FaCheck, FaExclamationTriangle, FaEye, FaEyeSlash, FaComment, FaSync } from "react-icons/fa";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import {
  saveDraftReviewData,
  getInvoiceDataFromPdfId,
  saveChangesData,
  updateInvoiceData,
  type SaveDraftPayload,
} from "../api/callAxiosInvoiceExtract";
import {
  getPdfBase64,
  pushInvoiceToAribaQueue,
  getPoReceiptsSummary,
  addAribaComment,
  updateInvoicePONumber,
} from "../api/invoiceApi-table";
import type {
  PoReceiptsSummaryResponseDto,
  PoReceiptDto,
} from "../Dto/BuyerInvoiceDto";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: AribaResponseDTO;
  poNumber: string;
  invoiceNumber?: string;
  pdfId: string | null;
  onAfterSave?: (updatedData?: any) => void;
  onRefreshComparison?: (poNumber: string, pdfId: string) => Promise<any>;
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

interface CommentModalState {
  isOpen: boolean;
  comment: string;
  isSubmitting: boolean;
}

type FilterStatus = "all" | "matched" | "mismatched";
type Stage = "comparison" | "review" | "final";

const BuyerInvoiceCompareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  data,
  poNumber,
  invoiceNumber = '',
  pdfId,
  onAfterSave,
  onRefreshComparison,
}) => {
  const [editableData, setEditableData] = useState<EditableDataState>({
    poNumber: '',
    invoiceNumber: invoiceNumber,
    total: '',
    items: {},
  });

  const [stage, setStage] = useState<Stage>("comparison");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [finalInvoiceData, setFinalInvoiceData] = useState<any | null>(null);
  const [finalInvoiceDate, setFinalInvoiceDate] = useState<string>("");
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [isPushingToAriba, setIsPushingToAriba] = useState(false);
  const [isChangesSaved, setIsChangesSaved] = useState(false);
  const [showInvoice, setShowInvoice] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [showRcDetails, setShowRcDetails] = useState(false);
  const [rcSummaryData, setRcSummaryData] = useState<PoReceiptsSummaryResponseDto | null>(null);
  const [isRcLoading, setIsRcLoading] = useState(false);
  const [rcLoadError, setRcLoadError] = useState<string | null>(null);
  const [commentModal, setCommentModal] = useState<CommentModalState>({
    isOpen: false,
    comment: '',
    isSubmitting: false,
  });
  const [tempPoNumber, setTempPoNumber] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInvoicePdf = async (currentPdfId: string) => {
    setIsPdfLoading(true);
    setPdfLoadError(null);

    try {
      const response = await getPdfBase64(currentPdfId);
      if (response && "statusCode" in response) {
        setPdfLoadError(response.message || "Failed to load invoice PDF");
        return;
      }

      let base64 =
        (response as any)?.file_base64 || (response as any)?.base64 || (response as any)?.pdf_base64;
      if (!base64) {
        setPdfLoadError("No PDF data found for this invoice");
        return;
      }

      base64 = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      setPdfUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return URL.createObjectURL(blob);
      });
    } catch (error) {
      setPdfLoadError("Failed to load invoice PDF");
    } finally {
      setIsPdfLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !pdfId) return;

    loadInvoicePdf(pdfId);

    return () => {
      setPdfUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, [isOpen, pdfId]);

  if (!isOpen) return null;

  const poComparison = data.po_number_comparison;
  const totalComparison = data.total_comparison;
  const allLineItems: LineItemComparisonDTO[] = data.Comparision_of_lineItems || [];

  const displayValue = (value: any) =>
    value === null || value === undefined || value === "" ? "—" : value;

  const getStatusBadge = (status: string) => {
    const isMatched = status === "matched";
    const statusClass = isMatched ? "bicm-status-matched" : "bicm-status-mismatched";
    const StatusIcon = isMatched ? FaCheck : FaExclamationTriangle;
    const statusText = isMatched ? "Matched" : "Mismatched";

    return (
      <span className={`bicm-status-badge ${statusClass}`}>
        <span className="bicm-status-icon">
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

  const handleCopyReceiptData = (receipt: PoReceiptDto) => {
    const newEditableData: EditableDataState = {
      poNumber: String(
        poComparison?.ariba_po_number ||
        data.ariba_reference_data?.ariba_po_number ||
        poNumber ||
        ''
      ),
      invoiceNumber: editableData.invoiceNumber || invoiceNumber || '',
      total: String(receipt.total_gross_amount ?? ''),
      items: {}
    };

    allLineItems.forEach((item, idx) => {
      const matchedReceiptItem =
        receipt.items.find(
          (ri) => String(ri.line_item) === String(item.line_item_comparison_number)
        ) || receipt.items[idx];

      newEditableData.items[idx] = {
        itemCode: String(matchedReceiptItem?.line_item || ''),
        itemDescription: String(matchedReceiptItem?.description || ''),
        qty: String(matchedReceiptItem?.quantity ?? ''),
        unit: String(matchedReceiptItem?.unit_of_measure || '')
      };
    });

    setEditableData(newEditableData);
    toast.success(`RC "${receipt.receipt_id}" data copied successfully!`);
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

  const handleOpenCommentModal = () => {
    setTempPoNumber(editableData.poNumber || poComparison?.ariba_po_number || '');
    setCommentModal({ ...commentModal, isOpen: true, comment: '' });
  };

  const handleCloseCommentModal = () => {
    setCommentModal({ isOpen: false, comment: '', isSubmitting: false });
  };

  const handleRefreshData = async () => {
    if (!pdfId) {
      toast.warning("PDF ID is missing, cannot refresh.");
      return;
    }

    const poNumberForCompare =
      editableData.poNumber || poComparison?.ariba_po_number || poNumber || '';

    setIsRefreshing(true);
    try {
      const refreshTasks: Promise<any>[] = [loadInvoicePdf(pdfId)];

      if (rcSummaryData) {
        refreshTasks.push(fetchRcSummary());
      }

      if (onRefreshComparison) {
        refreshTasks.push(onRefreshComparison(poNumberForCompare, pdfId));
      } else {
        refreshTasks.push(getInvoiceDataFromPdfId(pdfId));
      }

      await Promise.all(refreshTasks);

      if (onAfterSave) {
        onAfterSave();
      }
      toast.success("Data refreshed successfully.");
    } catch (error) {
      toast.error("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveComment = async () => {
    if (!tempPoNumber.trim()) {
      toast.warning("Please enter the new PO Number");
      return;
    }

    if (!commentModal.comment.trim()) {
      toast.warning("A comment is required to change the PO Number");
      return;
    }

    const currentPoNumber = poComparison?.ariba_po_number || poNumber || '';
    if (tempPoNumber.trim() === String(currentPoNumber).trim()) {
      toast.info("The PO Number you entered is the same as the current one.");
      return;
    }

    if (!pdfId) {
      toast.error("PDF ID is missing");
      return;
    }

    setCommentModal(prev => ({ ...prev, isSubmitting: true }));

    try {
      setEditableData(prev => ({
        ...prev,
        poNumber: tempPoNumber
      }));

      await updateInvoicePONumber(pdfId, tempPoNumber);

      await addAribaComment(String(pdfId), commentModal.comment);

      toast.success("PO Number and comment saved successfully!");
      handleCloseCommentModal();
      await handleRefreshData();
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to save PO number and comment";
      toast.error(errorMessage);
    } finally {
      setCommentModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const CopyButton = ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button className="bicm-copy-button" onClick={onClick}>
      <span className="bicm-copy-icon">
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
            toast.error("Failed to refresh data after saving draft. Please refresh manually.", { autoClose: 5000 });
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
    setStage("review");
    setReviewData(reviewPayload);
    toast.info("Review mode activated. Please verify the data before submitting.");
  };

  const handleBackToComparison = () => {
    setStage("comparison");
    setReviewData(null);
    toast.info("Returned to Comparison view. You can edit the data.");
  };

  const handleSubmitReview = async () => {
    if (!pdfId) {
      toast.error("PDF ID is missing, cannot submit.");
      return;
    }

    setIsSubmittingFinal(true);
    try {
      const updatePayload: any = {
        PONumber: reviewData?.poNumber || "",
        InvoiceNumber: reviewData?.invoiceNumber || "",
        Total: reviewData?.total || "",
      };

      if (reviewData?.lineItems && reviewData.lineItems.length > 0) {
        updatePayload.items = reviewData.lineItems.map((item) => ({
          LineItemNumber: String(item.lineItemIndex),
          ItemCode: item.itemCode || "",
          ItemDescription: item.itemDescription || "",
          QTY: item.qty || "",
          Unit: item.unit || "",
        }));
      }

      toast.loading("Saving changes...", { toastId: "submit-save" });
      
      const updateResponse = await updateInvoiceData(pdfId, updatePayload);
      
      if (updateResponse && "statusCode" in updateResponse && updateResponse.statusCode >= 400) {
        toast.dismiss("submit-save");
        toast.error(
          `Failed to save changes: ${updateResponse.message}${
            updateResponse.description ? ": " + updateResponse.description : ""
          }`,
          { autoClose: 5000 }
        );
        return;
      }

      toast.update("submit-save", {
        render: "Fetching updated data...",
        type: "info",
        autoClose: false,
      });

      const res = await getInvoiceDataFromPdfId(pdfId);

      toast.dismiss("submit-save");

      if (res && "statusCode" in res) {
        toast.error(
          (res as any).message || "Failed to fetch updated invoice data"
        );
        return;
      }

      const invoiceResult = (res as any)?.results?.[0];
      const invoiceDetail = invoiceResult?.invoices?.[0];

      if (!invoiceDetail) {
        toast.error("No invoice data found for this PDF.");
        return;
      }

      setFinalInvoiceData(invoiceDetail);
      setFinalInvoiceDate(invoiceDetail.InvoiceDate || "");
      setIsChangesSaved(false);
      setStage("final");
      
      toast.success("Data submitted and retrieved successfully!");

    } catch (error: any) {
      toast.dismiss("submit-save");
      const errorMsg = "An unexpected error occurred";
      toast.error(`Failed: ${errorMsg}`);
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  const handleSaveChangesFinal = async () => {
    if (!finalInvoiceData || !Array.isArray(finalInvoiceData.Items) || finalInvoiceData.Items.length === 0) {
      toast.error("No line items available to save.");
      return;
    }

    setIsSavingChanges(true);
    try {
      const payload = finalInvoiceData.Items.map((item: any) => ({
        PO_Number: finalInvoiceData.PONumber || poNumber || "",
        sup_Invoice_Number: finalInvoiceData.InvoiceNumber || "",
        INVOICE_DATE: finalInvoiceDate || "",
        No: item?.LineItemNumber?.toString() || "",
        Description: item.ItemDescription || "",
        Qty_Invoice: item.QTY || "",
        Unit: item.Unit || "",
        Price_AED: item.UnitPrice || "",
        Amount_AED: item.Amount || "",
        Discount_AED: item.Discount || "",
        Charges: "",
        Taxes_AED: "",
        Gross_Amount_AED: "",
        Accounting: "",
        Details: "",
        Tax_code: "v2",
        is_process: 0,
        processed_date: "",
        user_id: "1",
        pdf_id: pdfId ? String(pdfId) : "",
        base_64_string: "",
        additionalProp1: {},
      }));

      await saveChangesData(payload);
      toast.success(`Successfully saved ${payload.length} record${payload.length > 1 ? "s" : ""}!`);
      setIsChangesSaved(true);
    } catch (error) {
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handlePushToAribaFinal = async () => {
    if (!pdfId) {
      toast.error("PDF ID is missing.");
      return;
    }

    setIsPushingToAriba(true);

    try {
      await pushInvoiceToAribaQueue(pdfId);

      toast.success("Successfully added to queue");

      if (onAfterSave) {
        onAfterSave({ pdfId });
      }

      onClose();
    } catch (error: any) {
      let errorMessage = "Failed to add invoice to queue.";

      if (error?.description) {
        errorMessage = Array.isArray(error.description)
          ? error.description.map((d: any) => d.msg).join(", ")
          : String(error.description);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsPushingToAriba(false);
    }
  };

  const fetchRcSummary = async () => {
    if (!poNumber) {
      setRcLoadError("PO Number is missing, cannot fetch RC details.");
      return;
    }

    setIsRcLoading(true);
    setRcLoadError(null);

    try {
      const result = await getPoReceiptsSummary(poNumber);
      setRcSummaryData(result);
    } catch (error: any) {
      setRcLoadError(error?.message || "Failed to load RC details");
    } finally {
      setIsRcLoading(false);
    }
  };

  const handleToggleInvoiceView = () => {
    setShowInvoice((prev) => {
      const next = !prev;
      if (next) setShowRcDetails(false);
      return next;
    });
  };

  const handleToggleRcView = () => {
    setShowRcDetails((prev) => {
      const next = !prev;
      if (next) {
        setShowInvoice(false);
        if (!rcSummaryData) {
          fetchRcSummary();
        }
      }
      return next;
    });
  };

  const renderReviewTable = () => (
    <div className="bicm-review-section">
      <h3>Reviewed Data to be Pushed to Ariba</h3>

      <table className="bicm-review-table bicm-comparison-table">
        <thead>
          <tr>
            <th className="bicm-field-column">Field</th>
            <th className="bicm-data-column">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="bicm-field-name">
              PO Number
              <span className="bicm-required">*</span>
            </td>
            <td>{displayValue(reviewData?.poNumber)}</td>
          </tr>
          <tr>
            <td className="bicm-field-name">Invoice Number</td>
            <td>{displayValue(reviewData?.invoiceNumber)}</td>
          </tr>
          <tr>
            <td className="bicm-field-name">Total</td>
            <td>{displayValue(reviewData?.total)}</td>
          </tr>
        </tbody>
      </table>

      {reviewData?.lineItems && reviewData.lineItems.length > 0 ? (
        <>
          <h4>Line Items</h4>
          <div className="bicm-table-scroll">
            <table className="bicm-review-table bicm-comparison-table">
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
          </div>
        </>
      ) : (
        <p className="bicm-no-data-message">
          No data was entered in the "Data to be Pushed into Ariba" column.
          Please go back and fill the fields.
        </p>
      )}
    </div>
  );

  const renderFinalSubmittedTable = () => (
    <div className="bicm-review-section">
      <h3>Submitted Invoice Data</h3>

      <table className="bicm-review-table bicm-comparison-table">
        <thead>
          <tr>
            <th className="bicm-field-column">Field</th>
            <th className="bicm-data-column">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="bicm-field-name">
              PO Number
              <span className="bicm-required">*</span>
            </td>
            <td>{displayValue(finalInvoiceData?.PONumber)}</td>
          </tr>
          <tr>
            <td className="bicm-field-name">Invoice Number</td>
            <td>{displayValue(finalInvoiceData?.InvoiceNumber)}</td>
          </tr>
          <tr>
            <td className="bicm-field-name">Invoice Date</td>
            <td>
              <input
                type="text"
                value={finalInvoiceDate}
                onChange={(e) => setFinalInvoiceDate(e.target.value)}
                className="bicm-editable-input"
                placeholder="DD-MM-YYYY"
                aria-label="Invoice Date input"
              />
            </td>
          </tr>
          <tr>
            <td className="bicm-field-name">Total</td>
            <td>{displayValue(finalInvoiceData?.Total)}</td>
          </tr>
        </tbody>
      </table>

      {Array.isArray(finalInvoiceData?.Items) && finalInvoiceData.Items.length > 0 ? (
        <>
          <h4>Line Items</h4>
          <div className="bicm-table-scroll">
            <table className="bicm-review-table bicm-comparison-table">
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
                {finalInvoiceData.Items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td>{displayValue(item.LineItemNumber)}</td>
                    <td>{displayValue(item.ItemCode)}</td>
                    <td>{displayValue(item.ItemDescription)}</td>
                    <td>{displayValue(item.QTY)}</td>
                    <td>{displayValue(item.Unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="bicm-no-data-message">
          No line items found in the submitted data.
        </p>
      )}
    </div>
  );

  const renderInvoicePanel = () => (
    <div className="bicm-pdf-panel">
      <div className="bicm-pdf-panel-header">
        <span>Invoice Document</span>
      </div>
      <div className="bicm-pdf-panel-body">
        {isPdfLoading ? (
          <div className="bicm-pdf-status">
            <span className="bicm-pdf-spinner" />
            Loading invoice...
          </div>
        ) : pdfLoadError ? (
          <div className="bicm-pdf-status bicm-pdf-error">{pdfLoadError}</div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Invoice PDF"
            className="bicm-pdf-iframe"
          />
        ) : (
          <div className="bicm-pdf-status">No invoice PDF available.</div>
        )}
      </div>
    </div>
  );

  const renderRcDetailsPanel = () => (
    <div className="bicm-pdf-panel">
      <div className="bicm-pdf-panel-header">
        <span>
          RC (Receipt) Details
          {rcSummaryData ? ` — ${rcSummaryData.total_rc_count} RC(s)` : ""}
        </span>
      </div>
      <div className="bicm-pdf-panel-body bicm-rc-panel-body">
        {isRcLoading ? (
          <div className="bicm-pdf-status">
            <span className="bicm-pdf-spinner" />
            Loading RC details...
          </div>
        ) : rcLoadError ? (
          <div className="bicm-pdf-status bicm-pdf-error">{rcLoadError}</div>
        ) : rcSummaryData && rcSummaryData.receipts.length > 0 ? (
          <div className="bicm-rc-list">
            {rcSummaryData.receipts.map((receipt) => (
              <div key={receipt.receipt_id} className="bicm-rc-card">
                <div className="bicm-rc-card-header">
                  <div className="bicm-rc-card-heading">
                    <span className="bicm-rc-id">RC: {receipt.receipt_id}</span>
                    <span className="bicm-rc-meta">
                      {receipt.total_line_items} item(s) • Gross: {receipt.total_gross_amount}
                    </span>
                  </div>
                  <CopyButton
                    label="Copy"
                    onClick={() => handleCopyReceiptData(receipt)}
                  />
                </div>
                <div className="bicm-table-scroll">
                  <table className="bicm-comparison-table bicm-rc-table">
                    <thead>
                      <tr>
                        <th>Line</th>
                        <th>Description</th>
                        <th>QTY</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Gross Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.items.map((item, i) => (
                        <tr key={i}>
                          <td>{displayValue(item.line_item)}</td>
                          <td>{displayValue(item.description)}</td>
                          <td>{displayValue(item.quantity)}</td>
                          <td>{displayValue(item.unit_of_measure)}</td>
                          <td>{displayValue(item.amount_accepted)}</td>
                          <td>{displayValue(item.gross_amount_accepted)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bicm-pdf-status">No RC (receipt) data found for this PO.</div>
        )}
      </div>
    </div>
  );

  const renderCommentModal = () => (
    <div className="bicm-comment-modal-overlay">
      <div className="bicm-comment-modal">
        <div className="bicm-comment-modal-header">
          <h3>Update PO Number & Add Comment</h3>
          <button
            onClick={handleCloseCommentModal}
            className="bicm-comment-modal-close"
            aria-label="Close comment modal"
          >
            <FaTimes />
          </button>
        </div>
        <div className="bicm-comment-modal-body">
          <div className="bicm-comment-modal-notice">
            <FaExclamationTriangle className="bicm-comment-modal-notice-icon" />
            <span>Changing the PO Number requires a comment explaining the reason for the change.</span>
          </div>

          <div className="bicm-comment-modal-field">
            <label className="bicm-comment-modal-label">Current PO Number</label>
            <input
              type="text"
              className="bicm-comment-modal-input bicm-comment-modal-input-readonly"
              value={poComparison?.ariba_po_number || poNumber || '—'}
              disabled
              readOnly
              aria-label="Current PO Number"
            />
          </div>

          <div className="bicm-comment-modal-field">
            <label className="bicm-comment-modal-label">
              New PO Number <span className="bicm-required">*</span>
            </label>
            <input
              type="text"
              className="bicm-comment-modal-input"
              value={tempPoNumber}
              onChange={(e) => setTempPoNumber(e.target.value)}
              placeholder="Enter new PO Number"
            />
          </div>
          <div className="bicm-comment-modal-field">
            <label className="bicm-comment-modal-label">
              Comment <span className="bicm-required">*</span>
            </label>
            <textarea
              className="bicm-comment-textarea"
              placeholder="Explain why you are changing the PO Number..."
              value={commentModal.comment}
              onChange={(e) => setCommentModal({ ...commentModal, comment: e.target.value })}
              rows={5}
            />
          </div>
        </div>
        <div className="bicm-comment-modal-footer">
          <button
            className="bicm-comment-button-cancel"
            onClick={handleCloseCommentModal}
            disabled={commentModal.isSubmitting}
          >
            Cancel
          </button>
          <button
            className="bicm-comment-button-save"
            onClick={handleSaveComment}
            disabled={commentModal.isSubmitting}
          >
            {commentModal.isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  const isSplitView = (showInvoice || showRcDetails) && stage === "comparison";

  return (
    <div className="bicm-modal-overlay">
      <div className="bicm-modal-container">
        <div className="bicm-modal-header">
          <h2 className="bicm-modal-title">
            {stage === "review"
              ? "Review Data"
              : stage === "final"
              ? "Submitted Invoice Data"
              : "Data Comparison"}
          </h2>
          <button onClick={onClose} className="bicm-close-button" aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        {stage === "comparison" && (
          <div className="bicm-action-buttons">
            <div className="bicm-dropdown-wrapper">
              <select
                className="bicm-dropdown"
                value={filterStatus}
                onChange={handleFilterChange}
                aria-label="Filter status"
              >
                <option value="all">Show All</option>
                <option value="matched">Show Matched</option>
                <option value="mismatched">Show Mismatched</option>
              </select>
            </div>

            <div className="bicm-buttons-wrapper">
              <button
                className="bicm-icon-button bicm-refresh-button"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                title="Refresh table data"
                aria-label="Refresh table data"
              >
                <FaSync className={isRefreshing ? "bicm-spin" : ""} />
              </button>
              <button
                className="bicm-toggle-invoice-button"
                onClick={handleToggleInvoiceView}
                title={showInvoice ? "Hide invoice" : "Show invoice"}
              >
                {showInvoice ? <FaEyeSlash /> : <FaEye />}
                {showInvoice ? "Hide Invoice" : "Show Invoice"}
              </button>
              <button
                className="bicm-toggle-rc-button"
                onClick={handleToggleRcView}
                title={showRcDetails ? "Hide RC details" : "Show all RC details"}
              >
                {showRcDetails ? <FaEyeSlash /> : <FaEye />}
                {showRcDetails ? "Hide RC Details" : "Show All RC Details"}
              </button>
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
              <button className="bicm-edit-button" aria-label="Edit mode">
                <FaEdit className="bicm-edit-icon" />
                Edit
              </button>
            </div>
          </div>
        )}

        <div className={`bicm-modal-body ${isSplitView ? "bicm-modal-body-split" : ""}`}>
          {isSplitView && (showInvoice ? renderInvoicePanel() : renderRcDetailsPanel())}

          <div className="bicm-modal-content">
            {stage === "review" ? (
              renderReviewTable()
            ) : stage === "final" ? (
              renderFinalSubmittedTable()
            ) : (
              <>
                <div className="bicm-comparison-section">
                  <div className="bicm-table-scroll">
                    <table className="bicm-comparison-table">
                      <thead>
                        <tr>
                          <th className="bicm-field-column">Field</th>
                          <th className="bicm-data-column">Ariba PO Data</th>
                          <th className="bicm-data-column">Ariba RCT Data</th>
                          <th className="bicm-data-column">Invoice Extracted Data</th>
                          <th className="bicm-status-column">Status</th>
                          <th className="bicm-comments-column">Comments</th>
                          <th className="bicm-data-column">Data to be Pushed into Ariba</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poComparison && shouldShowHeaderRow(poComparison.status) && (
                          <tr>
                            <td className="bicm-field-name">
                              PO Number
                              <span className="bicm-required">*</span>
                            </td>
                            <td>{displayValue(data.ariba_reference_data?.ariba_po_number)}</td>
                            <td>{displayValue(poComparison.receipt_po_number)}</td>
                            <td>{displayValue(poComparison.invoice_po_number)}</td>
                            <td>{getStatusBadge(poComparison.status)}</td>
                            <td>{displayValue(poComparison.error_comment)}</td>
                            <td className="bicm-po-input-wrapper">
                              <input
                                type="text"
                                value={editableData.poNumber || poComparison?.ariba_po_number || ''}
                                onChange={(e) => handleHeaderFieldChange('poNumber', e.target.value)}
                                className="bicm-editable-input"
                                placeholder=""
                                aria-label="PO Number input"
                                disabled={true}
                                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                              />
                              <button
                                className="bicm-icon-button bicm-add-comment-button"
                                onClick={handleOpenCommentModal}
                                title="Add comment to change PO Number"
                                aria-label="Add comment to change PO Number"
                              >
                                <FaComment />
                              </button>
                            </td>
                          </tr>
                        )}

                        {shouldShowHeaderRow("matched") && (
                          <tr>
                            <td className="bicm-field-name">Invoice Number</td>
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
                                className="bicm-editable-input"
                                placeholder=""
                                aria-label="Invoice Number input"
                              />
                            </td>
                          </tr>
                        )}

                        {totalComparison && shouldShowHeaderRow(totalComparison.status) && (
                          <tr>
                            <td className="bicm-field-name">Total</td>
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
                                className="bicm-editable-input"
                                placeholder=""
                                aria-label="Total input"
                              />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                      <div key={idx} className="bicm-item-section">
                        <div className="bicm-item-header">
                          <h3>Item {item.line_item_comparison_number}</h3>
                        </div>

                        <div className="bicm-table-scroll">
                          <table className="bicm-comparison-table">
                            <thead>
                              <tr>
                                <th className="bicm-field-column">Field</th>
                                <th className="bicm-data-column">Ariba PO Data</th>
                                <th className="bicm-data-column">Ariba RCT Data</th>
                                <th className="bicm-data-column">Invoice Extracted Data</th>
                                <th className="bicm-status-column">Status</th>
                                <th className="bicm-comments-column">Comments</th>
                                <th className="bicm-data-column">Data to be Pushed into Ariba</th>
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
                                        <td className="bicm-field-name">Line item</td>
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
                                            className="bicm-editable-input"
                                            aria-label={`Item ${item.line_item_comparison_number} code input`}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                    {shouldShowRow(itemDescStatus) && (
                                      <tr>
                                        <td className="bicm-field-name">Item Description</td>
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
                                            className="bicm-editable-input"
                                            placeholder=""
                                            aria-label={`Item ${item.line_item_comparison_number} description input`}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                    {shouldShowRow(qtyStatus) && (
                                      <tr>
                                        <td className="bicm-field-name">QTY</td>
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
                                            className="bicm-editable-input"
                                            placeholder=""
                                            aria-label={`Item ${item.line_item_comparison_number} quantity input`}
                                          />
                                        </td>
                                      </tr>
                                    )}
                                    {shouldShowRow(unitStatus) && (
                                      <tr>
                                        <td className="bicm-field-name">Unit</td>
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
                                            className="bicm-editable-input"
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
                      </div>
                    );
                  });

                  if (!hasAnyVisibleContent && allLineItems.length > 0) {
                    return (
                      <p className="bicm-no-data-message">
                        No line item fields found for the <strong>{filterStatus}</strong> filter status.
                      </p>
                    );
                  }

                  return itemsContent;
                })()}
              </>
            )}
          </div>
        </div>

        <div className="bicm-modal-footer">
          {stage === "review" ? (
            <>
              <button
                className="bicm-footer-button bicm-footer-button-secondary"
                onClick={handleBackToComparison}
                disabled={isSubmittingFinal}
              >
                Back to Edit
              </button>
                <button
                  className="bicm-footer-button bicm-footer-button-primary"
                  onClick={handleSubmitReview}
                  disabled={isSubmittingFinal}
                >
                  {isSubmittingFinal ? 'Submitting...' : 'Submit'}
                </button>
            </>
          ) : stage === "final" ? (
            <>
              <button
                className="bicm-footer-button bicm-footer-button-secondary"
                onClick={handleSaveChangesFinal}
                disabled={isSavingChanges}
              >
                {isSavingChanges ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                className="bicm-footer-button bicm-footer-button-primary"
                onClick={handlePushToAribaFinal}
                disabled={!isChangesSaved || isPushingToAriba}
                title={!isChangesSaved ? "Please save changes first" : ""}
              >
                {isPushingToAriba ? 'Adding...' : 'Add to Queue'}
              </button>
            </>
          ) : (
            <>
              <button
                className="bicm-footer-button bicm-footer-button-secondary"
                onClick={handleSaveDraft}
              >
                Save as Draft
              </button>
              <button
                className="bicm-footer-button bicm-footer-button-primary"
                onClick={handleReview}
              >
                Review
              </button>
            </>
          )}
        </div>
      </div>

      {commentModal.isOpen && renderCommentModal()}
    </div>
  );
};

export default BuyerInvoiceCompareModal;