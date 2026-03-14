import React, { useState } from 'react';
import Protected from '../components/Protected';
import JobForm from '../components/JobForm';

export default function QuotesPage() {
  const [done, setDone] = useState(false);

  return (
    <Protected>
      <div className="max-w-2xl mx-auto py-8 premium-section px-6">
        <h1 className="text-2xl font-bold mb-4 premium-gradient-text">Nueva cotizacion</h1>
        {done ? (
          <p className="text-amber-300">Cotizacion guardada correctamente.</p>
        ) : (
          <JobForm mode="quote" onSuccess={() => setDone(true)} />
        )}
      </div>
    </Protected>
  );
}
