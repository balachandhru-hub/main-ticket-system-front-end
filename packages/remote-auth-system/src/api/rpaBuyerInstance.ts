import axios from 'axios';

const rpaBuyerInstance = axios.create({
  baseURL: import.meta.env.VITE_RPA_BASE_URL,
  timeout: 120000,
  headers: {
    'Accept': '*/*',
  },
  withCredentials:true
});

export default rpaBuyerInstance;