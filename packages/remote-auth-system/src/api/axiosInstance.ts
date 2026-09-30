// src/api/axiosInstance.ts
import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 500000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

export default instance;


