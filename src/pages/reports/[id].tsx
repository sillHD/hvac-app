import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { Job } from '../../lib/types';
import { getAuthHeaders } from '../../client/lib/authHeaders';
import { useAuth } from '../../client/hooks/useAuth';

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'root';

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const res = await fetch(`/api/reports/${id}`, {
          headers: getAuthHeaders(),
        });
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

  const handleDelete = async () => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    setNotice(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        sessionStorage.setItem(
          'historyNotice',
          data.deletedFromSheet
            ? 'Trabajo eliminado y borrado físicamente de Google Sheets.'
            : 'Trabajo eliminado correctamente.'
        );
        router.replace('/history');
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: data.error || 'No se pudo eliminar el registro.' });
      }
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: 'Error al eliminar.' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    const isQuote = job?.reportType === 'quote';
    const patch = isQuote ? { quoteStatus: newStatus } : { status: newStatus };
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        setJob(data.report);
        setNotice({ type: 'success', message: 'Estado actualizado correctamente.' });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: data.error || 'No se pudo actualizar el estado.' });
      }
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: 'Error al actualizar.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Protected>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 premium-section">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold premium-gradient-text">Detalle del trabajo</h1>
          {canManage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>

        {notice && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {notice.message}
          </div>
        )}

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
          {canManage && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {job.reportType !== 'quote' ? (
                <>
                  <button
                    type="button"
                    disabled={saving || job.status === 'paid'}
                    onClick={() => handleStatusChange('paid')}
                    className="px-3 py-1 text-xs rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                  >
                    Marcar pagado
                  </button>
                  <button
                    type="button"
                    disabled={saving || job.status === 'submitted'}
                    onClick={() => handleStatusChange('submitted')}
                    className="px-3 py-1 text-xs rounded-full bg-orange-500/15 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-40"
                  >
                    Marcar pendiente
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={saving || job.quoteStatus === 'approved'}
                    onClick={() => handleStatusChange('approved')}
                    className="px-3 py-1 text-xs rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                  >
                    Aprobar cotización
                  </button>
                  <button
                    type="button"
                    disabled={saving || job.quoteStatus === 'pending'}
                    onClick={() => handleStatusChange('pending')}
                    className="px-3 py-1 text-xs rounded-full bg-zinc-500/15 text-zinc-300 hover:bg-zinc-500/30 transition-colors disabled:opacity-40"
                  >
                    Marcar pendiente
                  </button>
                </>
              )}
            </div>
          )}
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
