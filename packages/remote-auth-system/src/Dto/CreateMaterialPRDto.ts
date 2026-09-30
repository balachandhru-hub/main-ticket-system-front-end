export interface LineItemDto {
  NumberInCollection: number;
  Description: string;
  Quantity: number;
  UOM: string;
  Price: number;
  Currency: string;
  CommodityCode: string;
  Vendor: string;
  Contract: string;
  PurchaseOrg: string;
  GLAccount: string;
  CostCenter: string;
  MaterialCode: string;
  NeedBy: string;
  ShipToPlant?: string;
  BillTo?: string;
  TaxCode?: string;
  DeliveryDate?: string;
}

export interface MaterialPRDto {
  Name?: string;
  UniqueName: string;
  NeedBy: string;
  LineItems: LineItemDto[];
}