import type { AssetUploadDto } from "./AssetUploadDto";
export interface EditTicketDto {
  id: string;
  title: string;
  description: string;
  adminDescription?: string;
  status: string;
  assignedTo: string | null;
  priority: string;
  category:string;
  asset?: AssetUploadDto[];
}