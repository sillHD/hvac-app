// Shared types and helpers for Google Form integration.  These are safe to
// import from both client and server code because they contain no secrets or
// network logic.

export interface GoogleFormInternal {
  reportType?: 'invoice' | 'quote';
  quoteStatus?: 'approved' | 'pending';
  createdByEmail?: string;
  technician: string;
  customerName: string;
  customerEmail?: string; // optional for legacy form
  customerPhone: string;
  serviceAddress: string;
  workType: string;
  workDescription: string;
  jobPrice: number;
  depositTaken: boolean;
  depositAmount?: number;
  phone: string;
  street: string;
  city: string;
  zipCode: string;
  taxes: number;
  total: number;
}

export type GoogleFormFieldName =
  | 'Report Type'
  | 'Technician'
  | 'Customer Name'
  | 'Customer Email'
  | 'Customer Phone'
  | 'Service Address'
  | 'Work Type'
  | 'Work Description'
  | 'Job Price'
  | 'Deposit Taken'
  | 'Deposit Amount';

export function mapToGoogleFormFields(
  data: GoogleFormInternal
): Record<GoogleFormFieldName, string> {
  return {
    'Report Type': data.reportType || 'invoice',
    Technician: data.technician,
    'Customer Name': data.customerName,
    'Customer Email': data.customerEmail || '',
    'Customer Phone': data.customerPhone,
    'Service Address': data.serviceAddress,
    'Work Type': data.workType,
    'Work Description': data.workDescription,
    'Job Price': String(data.jobPrice),
    'Deposit Taken': data.depositTaken ? 'Yes' : 'No',
    'Deposit Amount': data.depositAmount != null ? String(data.depositAmount) : '',
  };
}
