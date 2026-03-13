import React, { useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { Job } from '../lib/types';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/reports/list');
        if (res.ok) {
          const data = await res.json();
          setJobs(data.reports || []);
        }
      } catch (err) {
        console.error('failed to load jobs', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Protected>
      <div className="max-w-3xl mx-auto py-8 px-4 premium-section">
        <h1 className="text-2xl font-bold mb-6 premium-gradient-text">Historial de trabajos</h1>
        {loading ? (
          <p>Cargando...</p>
        ) : jobs.length === 0 ? (
          <p>No hay trabajos registrados.</p>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id} className="premium-card p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-100">{job.customer.name}</p>
                    <p className="text-sm text-zinc-300">{job.serviceType} - {job.title}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-zinc-200">
                    <p>Téc: {job.technicianName}</p>
                    <p>{new Date(job.completedAt).toLocaleDateString()}</p>
                    <p>
                      Precio: ${
                        typeof job.price === 'number' && !isNaN(job.price)
                          ? job.price.toFixed(2)
                          : '0.00'
                      }
                    </p>
                    <p>Estatus: {job.status}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Protected>
  );
}
