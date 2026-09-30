// src/Dto/TicketDto.ts

import type { AssetDto } from "./AssetDto";

export interface TicketDto {
  id: string;
  userId: string;
  title: string;
  description: string;
   adminDescription: string | null;
  status: string;
  category: string;
  priority: string;
  assignedTo: string;
  assignedToName?: string;
  organization?: string;
  assignedBy: string;
  dateCreated: string;
  name: string;
  asset: AssetDto[] | null;
  prDetail: [];
  totalHours?: number;
  email?: string;
  ticketCode?: string;
}

export interface TicketListResponseDto {
  tickets: TicketDto[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
}

export interface TicketFilterParams {
  Index?: number;
  Limit?: number;
  SearchTerm?: string;
  Status?: string;
  Category?: string;
  Priority?: string;
  FromDate?: string;
  ToDate?: string;
}