// QuickBooks integration service (server only)
//
// This is a thin wrapper around whatever QuickBooks SDK / HTTP calls are
// required.  It exposes only business‑level operations (createInvoice,
// fetchCustomer, etc.) and keeps API tokens in environment variables.  All
// logs should filter out sensitive fields.
//
// For now the implementation is a mock that returns static values; later you
// can drop in real network code.  Functions are `async` so you can `await` in
// route handlers without changing signatures.

export interface QBInvoice {
  customerId: string;
  amount: number;
  dueDate: string; // ISO date
  notes?: string;
}

export interface QBInvoiceResult {
  id: string;
}

export interface QBCustomer {
  id: string;
  name: string;
  email?: string;
}

// high‑level exported functions ------------------------------------------------
export async function createInvoice(inv: QBInvoice): Promise<QBInvoiceResult> {
  const token = process.env.QUICKBOOKS_TOKEN;
  if (!token) throw new Error('QuickBooks token missing');

  // masked logging
  console.log('[quickbooks] createInvoice', {
    customerId: inv.customerId,
    amount: inv.amount,
    dueDate: inv.dueDate,
  });

  // TODO: perform HTTP request to QuickBooks API using `token`
  return { id: 'mock-invoice-123' };
}

export async function getCustomer(id: string): Promise<QBCustomer | null> {
  const token = process.env.QUICKBOOKS_TOKEN;
  if (!token) throw new Error('QuickBooks token missing');

  console.log('[quickbooks] fetching customer', { id });
  // placeholder
  return { id, name: 'Mock Customer' };
}

// additional helpers (listInvoices, updateInvoice, etc.) would be added here

// internal utilities could live below and not be exported, for example:
// function normalizeError(err: unknown): Error { ... }
