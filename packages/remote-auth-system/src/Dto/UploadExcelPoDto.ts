import type { ErrorResponseDto } from './ErrorResponseDto';
export interface PoUploadExcelResponseDto {
  totalRows: number;
  successfulUploads: number;
  failedUploads: number;
  errorResponses?: ErrorResponseDto[];
  message?: string;
}