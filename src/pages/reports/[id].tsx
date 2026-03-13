import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { Job } from '../../lib/types';

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.report);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <p>Cargando...</p>;
  if (!job) return <p>Trabajo no encontrado.</p>;

  return (
    <Protected>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 premium-section">
        <h1 className="text-2xl font-bold premium-gradient-text">Detalle del trabajo</h1>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">Cliente</h2>
          <p className="text-zinc-200">Nombre: {job.customer.name}</p>
          <p className="text-zinc-200">Teléfono: {job.customer.phone}</p>
          <p className="text-zinc-200">Email: {job.customer.email}</p>
        </section>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">Servicio</h2>
          <p className="text-zinc-200">Dirección: {job.serviceAddress}</p>
          <p className="text-zinc-200">Tipo: {job.serviceType}</p>
          <p className="text-zinc-200">Título: {job.title}</p>
          <p className="text-zinc-200">Descripción factura: {job.invoiceDescription}</p>
        </section>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">Finanzas</h2>
          <p className="text-zinc-200">
            Precio: ${typeof job.price === 'number' && !isNaN(job.price) ? job.price.toFixed(2) : '0.00'}
          </p>
          <p className="text-zinc-200">Términos: {job.paymentTerms}</p>
          <p className="text-zinc-200">
            Depósito tomado: {job.depositTaken ? 'Sí' : 'No'}
            {job.depositTaken && <> - Monto: ${job.depositAmount}</>}
          </p>
          {job.materialsUsed && job.materialsUsed.length > 0 && (
            <p className="text-zinc-200">Materiales: {job.materialsUsed.join(', ')}</p>
          )}
        </section>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">Información adicional</h2>
          <p className="text-zinc-200">Técnico: {job.technicianName}</p>
          <p className="text-zinc-200">Fecha: {new Date(job.completedAt).toLocaleDateString()}</p>
          <p className="text-zinc-200">Estado: {job.status}</p>
        </section>

        {job.logs && job.logs.length > 0 && (
          <section className="premium-card p-4">
            <h2 className="font-semibold mb-2 text-amber-300">Logs</h2>
            <ul className="list-disc pl-5 text-zinc-200">
              {job.logs.map((log, idx) => (
                <li key={idx}>{log}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Protected>
  );
}
