/**
 * types/index.ts — Tipos compartidos entre frontend y backend.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *   import type { Job, Customer, JobStatus } from '@/lib/types'
 *
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Tipos derivados:
 * Internal implementation detail.
 *  ReportType          — 'invoice' | 'quote'
 *  QuoteStatus         — 'approved' | 'pending'
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */

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
  addresses?: string[]; // service addresses associated with the customer
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

export type JobStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'invoice_created'
  | 'completed'
  | 'partial_paid'
  | 'paid'
  | 'cancelled'
  | 'error';

export type ReportType = 'invoice' | 'quote';
export type QuoteStatus = 'approved' | 'pending';
export type PaymentSyncStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface QuickBooksInvoiceRef {
  qbInvoiceId?: string;
  qbInvoiceNumber?: string;
}

export interface PaymentSyncFields {
  paymentStatus?: PaymentSyncStatus;
  paymentAmount?: number;
  paymentDate?: string;
  lastSynced?: string;
}

// full job model capturing all required fields
export interface Job {
  id: string;
  reportType?: ReportType;
  quoteStatus?: QuoteStatus;
  createdByEmail?: string;
  qbInvoiceId?: string;
  qbInvoiceNumber?: string;
  paymentStatus?: PaymentSyncStatus;
  paymentAmount?: number;
  paymentDate?: string;
  lastSynced?: string;
  customer: Customer;
  serviceAddress: string;
  serviceType: string;
  title: string;
  invoiceDescription: string;
  price: number | null;
  paymentTerms: string;
  depositTaken: boolean;
  depositAmount?: number;
  materialsUsed?: string[];
  technicianId?: string;
  technicianName: string;
  completedAt: string; // ISO date/time
  photos?: string[]; // urls or base64
  status: JobStatus;
  logs?: string[]; // operational notes, not sensitive
}
