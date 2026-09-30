import axios from 'axios';

export const instanceInvoiceExtraction = axios.create({
  baseURL: import.meta.env.VITE_INVOICE_EXTRACTION_API_KEY,
   headers: {
    'Accept': '*/*',
  },
  withCredentials: true,
});


export const AribaDataAxiox = axios.create({
  baseURL: import.meta.env.VITE_INVOICE_EXTRACTION_API_KEY,
   headers: {
    'Accept': '*/*',
  },
  withCredentials: true,
});
