/**
 * types/index.ts — Tipos compartidos entre frontend y backend.
 *
 * Este archivo es el punto único de verdad para las interfaces de dominio.
 * Impórtalo desde cualquier parte del proyecto con:
 *   import type { Job, Customer, JobStatus } from '@/lib/types'
 *
 * Jerarquía de entidades:
 *
 *  User          — Usuario del sistema (técnico, admin, root)
 *  Customer      — Cliente al que se le presta el servicio
 *  Job           — Trabajo / reporte de servicio (invoice o quote)
 *  InvoiceLog    — Registro de facturación asociado a un Job
 *
 * Tipos derivados:
 *  JobStatus           — Ciclo de vida de un Job
 *  ReportType          — 'invoice' | 'quote'
 *  QuoteStatus         — 'approved' | 'pending'
 *  PaymentSyncStatus   — Estado de pago syncónico con QuickBooks
 *
 * NOTA: Estos tipos se usan directamente en las rutas API (Next.js server)
 * y en los componentes de React. Evitar agregar lógica de negocio aquí;
 * mantenerlos solo como definiciones de forma (shape).
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
  technicianName: string;
  completedAt: string; // ISO date/time
  photos?: string[]; // urls or base64
  status: JobStatus;
  logs?: string[]; // operational notes, not sensitive
}
