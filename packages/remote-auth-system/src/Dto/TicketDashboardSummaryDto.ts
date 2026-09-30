

export interface TicketDashboardSummaryDto {
  openTickets?: number;   
  approved?: number;      
  inProgress: number;
  resolved: number;
  rejected: number;
  onHold?: number;
}
