// src/api/invoiceApi.ts
export interface InvoiceItem {
  id: number;
  userId: number;
  buyerName: string;
  filename: string;
  pdfId: number;
  status: string;
  createdAt: string;
  total?: number;
  totalAmount?: number;
  receivedAmount?: number;
}

export const getInvoices = async (): Promise<InvoiceItem[]> => {
  // Dummy data
  return Promise.resolve([
    {
      id: 44,
      userId: 1,
      buyerName: 'ABC Corp',
      filename: '25.025972 1 (2).pdf',
      pdfId: 44,
      status: 'success',
      createdAt: '2025-09-26T06:16:38.830000',
      totalAmount: 1500,
      receivedAmount: 1200,
    },
    {
      id: 43,
      userId: 1,
      buyerName: 'XYZ Pvt Ltd',
      filename: '2425 1.pdf',
      pdfId: 43,
      status: 'success',
      createdAt: '2025-09-26T06:16:27.487000',
      totalAmount: 2000,
      receivedAmount: 1800,
    },
    {
      id: 42,
      userId: 1,
      buyerName: 'Sample Buyer',
      filename: '2425 1.pdf',
      pdfId: 42,
      status: 'success',
      createdAt: '2025-09-26T06:14:05.173000',
      totalAmount: 1000,
      receivedAmount: 900,
    },
  ]);
};
