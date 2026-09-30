// src/Dto/BlockDto.ts
export type PurchaseOrderDto = string; 

export interface GetBlockUnblockRequest {
  index: number;
  limit: number;
  isBlocked: boolean;
  searchTerm?: string;
}

export interface UpdateBlockUnblockQuery {
  isBlocked: boolean;
}

export type UpdateBlockUnblockBody = string[];

export type GetBlockUnblockResponse = string[];

export interface UpdateBlockUnblockResponse {
  statusCode: number;
  message: string;
}