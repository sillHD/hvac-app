/**
 * Diagnostic endpoint to test the Google Sheets connection.
 * Call GET /api/debug/sheets to see a step-by-step report.
 * Remove or protect this endpoint before going to production.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import fs from 'fs';
import { verifyToken } from '../../../server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow admin users to access this diagnostic endpoint
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = token ? await verifyToken(token) : null;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const results: Record<string, unknown> = {};

  // 1. Check env vars are present (without leaking values)
  const sheetId = process.env.GOOGLE_SHEET_ID || '';
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '';
  const invoiceRange = process.env.GOOGLE_SHEET_INVOICES_APPEND_RANGE || '(default: A1)';

  results.env = {
    GOOGLE_SHEET_ID: sheetId ? `✓ set (${sheetId.slice(0, 8)}…)` : '✗ missing',
    GOOGLE_SERVICE_ACCOUNT_KEY: saKey
      ? `✓ set (${saKey.length} chars)`
      : '✗ missing',
    GOOGLE_SHEET_INVOICES_APPEND_RANGE: invoiceRange,
  };

  if (!sheetId) {
    return res.status(200).json({ ...results, error: 'GOOGLE_SHEET_ID is not set' });
  }
  if (!saKey) {
    return res.status(200).json({ ...results, error: 'GOOGLE_SERVICE_ACCOUNT_KEY is not set' });
  }

  // 2. Try to parse the service account JSON
  let creds: Record<string, unknown>;
  try {
    const parsed = JSON.parse(saKey) as Record<string, unknown>;
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    creds = parsed;
    results.jsonParse = '✓ parsed successfully';
    results.serviceAccountEmail = creds.client_email || '(not found)';
    // Check that the private_key actually has real newlines after replace
    const pk = creds.private_key as string;
    results.privateKeyNewlines = pk?.includes('\n')
      ? `✓ has real newlines (length ${pk.length})`
      : '✗ no newlines — key may be malformed';
  } catch (parseErr) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    // Try as file path as fallback
    try {
      const fileContent = fs.readFileSync(saKey, 'utf8');
      creds = JSON.parse(fileContent) as Record<string, unknown>;
      results.jsonParse = '✓ loaded from file path';
    } catch {
      return res.status(200).json({
        ...results,
        jsonParse: `✗ failed: ${msg}`,
        error: 'Cannot parse GOOGLE_SERVICE_ACCOUNT_KEY',
      });
    }
  }

  // 3. Try to authenticate with Google
  let sheets: ReturnType<typeof google.sheets>;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = await auth.getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheets = google.sheets({ version: 'v4', auth: client as any });
    results.auth = '✓ authenticated';
  } catch (authErr) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    return res.status(200).json({ ...results, auth: `✗ failed: ${msg}`, error: msg });
  }

  // 4. Try to read the sheet metadata
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: 'sheets(properties(title))',
    });
    const titles = (meta.data.sheets || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => s.properties?.title
    );
    results.sheetRead = `✓ spreadsheet accessible`;
    results.sheetTabs = titles;
  } catch (readErr) {
    const msg = readErr instanceof Error ? readErr.message : String(readErr);
    return res.status(200).json({ ...results, sheetRead: `✗ failed: ${msg}`, error: msg });
  }

  // 5. Try to read the header row
  const range = process.env.GOOGLE_SHEET_INVOICES_APPEND_RANGE || 'A1';
  const bangIdx = range.indexOf('!');
  const headerRange = bangIdx >= 0 ? `${range.slice(0, bangIdx)}!A1:Z1` : 'A1:Z1';
  try {
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: headerRange,
    });
    const header = (headerRes.data.values?.[0] || []) as string[];
    results.headerRange = headerRange;
    results.headerRow = header.length ? header : '(empty — no header found)';
  } catch (headerErr) {
    const msg = headerErr instanceof Error ? headerErr.message : String(headerErr);
    results.headerRead = `✗ failed for range ${headerRange}: ${msg}`;
  }

  return res.status(200).json({ ...results, status: 'ok' });
}
