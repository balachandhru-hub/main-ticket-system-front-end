import type { AssetDto } from "./AssetDto";

export interface ProfileResponseDto {
    personName: string;
    email: string;
    domain: string;
    planType: string | null;
    monthlyCreditRemaining: number | null;
    totalCreditRemaining: number | null;
    address: string;
    role: string;
    asset: AssetDto[] | null;
    statusCode?: number;
    mobilePhone?: string;
    monthlyExceededHours?: number;
    aribaUserName?: string;
    aribaPassword?: string;
    orgANId?: string | null;
}