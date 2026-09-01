/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *  - Support development without a real backend
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 */
import { User, Job, Customer } from './types';

// Fictitious technicians
export const mockUsers: User[] = [
  { id: 'u0', email: 'ismaelcorra@gmail.com', role: 'root', name: 'Ismael Corra' },
];

// Fake customers
export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'John Doe',
    phone: '555-0101',
    email: 'johndoe@example.com',
    addresses: ['123 Elm Street, Springfield, IL', '321 Pine Rd, Springfield, IL'],
  },
  {
    id: 'c2',
    name: 'Mary Roe',
    phone: '555-0202',
    email: 'maryroe@example.com',
    addresses: ['456 Oak Avenue, Shelbyville, TN'],
  },
];

// Example jobs
export const mockJobs: Job[] = [
  {
    id: 'job1',
    customer: mockCustomers[0],
    serviceAddress: '123 Elm Street, Springfield, IL',
    serviceType: 'Routine Maintenance',
    title: 'AC Tune-up',
    invoiceDescription: 'Performed system check and cleaned filters',
    price: 150,
    paymentTerms: 'Due on completion',
    depositTaken: false,
    technicianName: mockUsers[0].name || mockUsers[0].email,
    completedAt: new Date('2026-03-01T10:30:00').toISOString(),
    photos: [],
    status: 'completed',
    logs: [
      'Checked thermostat and set to 72°F',
      'Replaced air filter with new 16x25x1 filter',
    ],
  },
  {
    id: 'job2',
    customer: mockCustomers[1],
    serviceAddress: '456 Oak Avenue, Shelbyville, TN',
    serviceType: 'Repair',
    title: 'Compressor Replacement',
    invoiceDescription: 'Replaced faulty compressor and tested system',
    price: 850,
    paymentTerms: '50% upfront, remainder due in 30 days',
    depositTaken: true,
    depositAmount: 425,
    materialsUsed: ['Compressor Model X200', 'Refrigerant R-410A'],
    technicianName: mockUsers[0].name || mockUsers[0].email,
    completedAt: new Date('2026-03-05T14:15:00').toISOString(),
    photos: ['https://placehold.co/200x200'],
    status: 'invoice_created',
    logs: [
      'Identified leaky gasket on compressor',
      'Installed new compressor, charged with 5lb refrigerant',
    ],
  },
];
