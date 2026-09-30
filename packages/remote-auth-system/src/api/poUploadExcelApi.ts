import axios from "axios";

export const PoExcel= axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // timeout: 10000,
  withCredentials: true
});

export default PoExcel