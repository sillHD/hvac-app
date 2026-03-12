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
          const sample: GoogleFormInternal = {
            technician: 'Diego',
            customerName: 'Acme Co',
            customerPhone: '555-1234',
            serviceAddress: '123 Elm St',
            workType: 'Repair',
            workDescription: 'Fixed leaking unit',
            jobPrice: 250,
            depositTaken: false,
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
