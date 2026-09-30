import axios from 'axios';

const sesInstance = axios.create({
  baseURL: import.meta.env.VITE_SES_BASE_URL,
  // timeout: 30000,
  headers: {
    'Accept': '*/*',
  },
  withCredentials: true,
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  },
});

export default sesInstance;
