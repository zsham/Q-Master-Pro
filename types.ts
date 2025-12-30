
export enum TicketStatus {
  WAITING = 'WAITING',
  CALLING = 'CALLING',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum UserRole {
  FULL_ADMIN = 'FULL_ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  username: string;
  password?: string; // In a real app, this would be hashed
  role: UserRole;
  assignedCounterId?: string;
  voicePreference?: 'MAN' | 'WOMAN';
}

export interface Ticket {
  id: string;
  number: number;
  status: TicketStatus;
  counterId?: string;
  createdAt: number;
  calledAt?: number;
  servedAt?: number;
}

export interface Counter {
  id: string;
  name: string;
  currentTicketId?: string;
  isActive: boolean;
  assignedStaffId?: string;
}

export interface QueueState {
  tickets: Ticket[];
  counters: Counter[];
  users: User[];
  lastNumber: number;
}

export type ViewMode = 'CUSTOMER' | 'ADMIN' | 'KIOSK' | 'MY_PASS';
