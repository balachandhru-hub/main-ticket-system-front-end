// src/dto/ModelDto.ts

export interface ModelApiResponse {
  id: string;
  modelName: string;
}

export interface ModelNamesResponseDto {
  statusCode?: number;
  message?: string;
  data?: ModelApiResponse[];
}

// This will be used for matching with hardcoded bots
export interface BotCard {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  route: string | null;
  showForSupplier?: boolean;
  modelName?: string; // Add this to match with API response
}