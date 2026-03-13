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
import { google } from 'googleapis';
import fs from 'fs';

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
  const row = [
    new Date().toISOString(),
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
  ];

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
      creds = JSON.parse(saKey);
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
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
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
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
  console.log('[googleSheets] POST (key) ', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    });
    console.log('[googleSheets] response status', res.status);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[googleSheets] API error', res.status, text);
      throw new Error(`Sheets append failed ${res.status}`);
    }
  } catch (err) {
    console.error('[googleSheets] fetch failed', err);
    throw err;
  }

}

// read all rows (including header) from the configured sheet and return as
// array of string arrays.  Useful for treating the sheet as a rudimentary
// database.  Throws if credentials/ID are missing.
export async function readSheetValues(): Promise<string[][]> {
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
    throw new Error('Google service account key required to read sheet');
  }

  let creds: object;
  try {
    creds = JSON.parse(saKey);
  } catch {
    const fileContent = fs.readFileSync(saKey, 'utf8');
    creds = JSON.parse(fileContent);
  }
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheets = google.sheets({ version: 'v4', auth: client as any });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'A:Z',
  });
  return (res.data.values || []) as string[][];
}
