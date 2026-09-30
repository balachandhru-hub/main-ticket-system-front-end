
import type { TicketDto } from '../Dto/TicketDto';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in progress' | 'resolved' | 'closed' | string;
  priority: 'low' | 'medium' | 'high' | 'critical' | string;
  user: string;
  email: string;
  date: string;
  tag: string;
  responses: number;
}


export const transformTicketData = (apiTicket: TicketDto): Ticket => {

  const normalizePriority = (priority: string): 'low' | 'medium' | 'high' | 'critical' | string => {
    const lowercasePriority = priority.toLowerCase();
    if (['low', 'medium', 'high', 'critical'].includes(lowercasePriority)) {
      return lowercasePriority as 'low' | 'medium' | 'high' | 'critical';
    }
    return priority; 
  };


  const normalizeStatus = (status: string): 'open' | 'in progress' | 'resolved' | 'closed' | string => {
    const lowercaseStatus = status.toLowerCase();
    const statusMap: Record<string, string> = {
      'open': 'open',
      'in progress': 'in progress',
      'inprogress': 'in progress',
      'in-progress': 'in progress',
      'resolved': 'resolved',
      'closed': 'closed',
      'pending': 'open', 
    };
    
    return statusMap[lowercaseStatus] || status;
  };

  return {
    id: apiTicket.id, 
    title: apiTicket.title,
    description: apiTicket.description,
    status: normalizeStatus(apiTicket.status),
    priority: normalizePriority(apiTicket.priority),
    user: apiTicket.name || 'Unknown User',
    email: '', 
    date: new Date(apiTicket.dateCreated).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    tag: apiTicket.category,
    responses: 0
  };
};


export const transformTicketsData = (apiTickets: TicketDto[]): Ticket[] => {
  return apiTickets.map((apiTicket: TicketDto) => transformTicketData(apiTicket));
};