import React, { useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { Job } from '../../lib/types';

type PaymentState = 'paid' | 'pending';

function getMockPaymentState(job: Job, index: number): PaymentState {
  if (job.status === 'paid') {
    return 'paid';
  }

  if (job.price != null && (job.depositAmount ?? 0) >= job.price) {
    return 'paid';
  }

  // Temporary demo rule until QuickBooks is connected.
  // This keeps the UI useful by showing both states in a deterministic way.
  return index % 2 === 0 ? 'pending' : 'paid';
}

export default function ReportStatusPage() {
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
        console.error('failed to load report status', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const reportRows = jobs.map((job, index) => ({
    job,
    paymentState: getMockPaymentState(job, index),
  }));

  const paidCount = reportRows.filter((row) => row.paymentState === 'paid').length;
  const pendingCount = reportRows.length - paidCount;

  return (
    <Protected>
      <div className="max-w-3xl mx-auto py-8 px-4 premium-section space-y-6">
        <h1 className="text-2xl font-bold premium-gradient-text">Estado de reportes</h1>
        <p className="text-sm text-zinc-300">
          Estado de pago provisional. Por ahora se muestra una clasificacion de prueba;
          mas adelante se alimentara desde QuickBooks.
        </p>
        {loading ? (
          <p className="text-zinc-300">Cargando...</p>
        ) : jobs.length === 0 ? (
          <p className="text-zinc-300">No hay reportes registrados.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="premium-card p-4">
                <p className="text-sm uppercase tracking-wide text-zinc-400">Pagados</p>
                <p className="mt-2 text-3xl font-bold text-emerald-400">{paidCount}</p>
              </div>
              <div className="premium-card p-4">
                <p className="text-sm uppercase tracking-wide text-zinc-400">Pendientes</p>
                <p className="mt-2 text-3xl font-bold text-orange-400">{pendingCount}</p>
              </div>
            </div>

            <ul className="space-y-4">
            {reportRows.map(({ job, paymentState }) => (
              <li key={job.id} className="premium-card p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-100">{job.customer.name}</p>
                    <p className="text-sm text-zinc-300">{job.serviceType || 'Sin tipo'} • {job.serviceAddress}</p>
                  </div>
                  <div className="text-sm text-zinc-200">
                    <p className="mb-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          paymentState === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                            : 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
                        }`}
                      >
                        {paymentState === 'paid' ? 'Pagado' : 'Pendiente por pagar'}
                      </span>
                    </p>
                    <p>Estatus operativo: {job.status}</p>
                    <p>Téc: {job.technicianName}</p>
                    <p>
                      Monto: ${typeof job.price === 'number' && !isNaN(job.price) ? job.price.toFixed(2) : '0.00'}
                    </p>
                    <p>{new Date(job.completedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </li>
            ))}
            </ul>
          </>
        )}
      </div>
    </Protected>
  );
}
