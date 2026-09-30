// src/Dto/BotModelResponseDto.ts

export interface BotModel {
  id: string;
  name: string;
}

export interface BotModelResponseDto {
  botModels: BotModel[];
}