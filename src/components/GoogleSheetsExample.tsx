import { useState } from 'react';
import type { GoogleFormInternal } from '../lib/googleForm';

// simple component demonstrating how to call the spreadsheet-append API and
// track the required status flags.
export default function GoogleSheetsExample() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const sendData = async (data: GoogleFormInternal) => {
    setStatus('sending');
    setError(null);

    try {
      const res = await fetch('/api/submitForm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(`server responded ${res.status}`);
      }

      setStatus('success');
    } catch (e: unknown) {
      console.error('submit failed', e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  };

  // render a button just for demonstration; in real use you'd call sendData
  // from your job form submit handler with the actual values.
  return (
    <div>
      <p>Current status: {status}</p>
      {error && <p className="text-red-600">Error: {error}</p>}
      <button
        onClick={() => {
          const jobPrice = 250;
          const taxes = 6;
          const sample: GoogleFormInternal = {
            technician: 'Diego',
            customerName: 'Acme Co',
            customerEmail: 'contact@acme.example',
            customerPhone: '+1 (555) 123-4567',
            serviceAddress: '123 Elm St, Miami, 33101',
            workType: 'Repair',
            workDescription: 'Fixed leaking unit',
            jobPrice,
            depositTaken: false,
            phone: '+1 (555) 123-4567',
            street: '123 Elm St',
            city: 'Miami',
            zipCode: '33101',
            taxes,
            total: jobPrice + jobPrice * (taxes / 100),
          };
          sendData(sample);
        }}
        disabled={status === 'sending'}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Send sample to Google Form
      </button>
    </div>
  );
}
