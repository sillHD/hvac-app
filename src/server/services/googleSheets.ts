// Service to append HVAC job records directly to a Google Sheet using the
// Sheets REST API.  This bypasses the Form entirely and writes rows to the
// spreadsheet columns in the exact order currently used by the legacy system:
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

export async function appendToSheet(data: GoogleFormInternal): Promise<void> {
  // for convenience we allow hard‑coded defaults if the env vars are
  // missing; in production you should *never* commit real keys, instead set
  // them in `.env.local` or your hosting platform.
  const sheetId =
    process.env.GOOGLE_SHEET_ID ||
    '1DmolGV9JMK146i9g-F8DW31w-xL0JqwZ0z0h73SGyp4';
  const apiKey =
    process.env.GOOGLE_SHEETS_API_KEY ||
    'AIzaSyA4ppDPgOJsonzoG_snR2VpiMjRbmRXPCs';
  if (!sheetId || !apiKey) {
    throw new Error('Google Sheets ID or API key not configured');
  }
  if (!process.env.GOOGLE_SHEET_ID || !process.env.GOOGLE_SHEETS_API_KEY) {
    console.warn(
      '[googleSheets] using embedded default ID/key - set env vars instead!'
    );
  }

  // build row values in exact column order (timestamp will be added by API if
  // using a formula, otherwise include ourselves)
  const row = [
    new Date().toISOString(),
    data.technician,
    data.customerName,
    data.customerPhone,
    data.serviceAddress,
    data.workType,
    data.workDescription,
    String(data.jobPrice),
    data.depositTaken ? 'Yes' : 'No',
    data.depositAmount != null ? String(data.depositAmount) : '',
  ];

  console.log('[googleSheets] append row', row);

  // real Sheets API call using the provided API key
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&key=${apiKey}`;
  console.log('[googleSheets] POST', url);
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
