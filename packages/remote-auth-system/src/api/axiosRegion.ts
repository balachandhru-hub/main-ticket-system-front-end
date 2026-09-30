import axios from 'axios';

const regionInstance = axios.create({
  baseURL: import.meta.env.VITE_REGION_API_BASE_URL,
  timeout: 500000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

export default regionInstance;
