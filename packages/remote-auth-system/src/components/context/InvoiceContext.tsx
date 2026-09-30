// src/context/InvoiceContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

interface InvoiceDetail {
  sno: number;
  [key: string]: string | number | null | undefined;
}

interface DynamicInvoice {
  id: number;
  action: string;
  details: InvoiceDetail[];
  pdf_id?: string | number;
  [key: string]: string | number | null | undefined | InvoiceDetail[];
}

interface InvoiceContextType {
  originalInvoices: DynamicInvoice[];
  editableInvoices: DynamicInvoice[];
  submittedInvoices: DynamicInvoice[];
  isSubmitted: boolean;
  setOriginalInvoices: (invoices: DynamicInvoice[]) => void;
  setEditableInvoices: (invoices: DynamicInvoice[]) => void;
  updateInvoiceField: (invoiceId: number, field: string, value: string) => void;
  updateDetailField: (invoiceId: number, detailIndex: number, field: string, value: string) => void;
  submitInvoices: () => void;
  resetInvoices: () => void;
  clearInvoices: () => void;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [originalInvoices, setOriginalInvoices] = useState<DynamicInvoice[]>([]);
  const [editableInvoices, setEditableInvoices] = useState<DynamicInvoice[]>([]);
  const [submittedInvoices, setSubmittedInvoices] = useState<DynamicInvoice[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateInvoiceField = useCallback((invoiceId: number, field: string, value: string) => {
    setEditableInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, [field]: value } : inv))
    );
  }, []);

  const updateDetailField = useCallback(
    (invoiceId: number, detailIndex: number, field: string, value: string) => {
      setEditableInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId) return inv;
          const newDetails = [...inv.details];
          if (newDetails[detailIndex]) {
            newDetails[detailIndex] = { ...newDetails[detailIndex], [field]: value };
          }
          return { ...inv, details: newDetails };
        })
      );
    },
    []
  );

  const submitInvoices = useCallback(() => {
    const clonedData = editableInvoices.map((invoice) => ({
      ...invoice,
      details: invoice.details.map((detail) => ({ ...detail })),
    }));
    setSubmittedInvoices(clonedData);
    setOriginalInvoices(clonedData);
    setIsSubmitted(true);
  }, [editableInvoices]);

  const resetInvoices = useCallback(() => {
    const clonedOriginal = originalInvoices.map((invoice) => ({
      ...invoice,
      details: invoice.details.map((detail) => ({ ...detail })),
    }));
    setEditableInvoices(clonedOriginal);
    if (isSubmitted) {
      setSubmittedInvoices(clonedOriginal);
    }
  }, [originalInvoices, isSubmitted]);

  const clearInvoices = useCallback(() => {
    setOriginalInvoices([]);
    setEditableInvoices([]);
    setSubmittedInvoices([]);
    setIsSubmitted(false);
  }, []);

  return (
    <InvoiceContext.Provider
      value={{
        originalInvoices,
        editableInvoices,
        submittedInvoices,
        isSubmitted,
        setOriginalInvoices,
        setEditableInvoices,
        updateInvoiceField,
        updateDetailField,
        submitInvoices,
        resetInvoices,
        clearInvoices,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
};

export const useInvoiceContext = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error('useInvoiceContext must be used within InvoiceProvider');
  }
  return context;
};