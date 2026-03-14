// Service to append HVAC job records directly to a Google Sheet using the
// Sheets REST API.  The same sheet ID is shared by two different features:
//   * the old `/api/submitForm` route, which originally posted to a Google
//     Form, and
//   * the report history APIs exposed by `src/server/services/jobs`.
//
// In practice you should point `GOOGLE_SHEET_ID` at the spreadsheet used by
// your form; both codepaths will append identical rows (timestamp first, then
// technician/customer/work details) and `listReports` will read the entire
// sheet so history shows whatever the form has already collected.
//
// Rows are written in the exact order currently used by the legacy system:
// Timestamp, Technician, Customer Name, Customer Phone, Service Address, Work
// Type, Work Description, Job Price, Deposit Taken, Deposit Amount.
//
// Credentials (API key / service account token) must live in environment
// variables.  Because this module lives under `src/server/services`, it will
// only run on the server and nothing here will be bundled for the browser.
//
// For now the implementation is a placeholder that logs the payload; later
// swap in real HTTP calls to `https://sheets.googleapis.com/v4/...` and handle
// authentication (OAuth/service account).  The public function returns a
// promise so callers can await success or catch errors.

import { GoogleFormInternal } from '../../lib/googleForm';
import { PaymentSyncStatus } from '../../lib/types';
import { google } from 'googleapis';
import fs from 'fs';

const PAYMENT_SYNC_COLUMNS = [
  'QB Invoice ID',
  'QB Invoice Number',
  'Payment Status',
  'Payment Amount',
  'Payment Date',
  'Last Synced',
];

const HEADER_TIMESTAMP_CANDIDATES = ['Timestamp', 'Marca temporal'];

export interface SheetPaymentSyncPayload {
  paymentStatus: PaymentSyncStatus;
  paymentAmount?: number;
  paymentDate?: string;
  lastSynced?: string;
}

export interface SheetQuickBooksRefs {
  qbInvoiceId?: string;
  qbInvoiceNumber?: string;
  paymentStatus?: PaymentSyncStatus;
  paymentAmount?: number;
  paymentDate?: string;
  lastSynced?: string;
}

function columnNumberToA1(columnNumber: number): string {
  let n = columnNumber;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || 'A';
}

function getTimestampColumnIndex(header: string[]): number {
  const idx = header.findIndex((h) => HEADER_TIMESTAMP_CANDIDATES.includes((h || '').trim()));
  return idx >= 0 ? idx : 0;
}

function normalizePaymentSyncStatus(value: string): PaymentSyncStatus | undefined {
  const upper = (value || '').trim().toUpperCase();
  if (upper === 'PAID') return 'PAID';
  if (upper === 'PARTIAL') return 'PARTIAL';
  if (upper === 'PENDING') return 'PENDING';
  return undefined;
}

async function getServiceAccountSheetsClient(readonly: boolean) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('Google Sheets ID not configured');
  }

  let saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    const defaultPath = './keys/service-account.json';
    if (fs.existsSync(defaultPath)) {
      saKey = defaultPath;
      console.log('[googleSheets] using service account key from', defaultPath);
    }
  }
  if (!saKey) {
    throw new Error('Google service account key required');
  }

  let creds: object;
  try {
    const parsedKey = JSON.parse(saKey) as Record<string, unknown>;
    // Vercel strips literal newlines from env vars; restore them in the private key
    if (typeof parsedKey.private_key === 'string') {
      parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
    }
    creds = parsedKey;
  } catch {
    const fileContent = fs.readFileSync(saKey, 'utf8');
    creds = JSON.parse(fileContent);
  }

  const scopes = readonly
    ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
    : ['https://www.googleapis.com/auth/spreadsheets'];
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes,
  });
  const client = await auth.getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheets = google.sheets({ version: 'v4', auth: client as any });
  return { sheets, sheetId };
}

function getInvoiceAppendRange() {
  return process.env.GOOGLE_SHEET_INVOICES_APPEND_RANGE || 'A1';
}

