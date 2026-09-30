import axios from 'axios';

const invoiceInstance = axios.create({
  baseURL: import.meta.env.VITE_INVOICE_EXTRACTION_API_KEY,
  timeout: 500000,
   headers: {
    'Accept': '*/*',
  },
  withCredentials: true,
});

export default invoiceInstance;