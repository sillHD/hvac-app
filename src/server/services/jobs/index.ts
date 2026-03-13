// Job-related persistence/service layer.
// For now we keep an in‑memory store using mock data.  All exported functions
// return Promises and mirror what a real database adapter might look like.  In
// production you would replace implementations with queries to PostgreSQL,
// MongoDB, etc., and make sure the functions run strictly server-side (no
// front-end imports).

import { Job } from '../../../lib/types';
import { mockJobs } from '../../../lib/mocks';

const jobStore: Job[] = [...mockJobs];

import { GoogleFormInternal } from '../../../lib/googleForm';
import { appendToSheet, readSheetValues } from '../googleSheets';

export async function createReport(report: Job) {
  // persist in-memory as before
  jobStore.push(report);

  // if sheets are configured, also append a row
  if (process.env.GOOGLE_SHEET_ID) {
    const payload: GoogleFormInternal = {
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

export async function listReports(userId?: string) {
  // if sheet id present and we prefer it as primary store, read from sheet
  if (process.env.GOOGLE_SHEET_ID) {
    try {
      const rows = await readSheetValues();
      // if the sheet doesn't have a header row (e.g. first append was data),
      // we fall back to a known column order so the mapping still works.
      const expectedHeader = [
        'Timestamp',
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
      ];

      let header = rows[0] || [];
      let dataRows = rows.slice(1);

      if (!header.includes('Timestamp')) {
        // assume first row is actually data; treat the entire sheet as data
        header = expectedHeader;
        dataRows = rows; // don't drop first row
      }

      const reports: Job[] = dataRows.map((r) => {
        const obj: any = {};
        header.forEach((h, i) => (obj[h] = r[i]));
        // convert minimal fields back to Job; many fields may be missing
        return {
          id: obj.Timestamp || `job-${Math.random()}`,
          technicianName: obj.Technician || '',
          customer: {
            name: obj['Customer Name'] || '',
            phone: obj['Customer Phone'] || '',
            email: obj['Customer Email'] || '',
          },
          serviceAddress: obj['Service Address'] || '',
          serviceType: obj['Work Type'] || '',
          title: '',
          invoiceDescription: obj['Work Description'] || '',
          // parseFloat returns NaN for invalid input; convert those to null
          price: (() => {
            const p = parseFloat(obj['Job Price'] || '');
            return isNaN(p) ? null : p;
          })(),
          paymentTerms: '',
          depositTaken: obj['Deposit Taken'] === 'Yes',
          depositAmount: parseFloat(obj['Deposit Amount'] || '0') || undefined,
          materialsUsed: [],
          completedAt: '',
          photos: [],
          status: 'submitted',
        } as Job;
      });
      if (userId) {
        return reports.filter((j) => j.technicianName === userId);
      }
      return reports;
    } catch (err) {
      console.error('[jobs] failed to read from sheet', err);
      // fall back to in-memory
    }
  }

  if (userId) {
    return jobStore.filter((j) => j.technicianName === userId);
  }
  return jobStore;
}

export async function getReport(id: string) {
  return jobStore.find((j) => j.id === id) || null;
}