function getQuoteAppendRangeCandidates() {
  const custom = process.env.GOOGLE_SHEET_QUOTES_APPEND_RANGES;
  if (custom) {
    return custom
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return ['Sheet2!A1', 'Hoja 2!A1', 'Hoja2!A1'];
}

function getQuoteReadRangeCandidates() {
  const custom = process.env.GOOGLE_SHEET_QUOTES_READ_RANGES;
  if (custom) {
    return custom
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }
  return ['Sheet2!A:Z', 'Hoja 2!A:Z', 'Hoja2!A:Z'];
}

function getLegacyAppendRow(data: GoogleFormInternal): string[] {
  return [
    new Date().toISOString(),
    data.reportType || 'invoice',
    data.quoteStatus || '',
    data.createdByEmail || '',
    data.technician,
    data.customerName,
    data.customerEmail || '',
    data.customerPhone,
    data.serviceAddress,
    data.workType,
    data.workDescription,
    String(data.jobPrice),
    data.depositTaken ? 'Yes' : 'No',
    data.depositAmount != null ? String(data.depositAmount) : '',
    '',
    '',
    data.reportType === 'quote' ? '' : 'PENDING',
    data.reportType === 'quote' ? '' : '0',
    '',
    new Date().toISOString(),
  ];
}

function rangeToHeaderRange(range: string): string {
  const bangIndex = range.indexOf('!');
  if (bangIndex >= 0) {
    return `${range.slice(0, bangIndex)}!A1:Z1`;
  }
  return 'A1:Z1';
}

function buildRowFromHeader(header: string[], data: GoogleFormInternal): string[] {
  if (!header.length) return getLegacyAppendRow(data);

  const nowIso = new Date().toISOString();
  return header.map((column) => {
    const name = (column || '').trim();
    switch (name) {
      case 'Marca temporal':
      case 'Timestamp':
        return nowIso;
      case 'Report Type':
        return data.reportType || 'invoice';
      case 'Quote Status':
        return data.quoteStatus || '';
      case 'Created By Email':
        return data.createdByEmail || '';
      case 'Technician Name':
      case 'Technician':
        return data.technician;
      case 'Customer Name':
        return data.customerName;
      case 'Customer Email':
        return data.customerEmail || '';
      case 'Customer Phone':
        return data.customerPhone;
      case 'Service Address':
        return data.serviceAddress;
      case 'Service Type':
      case 'Work Type':
        return data.workType;
      case 'Invoice Description':
      case 'Work Description':
        return data.workDescription;
      case 'Job Price':
        return String(data.jobPrice);
      case 'Deposit Taken':
        return data.depositTaken ? 'Yes' : 'No';
      case 'Deposit Amount':
        return data.depositAmount != null ? String(data.depositAmount) : '';
      case 'QB Invoice ID':
      case 'QB Invoice Number':
      case 'Payment Date':
        return '';
      case 'Payment Status':
        return data.reportType === 'quote' ? '' : 'PENDING';
      case 'Payment Amount':
        return data.reportType === 'quote' ? '' : '0';
      case 'Last Synced':
        return nowIso;
      default:
        return '';
    }
  });
}

async function appendToRanges(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: any,
  sheetId: string,
  data: GoogleFormInternal,
  ranges: string[]
) {
  let lastError: unknown = null;

  for (const range of ranges) {
    try {
      const headerRows = await readRange(sheets, sheetId, rangeToHeaderRange(range)).catch(() => [] as string[][]);
      const row = buildRowFromHeader(headerRows[0] || [], data);
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });
      return;
    } catch (err) {
      lastError = err;
      console.warn('[googleSheets] append failed for range', range, err);
    }
  }

  throw lastError || new Error('No se pudo escribir en ninguna hoja objetivo');
}

async function appendToRangesWithApiKey(
  sheetId: string,
  apiKey: string,
  row: string[],
  ranges: string[]
) {
  let lastError: unknown = null;

  for (const range of ranges) {
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [row] }),
      });
      if (res.ok) {
        return;
      }
      const text = await res.text().catch(() => '');
      lastError = new Error(`Sheets append failed ${res.status} ${text}`);
      console.warn('[googleSheets] API key append failed for range', range, res.status);
    } catch (err) {
      lastError = err;
      console.warn('[googleSheets] API key append error for range', range, err);
    }
  }

  throw lastError || new Error('No se pudo escribir en ninguna hoja objetivo');
}

async function readRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: any,
  sheetId: string,
  range: string
): Promise<string[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  return (res.data.values || []) as string[][];
}

async function readFirstAvailableRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: any,
  sheetId: string,
  ranges: string[]
): Promise<string[][]> {
  let lastError: unknown = null;
  for (const range of ranges) {
    try {
      return await readRange(sheets, sheetId, range);
    } catch (err) {
      lastError = err;
      console.warn('[googleSheets] read failed for range', range, err);
    }
  }
  throw lastError || new Error('No se pudo leer ninguna hoja objetivo');
}

async function ensurePaymentSyncHeaders(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: any,
  sheetId: string,
  sheetTitle: string,
  header: string[]
): Promise<string[]> {
  const nextHeader = [...header];
  let changed = false;

  for (const col of PAYMENT_SYNC_COLUMNS) {
    if (!nextHeader.includes(col)) {
      nextHeader.push(col);
      changed = true;
    }
  }

  if (!changed) return nextHeader;

  const endCol = columnNumberToA1(nextHeader.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetTitle}!A1:${endCol}1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [nextHeader] },
  });

  return nextHeader;
}

