// Shared types used across frontend and backend

export interface JobReport {
  id: string;
  technicianId: string;
  description: string;
  completedAt: string;
}

// technical user who can log into the system
export interface User {
  id: string;
  email: string;
  role: 'technician' | 'admin' | 'root';
  name?: string;
}

// customer information attached to a job
export interface Customer {
  id?: string; // optional once persisted
  name: string;
  phone: string;
  email: string;
}

// invoice log records created when billing occurs
export interface InvoiceLog {
  id: string;
  jobId: string;
  amount: number;
  issuedAt: string; // ISO date
  paid?: boolean;
  provider?: 'quickbooks' | 'manual';
  notes?: string;
}

// full job model capturing all required fields
export interface Job {
  id: string;
  customer: Customer;
  serviceAddress: string;
  serviceType: string;
  title: string;
  invoiceDescription: string;
  price: number;
  paymentTerms: string;
  depositTaken: boolean;
  depositAmount?: number;
  materialsUsed?: string[];
  technicianName: string;
  completedAt: string; // ISO date/time
  photos?: string[]; // urls or base64
  status: 'pending' | 'completed' | 'invoiced' | 'paid' | 'cancelled';
}
