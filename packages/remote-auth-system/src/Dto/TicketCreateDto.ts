 import type { AssetNewUploadDto } from "./AssetNewUploadDto";

export interface TicketCreateDto {

  title: string;
  description: string;
  ipAddress: string |null;
  priority: string;
  category: string;
  isExceed: boolean |null;
  asset : AssetNewUploadDto[] | null,
}