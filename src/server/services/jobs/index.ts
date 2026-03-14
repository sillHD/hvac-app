// Job-related persistence/service layer.
// For now we keep an in‑memory store using mock data.  All exported functions
// return Promises and mirror what a real database adapter might look like.  In
// production you would replace implementations with queries to PostgreSQL,
// MongoDB, etc., and make sure the functions run strictly server-side (no
// front-end imports).

import { Job, PaymentSyncStatus } from '../../../lib/types';
import { mockJobs } from '../../../lib/mocks';
import { User, canViewAllReports } from '../../auth';

const jobStore: Job[] = [...mockJobs];

import { GoogleFormInternal } from '../../../lib/googleForm';
import {
  appendToSheet,
  deleteSheetRowByReportId,
  updateSheetPaymentStatusByReportId,
  readQuoteSheetValues,
  readSheetValues,
} from '../googleSheets';

function mapRowsToReports(rows: string[][], fallbackType: 'invoice' | 'quote'): Job[] {
  const expectedHeader = [
    'Timestamp',
    'Report Type',
    'Quote Status',
    'Created By Email',
    'Technician',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Service Address',
    'Work Type',
    'Work Description',
    'Job Price',
    'Deposit Taken',
    'Deposit Amount',
    'QB Invoice ID',
    'QB Invoice Number',
    'Payment Status',
    'Payment Amount',
    'Payment Date',
    'Last Synced',
  ];
  const expectedLegacyHeader = [
    'Timestamp',
    'Report Type',
    'Quote Status',
    'Technician',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Service Address',
    'Work Type',
    'Work Description',
    'Job Price',
    'Deposit Taken',
    'Deposit Amount',
    'QB Invoice ID',
    'QB Invoice Number',
    'Payment Status',
    'Payment Amount',
    'Payment Date',
    'Last Synced',
  ];

  let header = rows[0] || [];
  let dataRows = rows.slice(1);

  const hasTimestampHeader = header.some((h) => {
    const value = (h || '').toString().trim().toLowerCase();
    return value === 'timestamp' || value === 'marca temporal';
  });

  if (!hasTimestampHeader) {
    const firstRowLength = rows[0]?.length || 0;
    header = firstRowLength >= expectedHeader.length ? expectedHeader : expectedLegacyHeader;
    dataRows = rows;
  }

  return dataRows.map((r) => {
    const obj: any = {};
    header.forEach((h, i) => (obj[h] = r[i]));

    const timestamp = obj.Timestamp || obj['Marca temporal'] || '';
    const customerName = obj['Customer Name'] || obj['Cliente'] || '';
    const customerPhone = obj['Customer Phone'] || obj['Telefono'] || obj['Teléfono'] || '';
    const customerEmail = obj['Customer Email'] || obj['Email'] || '';
    const serviceAddress = obj['Service Address'] || obj['Dirección de servicio'] || '';
    const serviceType = obj['Service Type'] || obj['Work Type'] || obj['Tipo de servicio'] || '';
    const invoiceDescription = obj['Invoice Description'] || obj['Work Description'] || obj['Descripción'] || '';

    const parsedType = obj['Report Type'] === 'quote' ? 'quote' : 'invoice';
    const reportType = obj['Report Type'] ? parsedType : fallbackType;
    const parsedQuoteStatus = obj['Quote Status'] === 'approved' ? 'approved' : 'pending';
    const parsedPaymentStatus = (() => {
      const status = (obj['Payment Status'] || '').toString().toUpperCase();
      if (status === 'PAID') return 'PAID';
      if (status === 'PARTIAL') return 'PARTIAL';
      if (status === 'PENDING') return 'PENDING';
      return undefined;
    })() as PaymentSyncStatus | undefined;
    const paymentAmount = parseFloat(obj['Payment Amount'] || '');
    const computedStatus =
      parsedPaymentStatus === 'PAID'
        ? 'paid'
        : parsedPaymentStatus === 'PARTIAL'
          ? 'partial_paid'
          : 'submitted';

    return {
      id: timestamp || `job-${Math.random()}`,
      reportType,
      quoteStatus: reportType === 'quote' ? parsedQuoteStatus : undefined,
      createdByEmail: obj['Created By Email'] || undefined,
      qbInvoiceId: obj['QB Invoice ID'] || undefined,
      qbInvoiceNumber: obj['QB Invoice Number'] || undefined,
      paymentStatus: parsedPaymentStatus,
      paymentAmount: Number.isFinite(paymentAmount) ? paymentAmount : undefined,
      paymentDate: obj['Payment Date'] || undefined,
      lastSynced: obj['Last Synced'] || undefined,
      technicianName: obj['Technician Name'] || obj.Technician || '',
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
      serviceAddress,
      serviceType,
      title: '',
      invoiceDescription,
      price: (() => {
        const p = parseFloat(obj['Job Price'] || '');
        return isNaN(p) ? null : p;
      })(),
      paymentTerms: '',
      depositTaken: obj['Deposit Taken'] === 'Yes',
      depositAmount: parseFloat(obj['Deposit Amount'] || '0') || undefined,
      materialsUsed: [],
      completedAt: timestamp,
      photos: [],
      status: computedStatus,
    } as Job;
  });
}

