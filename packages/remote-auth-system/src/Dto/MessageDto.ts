// src/Dto/MessageDto.ts

export interface MessageDto {
  type: string;
  dateCreated: string;
  messageId: string;
  assetId?: string;
  message?: string;
  userName: string;
  userId?: string;
}

export interface CreateMessageDto {
  ticketId: string;
  message: string;
}

export interface MessageResponseDto {
  messageId: string;
  success: boolean;
  message?: string;
}

export interface AssetResponseDto {
  assetId: string;
  fileName: string;
  contentType: string;
  uploadedAt: string;
  success: boolean;
}