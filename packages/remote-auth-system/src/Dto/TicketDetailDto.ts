// src/Dto/TicketDetailDto.ts

import type { AssetDto } from "./AssetDto";

export interface TicketDetailDto {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  assignedTo: string | null;
  assignedBy: string | null;
  dateCreated: string;
  name: string | null;
  asset: AssetDto[];
  prDetail: [] | null;
  adminDescription : string | null;
}