import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./ReprocessedTable.css";
import { toast } from "react-toastify";
import BackButton from "./BackButton";
import InvoiceExtractorTable from "./InvoiceExtractorTable";
import {
  fetchReprocessedInvoices,
  saveChangesData,
  type ReprocessedData,
} from "../api/callAxiosInvoiceExtract";
import {
  executeInvoiceProcessSync,
  fetchCustomerInvoicesById,
} from "../api/rpaInvoiceApi";
import type { DynamicInvoice } from "./InvoiceExtractorTable";

interface InvoiceDetail {
  sno: number;
  [key: string]: string | number | null | undefined;
}

interface CustomerInvoiceRecord {
  No: number;
  po_number: number;
  supplier_invoice_no: string;
  customer_invoice_no: string;
  processed_date: string;
  flags: number;
}

const ReprocessedTable: React.FC = () => {
  const location = useLocation();
  const pdfId = location.state?.pdfId;

  const [invoices, setInvoices] = useState<DynamicInvoice[]>([]);
  const [originalInvoices, setOriginalInvoices] = useState<DynamicInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [currentPoNumber, setCurrentPoNumber] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInvoiceTable, setShowInvoiceTable] = useState(false);
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoiceRecord[]>([]);
  const hasChanges = JSON.stringify(invoices) !== JSON.stringify(originalInvoices);
  const [isUploadingToAriba, setIsUploadingToAriba] = useState(false);



  useEffect(() => {
    if (pdfId) {
      loadReprocessedData(pdfId);
    } else {
      setError("No PDF ID provided for reprocessing");
      setLoading(false);
    }
  }, [pdfId]);

  const loadReprocessedData = async (id: number) => {
    try {
      setLoading(true);
      const data = await fetchReprocessedInvoices([id]);

      if ("statusCode" in data) {
        setError(data.message || "Failed to fetch reprocessed data");
        setLoading(false);
        return;
      }

      const transformedInvoices = transformData(data);
      setInvoices(transformedInvoices);
      setOriginalInvoices(JSON.parse(JSON.stringify(transformedInvoices)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const transformData = (data: ReprocessedData): DynamicInvoice[] => {
    const transformed: DynamicInvoice[] = [];
    data.results.forEach((result) => {
      result.invoices.forEach((invoice) => {
        const { Items, ...rest } = invoice;
        const items: InvoiceDetail[] =
          Items?.map((item, index) => ({
            sno: index + 1,
            ...item,
          })) || [];
        transformed.push({
          id: result.pdf_id,
          ...(rest as Record<string, any>),
          action: "Edit",
          details: items,
        });
      });
    });
    return transformed;
  };

  const displayValue = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const handleDetailChange = (invoiceId: number, detailIndex: number, field: string, value: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, details: inv.details.map((d, i) => (i === detailIndex ? { ...d, [field]: value } : d)) }
          : inv
      )
    );
    setIsSaved(false);
  };

  const handleInvoiceChange = (invoiceId: number, field: string, value: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, [field]: value } : inv))
    );
    setIsSaved(false);
  };

  const handleSubmit = () => {
    const hasChanges = JSON.stringify(invoices) !== JSON.stringify(originalInvoices);
    if (!hasChanges) {
      toast.info("No changes detected. Proceeding to report view.");
    } else {
      toast.success("Review your changes in the report below.");
    }
    setShowReport(true);
  };

  const handleReset = () => {
    if (originalInvoices.length === 0) {
      toast.info("No original data to reset to.");
      return;
    }
    setInvoices(JSON.parse(JSON.stringify(originalInvoices)));
    setIsSaved(false);
    toast.success("Changes have been reset.");
  };

  const buildSavePayload = () => {
    return invoices.flatMap((invoice) =>
      invoice.details.map((item) => ({
        PO_Number: invoice.PONumber || "",
        sup_Invoice_Number: invoice.InvoiceNumber || "",
        INVOICE_DATE: invoice.InvoiceDate || "",
        No: item?.sno?.toString() || "",
        Description: item.ItemDescription || "",
        Qty_Invoice: item.QTY || "",
        Unit: item.Unit || "",
        Price_AED: item.UnitPrice || "",
        Amount_AED: item.Amount || item.amount || "",
        Discount_AED: item.Discount || "",
        Charges: "",
        Taxes_AED: "",
        Gross_Amount_AED: "",
        Accounting: "",
        Details: "",
        Tax_code: "v2",
        is_process: 0,
        processed_date: "",
        user_id: (invoice.user_id as string || 1).toString(),
        pdf_id: invoice.pdf_id !== undefined && invoice.pdf_id !== null ? String(invoice.pdf_id) : "",
        base_64_string: "",
        additionalProp1: {},
      }))
    );
  };

  const handleSaveChanges = async () => {
      const payload = buildSavePayload();
      if (payload.length === 0) {
        toast.error("No data available to save.");
        return;
      }

      try {
        toast.loading("Saving changes...", { toastId: "save-process" });
        const result = await saveChangesData(payload);
        toast.dismiss("save-process");

        let isSuccess = false;

        if (result && typeof result === "object") {
          if ("message" in result) {
            const msg = String((result as any).message || "");
            if (msg.toLowerCase().includes("success") || msg.toLowerCase().includes("saved")) {
              isSuccess = true;
            }
          }
        }

        if (isSuccess) {
    
          toast.success("Changes saved successfully!");
          setOriginalInvoices(JSON.parse(JSON.stringify(invoices)));
          setIsSaved(true);
        } else {
          const errorMessage =
            typeof result === "object" && result !== null && "message" in result
              ? (result as any).message
              : "Failed to save changes.";
          toast.error(errorMessage);
        }
      } catch {
        toast.dismiss("save-process");
        toast.error("An unexpected error occurred while saving.");
      }
  };

  const handlePushToAriba = useCallback(async () => {
    if (!isSaved) {
      toast.error("Please save changes first before uploading to Ariba.");
      return;
    }

    if (invoices.length === 0) {
      toast.error("No invoices available to upload.");
      return;
    }

    const poNumber = invoices[0].PONumber;
    if (!poNumber) {
      toast.error("PO Number not found in the invoice.");
      return;
    }

    // Extract PDF IDs from invoices
    const pdfIds = invoices
      .map(inv => inv.pdf_id)
      .filter((id): id is string | number => id !== undefined && id !== null);

    if (pdfIds.length === 0) {
      toast.error("PDF ID not found in the invoice(s).");
      return;
    }

    setCurrentPoNumber(Number(poNumber));
    setCustomerInvoices([]);
    setShowInvoiceTable(true);
    setIsUploadingToAriba(true);
    
    // Show message about process starting
    toast.info("Uploading Process started please wait, this may take some time.");

    try {
      const result = await executeInvoiceProcessSync(pdfIds);
      
      // Check if the result indicates success
      if (result && typeof result === "object" && "statusCode" in result) {
        if (result.statusCode === 200) {
          toast.success("Uploading to Ariba is Completed Successfully!");
          setIsUploadingToAriba(false);
        } else {
          // If statusCode is not 200, it's an error
          const errorMessage = (result as any)?.message || "Failed to upload to Ariba";
          toast.error(errorMessage);
          setIsUploadingToAriba(false);
        }
      } else {
        toast.success("Uploading to Ariba is Completed Successfully!");
        setIsUploadingToAriba(false);
      }
    } catch (error) {
      setIsUploadingToAriba(false);
      toast.error("Error starting background process: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }, [invoices, isSaved]);


  const handleRefreshStatus = useCallback(async () => {
    if (!currentPoNumber) {
      toast.error("No PO number available to fetch status.");
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await fetchCustomerInvoicesById(currentPoNumber);

      if (result && typeof result === "object" && "statusCode" in result && result.statusCode === 200) {
        const records: CustomerInvoiceRecord[] =
          "description" in result && typeof result.description === "string"
            ? JSON.parse(result.description)
            : [];

        const hasProcessing = records.some((inv) => inv.flags === 0);
        if (records.length === 0) {
          toast.info("No records found. The process may still be running.");
          setCustomerInvoices([]);
        } else if (hasProcessing) {
          toast.info("Still processing. Please try clicking on Refresh Status again.");
          setCustomerInvoices([]);
        } else {
          const completed = records.filter((inv) => inv.flags === 1);
          setCustomerInvoices(completed);
          toast.success(`Found ${completed.length} completed invoice record(s)`);
        }
      } else {
        toast.error(
          typeof result === "object" && result !== null && "message" in result
            ? (result as any).message
            : "Failed to fetch invoice status"
        );
      }
    } catch {
      toast.error("Error fetching invoice status. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPoNumber]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rpt-container">
        <div className="back-btn-reprocessed"> <BackButton /> </div>
        <div className="rpt-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rpt-container">
        <div className="back-btn-reprocessed"> <BackButton /> </div>
        <div className="rpt-no-data">
          <p>No reprocessed invoice data available.</p>
        </div>
      </div>
    );
  }

  const mainHeaders = [
    "InvoiceNumber",
    "SupplierName",
    "CustomerName",
    "PONumber",
    "InvoiceDate",
    "SupplierTRN",
    "CustomerTRN",
    "Email",
    "Total",
  ];
  const detailHeaders = [
    "ItemCode",
    "ItemDescription",
    "QTY",
    "Unit",
    "UnitPrice",
    "Amount",
    "Discount",
    "VAT",
    "VATAmount",
    "AmountInclVAT",
  ];

  return (
    <div className="rpt-container">
       <div className="back-btn-reprocessed"> <BackButton /> </div>
      <div className="rpt-header">
        {showReport ? "Reprocessed Invoice Report" : "Reprocessed Invoices"}
      </div>

      {!showReport ? (
        <>
          <InvoiceExtractorTable
            invoices={invoices}
            mainHeaders={mainHeaders}
            detailHeaders={detailHeaders}
            handleDetailChange={handleDetailChange}
            handleInvoiceChange={handleInvoiceChange}
            displayValue={displayValue}
            readOnly={false}
            originalInvoices={originalInvoices}
            isShowing
            loading={loading}
            setLoading={setLoading}
          />
          <div className="footer-buttons" style={{ marginTop: "1rem" }}>
            <button className="submit-btn" onClick={handleSubmit} disabled={invoices.length === 0}>
              Submit for Review
            </button>
             <button
              className="reset-btn"
              onClick={handleReset}
              style={{ marginLeft: "0.5rem" }}
              disabled={!hasChanges}
              title={!hasChanges ? "No changes to reset" : ""}
            >
              Reset Changes
            </button>

          </div>
        </>
      ) : (
        <>
          <div className="rpt-report-header">
            <p>Please review the modified invoice data before saving or uploading to Ariba</p>
          </div>
          <InvoiceExtractorTable
            invoices={invoices}
            mainHeaders={mainHeaders}
            detailHeaders={detailHeaders}
            handleDetailChange={handleDetailChange}
            handleInvoiceChange={handleInvoiceChange}
            displayValue={displayValue}
            readOnly
            originalInvoices={originalInvoices}
            isShowing={false}
            loading={loading}
            setLoading={setLoading}
          />
          <div className="footer-buttons" style={{ marginTop: "1rem" }}>
            <button className="submit-btn" onClick={handleSaveChanges}>
              Save Changes
            </button>
            <button
              className="submit-btn"
              onClick={handlePushToAriba}
              disabled={!isSaved || isUploadingToAriba}
              style={{
                marginLeft: "0.5rem",
                opacity: (!isSaved || isUploadingToAriba) ? 0.6 : 1,
                cursor: (!isSaved || isUploadingToAriba) ? "not-allowed" : "pointer",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              title={!isSaved ? "Please save changes first" : isUploadingToAriba ? "Uploading in progress..." : ""}
            >
              {isUploadingToAriba ? (
                <>
                  <span className="loader-spinner" style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    borderTop: '2px solid white',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Uploading...
                </>
              ) : (
                "Upload to Ariba"
              )}
            </button>
          </div>
        </>
      )}

      {showInvoiceTable && (
        <>
          <div className="rpt-status-header">
            <h2 className="rpt-status-title">Ariba Processing Status</h2>
            <button
              className="rpt-refresh-btn"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Refreshing..." : "🔄 Refresh Status"}
            </button>
          </div>

          {customerInvoices.length === 0 ? (
            <div className="rpt-status-placeholder">
              <p className="rpt-status-message">Click 'Refresh Status' to check for updates.</p>
              {currentPoNumber && (
                <p className="rpt-status-po">
                  Tracking PO Number: <strong>{currentPoNumber}</strong>
                </p>
              )}
            </div>
          ) : (
            <table className="rpt-status-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>PO Number</th>
                  <th>Supplier Invoice No</th>
                  <th>Customer Invoice No</th>
                  <th>Processed Date</th>
                </tr>
              </thead>
              <tbody>
                {customerInvoices.map((record, idx) => (
                  <tr key={idx}>
                    <td>{record.No}</td>
                    <td>{record.po_number}</td>
                    <td>{record.supplier_invoice_no}</td>
                    <td>{record.customer_invoice_no || "—"}</td>
                    <td>{new Date(record.processed_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default ReprocessedTable;
