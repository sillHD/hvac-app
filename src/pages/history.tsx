import React, { useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { Job } from '../lib/types';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { useAuth } from '../client/hooks/useAuth';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'root';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/reports/list', {
          headers: getAuthHeaders(),
        });
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const message = sessionStorage.getItem('historyNotice');
    if (!message) return;
    sessionStorage.removeItem('historyNotice');
    setNotice({ type: 'success', message });
  }, []);

  const totalValue = jobs.reduce((sum, job) => sum + (job.price ?? 0), 0);
  const paidCount = jobs.filter((job) => job.status === 'paid').length;

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    setNotice(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setJobs((prev) => prev.filter((j) => j.id !== id));
        setNotice({
          type: 'success',
          message: data.deletedFromSheet
            ? 'Trabajo eliminado y borrado físicamente de Google Sheets.'
            : 'Trabajo eliminado correctamente.',
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: data.error || 'No se pudo eliminar el registro.' });
      }
    } catch (err) {
      console.error('delete failed', err);
      setNotice({ type: 'error', message: 'Error al eliminar.' });
    }
  };

  return (
    <Protected>
      <div className="max-w-4xl mx-auto py-8 px-4 premium-section space-y-6">
        <div className="space-y-3">
          <span className="page-eyebrow">Archivo operativo</span>
          <h1 className="text-2xl font-bold premium-gradient-text">Historial de trabajos</h1>
          <p className="page-subtitle">
            Revisa reportes anteriores, montos registrados y seguimiento operativo en una sola vista.
          </p>
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

        {!loading && jobs.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <p className="stat-label">Reportes</p>
              <p className="stat-value">{jobs.length}</p>
              <p className="stat-note">Trabajos almacenados</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Pagados</p>
              <p className="stat-value">{paidCount}</p>
              <p className="stat-note">Reportes con estado liquidado</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Valor total</p>
              <p className="stat-value">${totalValue.toFixed(0)}</p>
              <p className="stat-note">Suma provisional de precios</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-300">Cargando...</p>
        ) : jobs.length === 0 ? (
          <p className="text-zinc-300">No hay trabajos registrados.</p>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id} className="premium-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                  <div>
                    <span className="status-pill mb-3">
                      {job.status === 'paid' ? 'Pagado' : job.status}
                    </span>
                    <p className="font-semibold text-zinc-100">{job.customer.name}</p>
                    <p className="text-sm text-zinc-300">{job.serviceType} - {job.title}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-zinc-200">
                    <p>
                      Tipo:{' '}
                      {job.reportType === 'quote' || job.quoteStatus ? 'Cotizacion' : 'Factura'}
                    </p>
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
                    {canManage && (
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`/reports/${job.id}`}
                          className="px-3 py-1 text-xs rounded-full bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 transition-colors"
                        >
                          Editar
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(job.id)}
                          className="px-3 py-1 text-xs rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
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