async function listSheetTitles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: any,
  sheetId: string
): Promise<string[]> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets(properties(title))',
  });
  return (meta.data.sheets || [])
    .map((s: { properties?: { title?: string } }) => s.properties?.title)
    .filter((v: string | undefined): v is string => !!v && v !== 'Automation Logs');
}

export async function appendToSheet(data: GoogleFormInternal): Promise<void> {
  // for convenience we allow hard‑coded defaults if the env vars are
  // missing; in production you should *never* commit real keys, instead set
  // them in `.env.local` or your hosting platform.
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error('Google Sheets ID not configured');
  }

  // Rows will be appended in this order (timestamp may be filled automatically
  // by the sheet if you configure a formula).
  const row = getLegacyAppendRow(data);

  console.log('[googleSheets] append row', row);

  // Prefer a service account credential supplied via env var.  The value may be
  // either the raw JSON string or the path to a JSON file.  Example for
  // .env.local:
  //
  //   GOOGLE_SERVICE_ACCOUNT_KEY='{ "type": "service_account", ... }'
  //
  // You can also base64‑encode the JSON if your host strips line breaks.
  let saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  // if environment variable is absent, try a conventional path under ./keys
  if (!saKey) {
    const defaultPath = './keys/service-account.json';
    if (fs.existsSync(defaultPath)) {
      saKey = defaultPath;
      console.log('[googleSheets] using service account key from', defaultPath);
    }
  }
  if (saKey) {
    // authenticate with Google APIs client library
    let creds: object;
    try {
      // first assume the variable contains JSON text
      const parsedKey = JSON.parse(saKey) as Record<string, unknown>;
      // Vercel strips literal newlines from env vars; restore them in the private key
      if (typeof parsedKey.private_key === 'string') {
        parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
      }
      creds = parsedKey;
    } catch {
      // if parsing fails treat saKey as a file path and read it
      try {
        const fileContent = fs.readFileSync(saKey, 'utf8');
        creds = JSON.parse(fileContent);
      } catch {
        throw new Error(
          `[googleSheets] failed to load service account key from path: ${saKey}`
        );
      }
    }
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    // client typing is a bit loose; cast to any to satisfy overloads
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sheets = google.sheets({ version: 'v4', auth: client as any });
    const ranges =
      data.reportType === 'quote'
        ? getQuoteAppendRangeCandidates()
        : [getInvoiceAppendRange()];
    await appendToRanges(sheets, sheetId, data, ranges);
    return;
  }

  // fallback to key-based append for quick testing; note that the Sheets API
  // rejects API keys with 401 (see logs) so this path is not suitable for
  // production.  A valid API key must be created in the Cloud console and
  // associated with the Sheets API, but OAuth or a service account is the
  // recommended approach.
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    throw new Error('No authentication credentials provided for Google Sheets');
  }
  console.warn(
    '[googleSheets] using API key fallback; consider configuring a service account'
  );
  const ranges =
    data.reportType === 'quote'
      ? getQuoteAppendRangeCandidates()
      : [getInvoiceAppendRange()];
  try {
    await appendToRangesWithApiKey(sheetId, apiKey, row, ranges);
  } catch (err) {
    console.error('[googleSheets] fetch failed', err);
    throw err;
  }

}

// read all rows (including header) from the configured sheet and return as
// array of string arrays.  Useful for treating the sheet as a rudimentary
// database.  Throws if credentials/ID are missing.
export async function readSheetValues(): Promise<string[][]> {
  const { sheets, sheetId } = await getServiceAccountSheetsClient(true);
  return readRange(sheets, sheetId, 'A:Z');
}

export async function readQuoteSheetValues(): Promise<string[][]> {
  const { sheets, sheetId } = await getServiceAccountSheetsClient(true);
  return readFirstAvailableRange(sheets, sheetId, getQuoteReadRangeCandidates());
}

