// Shared types and helpers for Google Form integration.  These are safe to
// import from both client and server code because they contain no secrets or
// network logic.

export interface GoogleFormInternal {
  technician: string;
  customerName: string;
  customerPhone: string;
  serviceAddress: string;
  workType: string;
  workDescription: string;
  jobPrice: number;
  depositTaken: boolean;
  depositAmount?: number;
}

export type GoogleFormFieldName =
  | 'Technician'
  | 'Customer Name'
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
    Technician: data.technician,
    'Customer Name': data.customerName,
    'Customer Phone': data.customerPhone,
    'Service Address': data.serviceAddress,
    'Work Type': data.workType,
    'Work Description': data.workDescription,
    'Job Price': String(data.jobPrice),
    'Deposit Taken': data.depositTaken ? 'Yes' : 'No',
    'Deposit Amount': data.depositAmount != null ? String(data.depositAmount) : '',
  };
}
