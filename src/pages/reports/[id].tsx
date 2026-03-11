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
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-bold">Detalle del trabajo</h1>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Cliente</h2>
          <p className="text-black">Nombre: {job.customer.name}</p>
          <p className="text-black">Teléfono: {job.customer.phone}</p>
          <p className="text-black">Email: {job.customer.email}</p>
        </section>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Servicio</h2>
          <p className="text-black">Dirección: {job.serviceAddress}</p>
          <p className="text-black">Tipo: {job.serviceType}</p>
          <p className="text-black">Título: {job.title}</p>
          <p className="text-black">Descripción factura: {job.invoiceDescription}</p>
        </section>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Finanzas</h2>
          <p className="text-black">Precio: ${job.price.toFixed(2)}</p>
          <p className="text-black">Términos: {job.paymentTerms}</p>
          <p className="text-black">
            Depósito tomado: {job.depositTaken ? 'Sí' : 'No'}
            {job.depositTaken && <> - Monto: ${job.depositAmount}</>}
          </p>
          {job.materialsUsed && job.materialsUsed.length > 0 && (
            <p className="text-black">Materiales: {job.materialsUsed.join(', ')}</p>
          )}
        </section>

        <section className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Información adicional</h2>
          <p className="text-black">Técnico: {job.technicianName}</p>
          <p className="text-black">Fecha: {new Date(job.completedAt).toLocaleDateString()}</p>
          <p className="text-black">Estado: {job.status}</p>
        </section>

        {job.logs && job.logs.length > 0 && (
          <section className="border p-4 rounded">
            <h2 className="font-semibold mb-2">Logs</h2>
            <ul className="list-disc pl-5 text-black">
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
