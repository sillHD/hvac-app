import React, { useState } from 'react';
import Protected from '../components/Protected';
import JobForm from '../components/JobForm';

export default function ReportsPage() {
  const [done, setDone] = useState(false);

  return (
    <Protected>
      <div className="max-w-2xl mx-auto py-8 premium-section px-6">
        <h1 className="text-2xl font-bold mb-4 premium-gradient-text">Nuevo reporte de trabajo</h1>
        {done ? (
          <p className="text-amber-300">Reporte enviado correctamente.</p>
        ) : (
          <JobForm onSuccess={() => setDone(true)} />
        )}
      </div>
    </Protected>
  );
}
