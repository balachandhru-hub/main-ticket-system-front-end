import axios from 'axios';

const rpaInstance = axios.create({
  baseURL: import.meta.env.VITE_RPA_BASE_URL,
  timeout: 120000,
  headers: {
    'Accept': '*/*',
  },
  withCredentials:true,
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  },
});

export default rpaInstance;