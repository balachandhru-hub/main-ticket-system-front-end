// src/Dto/GetAllModulesDto.ts

export interface GetAllModulesDto {
  id: string;        // Guid
  key: string;
  type: string;
  description: string;
  isActive: boolean;
}