export async function updateSheetPaymentStatusByReportId(
  reportId: string,
  payload: SheetPaymentSyncPayload
): Promise<boolean> {
  const id = reportId.trim();
  if (!id) return false;

  const { sheets, sheetId } = await getServiceAccountSheetsClient(false);
  const titles = await listSheetTitles(sheets, sheetId);

  for (const title of titles) {
    const rows = await readRange(sheets, sheetId, `${title}!A:Z`).catch(() => [] as string[][]);
    if (!rows.length) continue;

    const firstRow = rows[0] || [];
    const hasHeader = firstRow.includes('Timestamp') || firstRow.includes('Marca temporal');
    if (!hasHeader) continue;

    const header = await ensurePaymentSyncHeaders(sheets, sheetId, title, firstRow);
    const timestampCol = getTimestampColumnIndex(header);
    let foundRowIndex = -1;

    for (let i = 1; i < rows.length; i += 1) {
      const rowId = (rows[i]?.[timestampCol] || '').toString().trim();
      if (rowId === id) {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (foundRowIndex < 0) continue;

    const paymentStatusCol = header.indexOf('Payment Status') + 1;
    const paymentAmountCol = header.indexOf('Payment Amount') + 1;
    const paymentDateCol = header.indexOf('Payment Date') + 1;
    const lastSyncedCol = header.indexOf('Last Synced') + 1;

    const paymentStatus = payload.paymentStatus;
    const paymentAmount =
      payload.paymentAmount !== undefined && Number.isFinite(payload.paymentAmount)
        ? String(payload.paymentAmount)
        : '';
    const paymentDate = payload.paymentDate || '';
    const lastSynced = payload.lastSynced || new Date().toISOString();

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${title}!${columnNumberToA1(paymentStatusCol)}${foundRowIndex}`,
            values: [[paymentStatus]],
          },
          {
            range: `${title}!${columnNumberToA1(paymentAmountCol)}${foundRowIndex}`,
            values: [[paymentAmount]],
          },
          {
            range: `${title}!${columnNumberToA1(paymentDateCol)}${foundRowIndex}`,
            values: [[paymentDate]],
          },
          {
            range: `${title}!${columnNumberToA1(lastSyncedCol)}${foundRowIndex}`,
            values: [[lastSynced]],
          },
        ],
      },
    });

    return true;
  }

  return false;
}

export async function readQuickBooksRefsByReportId(reportId: string): Promise<SheetQuickBooksRefs | null> {
  const id = reportId.trim();
  if (!id) return null;

  const { sheets, sheetId } = await getServiceAccountSheetsClient(true);
  const titles = await listSheetTitles(sheets, sheetId);

  for (const title of titles) {
    const rows = await readRange(sheets, sheetId, `${title}!A:Z`).catch(() => [] as string[][]);
    if (!rows.length) continue;

    const header = rows[0] || [];
    const hasHeader = header.includes('Timestamp') || header.includes('Marca temporal');
    if (!hasHeader) continue;

    const timestampCol = getTimestampColumnIndex(header);
    const qbInvoiceIdCol = header.indexOf('QB Invoice ID');
    const qbInvoiceNumberCol = header.indexOf('QB Invoice Number');
    const paymentStatusCol = header.indexOf('Payment Status');
    const paymentAmountCol = header.indexOf('Payment Amount');
    const paymentDateCol = header.indexOf('Payment Date');
    const lastSyncedCol = header.indexOf('Last Synced');

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const rowId = (row[timestampCol] || '').toString().trim();
      if (rowId !== id) continue;

      const paymentAmountValue = parseFloat((row[paymentAmountCol] || '').toString());
      return {
        qbInvoiceId: qbInvoiceIdCol >= 0 ? (row[qbInvoiceIdCol] || '').toString() : undefined,
        qbInvoiceNumber:
          qbInvoiceNumberCol >= 0 ? (row[qbInvoiceNumberCol] || '').toString() : undefined,
        paymentStatus:
          paymentStatusCol >= 0
            ? normalizePaymentSyncStatus((row[paymentStatusCol] || '').toString())
            : undefined,
        paymentAmount:
          paymentAmountCol >= 0 && Number.isFinite(paymentAmountValue)
            ? paymentAmountValue
            : undefined,
        paymentDate: paymentDateCol >= 0 ? (row[paymentDateCol] || '').toString() : undefined,
        lastSynced: lastSyncedCol >= 0 ? (row[lastSyncedCol] || '').toString() : undefined,
      };
    }
  }

  return null;
}

export async function deleteSheetRowByReportId(reportId: string): Promise<boolean> {
  const id = reportId.trim();
  if (!id) return false;

  const { sheets, sheetId } = await getServiceAccountSheetsClient(false);
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheetsMeta = meta.data.sheets || [];

  for (const sheet of sheetsMeta) {
    const title = sheet.properties?.title;
    const numericSheetId = sheet.properties?.sheetId;
    if (!title || numericSheetId === undefined || numericSheetId === null) continue;

    let rows: string[][] = [];
    try {
      rows = await readRange(sheets, sheetId, `${title}!A:Z`);
    } catch {
      continue;
    }

    if (!rows.length) continue;

    const firstRow = rows[0] || [];
    const hasHeader = (firstRow[0] || '').trim() === 'Timestamp';
    const startIndex = hasHeader ? 1 : 0;

    for (let rowIndex = startIndex; rowIndex < rows.length; rowIndex += 1) {
      const rowId = (rows[rowIndex]?.[0] || '').trim();
      if (rowId !== id) continue;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: numericSheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        },
      });

      return true;
    }
  }

  return false;
}
