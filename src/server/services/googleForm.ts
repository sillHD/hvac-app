// Service responsible for sending HVAC job reports to an existing Google Form.
// The form itself is part of the legacy workflow (Form → Sheets → Apps Script →
// Gemini → QuickBooks) and must not be altered.  The job of this module is to
// translate our internal data shape into exactly the fields expected by that
// form, then POST to the form's action URL.
//
// Placing this logic under `src/server/services` keeps it server‑only (no
// frontend bundle), allows environment variables to hold the form URL/entry
// IDs, and makes changing the underlying persistence (Firebase, DB, etc.) easy
// later by swapping the implementation behind a simple interface.

// service logic; types and helpers live in shared module
import {
  GoogleFormInternal,
  GoogleFormFieldName,
  mapToGoogleFormFields,
} from '../../lib/googleForm';

// In order to submit to the Google Form we need to know the `entry.<id>`
// parameter names for each label.  Those IDs are specific to the form and can
// change if the form is rebuilt, so we configure them via environment
// variables.  The keys in this object are the label names defined above.
const ENTRY_ID_MAP: Record<GoogleFormFieldName, string> = {
  'Report Type': process.env.GF_REPORT_TYPE_ENTRY || 'entry.RPTTYPE',
  Technician: process.env.GF_TECHNICIAN_ENTRY || 'entry.XXXX',
  'Customer Name': process.env.GF_CUSTOMER_NAME_ENTRY || 'entry.YYYY',
  'Customer Email': process.env.GF_CUSTOMER_EMAIL_ENTRY || 'entry.EMAIL',
  'Customer Phone': process.env.GF_CUSTOMER_PHONE_ENTRY || 'entry.ZZZZ',
  'Service Address': process.env.GF_SERVICE_ADDRESS_ENTRY || 'entry.AAAA',
  'Work Type': process.env.GF_WORK_TYPE_ENTRY || 'entry.BBBB',
  'Work Description': process.env.GF_WORK_DESCRIPTION_ENTRY || 'entry.CCCC',
  'Job Price': process.env.GF_JOB_PRICE_ENTRY || 'entry.DDDD',
  'Deposit Taken': process.env.GF_DEPOSIT_TAKEN_ENTRY || 'entry.EEEE',
  'Deposit Amount': process.env.GF_DEPOSIT_AMOUNT_ENTRY || 'entry.FFFF',
};

// send the information to Google Forms.  This method is `async` and throws if
// the POST fails – callers can handle status and update UI state accordingly.
export async function submitToGoogleForm(
  data: GoogleFormInternal
): Promise<void> {
  const actionUrl = process.env.GOOGLE_FORM_ACTION_URL;
  if (!actionUrl) {
    throw new Error('Google form action URL not configured (GOOGLE_FORM_ACTION_URL)');
  }

  const fields = mapToGoogleFormFields(data);
  const formBody = new URLSearchParams();
  (Object.keys(fields) as GoogleFormFieldName[]).forEach((label) => {
    const entryId = ENTRY_ID_MAP[label];
    if (!entryId) {
      // defensive; should never happen if env variables are set correctly
      throw new Error(`No entry ID configured for label ${label}`);
    }
    formBody.append(entryId, fields[label]);
  });

  const res = await fetch(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
  if (!res.ok) {
    // do not log the body (might contain sensitive data from the form)
    throw new Error(`Google Form submission failed: ${res.status}`);
  }
}
