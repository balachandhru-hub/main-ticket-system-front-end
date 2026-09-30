import axios from "./axiosInstance";
import type { UploadSignedContractResponseDto } from "../Dto/UploadSignedContractDto";
import type { ErrorResponseDto } from "../Dto/ErrorResponseDto";

export const uploadSignedContract = async (
  approver: string,
  number: string,
  type: string,
  file: File
): Promise<UploadSignedContractResponseDto | ErrorResponseDto> => {
  try {
    const url = `/api/v1/ariba/invoice/upload/${approver}/${number}/${type}`;

    const formData = new FormData();
    formData.append("FileBytes", file);
    formData.append("FileName", file.name);
    formData.append("ContentType", "application/pdf");
    formData.append("EntityType", type);
    formData.append("EntityId", number);
    formData.append("AssetType", "SIGNED_CONTRACT");
    formData.append("IsSingletonAsset", "true");

    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": undefined, // let browser set multipart/form-data
      },
      withCredentials: true,
    });

    // Backend returns string ID, wrap it into your DTO
    return {
      statusCode: 200,
      message: "Upload successful",
      data: response.data, // now `data` contains the uploaded file ID
    } as UploadSignedContractResponseDto;

  } catch (error: any) {
    if (error.response?.data) {
      return error.response.data as ErrorResponseDto;
    }

    return {
      statusCode: 500,
      message: "Something went wrong while uploading",
    };
  }
};
