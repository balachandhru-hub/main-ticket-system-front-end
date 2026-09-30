import axios from 'axios';

const countryCodeApi = axios.create({
  baseURL: import.meta.env.VITE_COUNTRY_CODE_API_BASE_URL,
  timeout: 500000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default countryCodeApi;