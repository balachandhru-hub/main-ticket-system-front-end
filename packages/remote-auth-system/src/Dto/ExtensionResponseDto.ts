// src/Dto/ExtensionResponseDto.ts
export interface ExtensionResponseDto {
  statusCode: number;
  message: string;
  description: string;
  id: string;
  fileBytes?: string; 
  fileName?: string;
  contentType?: string;
}