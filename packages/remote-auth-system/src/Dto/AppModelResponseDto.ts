export interface AppModel {
  id: string;
  name: string;
  description?: string;
  link?: string;
  key?: string;
}

export interface RawAppModelDto {
  id: string;
  name?: string;
  appName?: string;
  description?: string;
  link?: string;
  key?: string;
}

export interface AppModelResponseDto {
  appModels: AppModel[];
}