function mapJobToPaymentSync(job: Job): { status: PaymentSyncStatus; amount: number; date: string } {
  const total = typeof job.price === 'number' && Number.isFinite(job.price) ? job.price : 0;
  const partial = typeof job.depositAmount === 'number' && Number.isFinite(job.depositAmount)
    ? Math.max(job.depositAmount, 0)
    : 0;

  if (job.status === 'paid') {
    return {
      status: 'PAID',
      amount: total,
      date: new Date().toISOString(),
    };
  }

  if (job.status === 'partial_paid') {
    return {
      status: 'PARTIAL',
      amount: partial,
      date: new Date().toISOString(),
    };
  }

  return {
    status: 'PENDING',
    amount: 0,
    date: '',
  };
}

export async function createReport(report: Job) {
  // persist in-memory as before
  jobStore.push(report);

  // if sheets are configured, also append a row
  if (process.env.GOOGLE_SHEET_ID) {
    const payload: GoogleFormInternal = {
      reportType: report.reportType || 'invoice',
      quoteStatus: report.quoteStatus,
      createdByEmail: report.createdByEmail,
      technician: report.technicianName,
      customerName: report.customer.name,
      customerEmail: report.customer.email,
      customerPhone: report.customer.phone,
      serviceAddress: report.serviceAddress,
      workType: report.serviceType,
      workDescription: report.invoiceDescription,
      jobPrice: report.price ?? 0,
      depositTaken: report.depositTaken,
      depositAmount: report.depositAmount,
    };
    try {
      await appendToSheet(payload);
    } catch (err) {
      console.error('[jobs] failed to append to sheet', err);
      // swallow so that report creation still succeeds
    }
  }
}

export async function listReports(user?: User | null) {
  // if sheet id present and we prefer it as primary store, read from sheet
  if (process.env.GOOGLE_SHEET_ID) {
    try {
      const invoiceRows = await readSheetValues();
      const quoteRows = await readQuoteSheetValues().catch(() => [] as string[][]);

      const reports = [
        ...mapRowsToReports(invoiceRows, 'invoice'),
        ...mapRowsToReports(quoteRows, 'quote'),
      ];
      if (user && !canViewAllReports(user.role)) {
        return reports.filter((j) => {
          if (j.createdByEmail) return j.createdByEmail === user.email;
          return j.technicianName === user.email;
        });
      }
      return reports;
    } catch (err) {
      console.error('[jobs] failed to read from sheet', err);
      // fall back to in-memory
    }
  }

  if (user && !canViewAllReports(user.role)) {
    return jobStore.filter((j) => {
      if (j.createdByEmail) return j.createdByEmail === user.email;
      return j.technicianName === user.email;
    });
  }
  return jobStore;
}

export async function getReport(id: string) {
  const inMemory = jobStore.find((j) => j.id === id);
  if (inMemory) return inMemory;

  if (process.env.GOOGLE_SHEET_ID) {
    const reports = await listReports();
    return reports.find((j) => j.id === id) || null;
  }

  return null;
}

export async function updateReport(id: string, patch: Partial<Job>) {
  const idx = jobStore.findIndex((j) => j.id === id);
  if (idx < 0) {
    if (!process.env.GOOGLE_SHEET_ID) return null;
    const fromSheets = await listReports();
    const existing = fromSheets.find((j) => j.id === id);
    if (!existing) return null;
    jobStore.push(existing);
    return updateReport(id, patch);
  }

  const current = jobStore[idx];
  const next: Job = {
    ...current,
    ...patch,
    id: current.id,
  };
  jobStore[idx] = next;

  if (process.env.GOOGLE_SHEET_ID && next.reportType !== 'quote') {
    const hasPaymentRelatedPatch =
      patch.status !== undefined ||
      patch.depositAmount !== undefined ||
      patch.paymentStatus !== undefined ||
      patch.paymentAmount !== undefined;

    if (hasPaymentRelatedPatch) {
      const payment = mapJobToPaymentSync(next);
      try {
        await updateSheetPaymentStatusByReportId(next.id, {
          paymentStatus: payment.status,
          paymentAmount: payment.amount,
          paymentDate: payment.date,
          lastSynced: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[jobs] failed to sync payment status to sheet', err);
      }
    }
  }

  return next;
}

export async function deleteReport(id: string): Promise<{ removed: boolean; deletedFromSheet: boolean }> {
  const idx = jobStore.findIndex((j) => j.id === id);
  let removedFromStore = false;
  if (idx >= 0) {
    jobStore.splice(idx, 1);
    removedFromStore = true;
  }

  let removedFromSheet = false;
  if (process.env.GOOGLE_SHEET_ID) {
    try {
      removedFromSheet = await deleteSheetRowByReportId(id);
    } catch (err) {
      console.error('[jobs] failed to delete sheet row', err);
    }
  }

  return {
    removed: removedFromStore || removedFromSheet,
    deletedFromSheet: removedFromSheet,
  };
}
