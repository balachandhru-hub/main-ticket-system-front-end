import axios from "./axiosInstance";

/**
 * Download/Fetch Signed Contract as raw PDF bytes
 * GET /api/v1/ariba/download/{type}/{approver}/{number}
 *
 * @param type - "INVOICE_UPLOAD" or "PR_UPLOAD"
 * @param approver - Approver username
 * @param number - Invoice ID or Requisition ID
 * @returns Base64 string if document exists, null if not found
 */
export const downloadSignedContract = async (
  type: string,
  approver: string,
  number: string
): Promise<string | null> => {
  try {
    const url = `/api/v1/ariba/download/${type}/${approver}/${number}`;

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      withCredentials: true,
    });

    // Convert ArrayBuffer to Base64 string directly
    const uint8Array = new Uint8Array(response.data as ArrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binaryString);

    return base64;

  } catch (error: any) {
    // If document not found (404), return null instead of throwing
    if (error.response?.status === 404) {
      return null;
    }

    return null;
  }
};