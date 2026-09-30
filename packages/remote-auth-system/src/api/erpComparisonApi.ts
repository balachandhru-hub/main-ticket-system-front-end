import axios from "axios";
import type { ErpComparisonRequest, ErpComparisonResponse } from "../Dto/erpDto";
import type { FullMatchRequest, FullMatchResponse } from "../Dto/erpDto";
import type { ErpComparisonCountResponse } from "../Dto/erpDto";

const api = axios.create({
  baseURL: import.meta.env.VITE_ERP_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  }
});



export async function getErpComparison(data?: ErpComparisonRequest) {
  try {
    const response = await api.post<ErpComparisonResponse>(
      "/erpComparison",
      data ? data : { page: 1, page_size: 10 }
    );

    return response.data;
  } catch (error) {
    throw error;
  }
}


export async function getFullMatchDetails(data: FullMatchRequest) {
  try {
    const response = await api.post<FullMatchResponse>(
      "/poDetails/fullMatch",
      data
    );

    return response.data;
  } catch (error) {
    throw error;
  }
}


export async function getErpComparisonCount() {
  try {
    const response = await api.get<ErpComparisonCountResponse>("/erpComparisonCount");
    return response.data; // { count: number }
  } catch (error) {
    throw error;
  }
}