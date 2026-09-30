import axios from 'axios';

const sesPoChange = axios.create({
  baseURL: import.meta.env.VITE_SES_PO_CHANGE_URL,
  // timeout: 30000,
  headers: {
    'Accept': '*/*',
  },
  withCredentials: true,
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  },
});

export default sesPoChange;