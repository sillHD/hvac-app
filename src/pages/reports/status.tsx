import React, { useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { Job } from '../../lib/types';
import { getAuthHeaders } from '../../client/lib/authHeaders';
import { useAuth } from '../../client/hooks/useAuth';

type PaymentState = 'paid' | 'partial' | 'pending';
type PaymentFilter = 'all' | 'paid' | 'partial' | 'pending';
type QuoteState = 'approved' | 'pending';
type QuoteFilter = 'all' | 'approved' | 'pending';
type StatusView = 'invoices' | 'quotes';

function getPaymentState(job: Job): PaymentState {
  if (job.status === 'paid') {
    return 'paid';
  }

  if (job.status === 'partial_paid') {
    return 'partial';
  }

  if (typeof job.price === 'number' && job.price > 0) {
    const paidAmount = job.depositAmount ?? 0;
    if (paidAmount > 0 && paidAmount < job.price) {
      return 'partial';
    }
  }

  return 'pending';
}

function getQuoteState(job: Job): QuoteState {
  return job.quoteStatus === 'approved' ? 'approved' : 'pending';
}

export default function ReportStatusPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<StatusView>('invoices');
  const [invoiceFilter, setInvoiceFilter] = useState<PaymentFilter>('all');
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [partialDrafts, setPartialDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        console.error('failed to load report status', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const invoiceJobs = jobs.filter((job) => job.reportType !== 'quote');
  const quoteJobs = jobs.filter((job) => job.reportType === 'quote');
  const canManageInvoices = user?.role === 'admin' || user?.role === 'root';

  const invoiceRows = invoiceJobs.map((job) => ({
    job,
    paymentState: getPaymentState(job),
  }));

  const quoteRows = quoteJobs.map((job) => ({
    job,
    quoteState: getQuoteState(job),
  }));

  const paidCount = invoiceRows.filter((row) => row.paymentState === 'paid').length;
  const partialCount = invoiceRows.filter((row) => row.paymentState === 'partial').length;
  const pendingCount = invoiceRows.filter((row) => row.paymentState === 'pending').length;
  const totalAmount = invoiceRows.reduce((sum, row) => sum + (row.job.price ?? 0), 0);
  const pendingAmount = invoiceRows.reduce((sum, row) => {
    if (row.paymentState === 'paid') return sum;
    if (row.paymentState === 'partial') {
      const price = row.job.price ?? 0;
      const deposit = row.job.depositAmount ?? 0;
      return sum + Math.max(price - deposit, 0);
    }
    return sum + (row.job.price ?? 0);
  }, 0);

  const patchInvoice = async (
    jobId: string,
    patch: Partial<Job>,
    successMessage: string
  ) => {
    setUpdatingId(jobId);
    setNotice(null);
    try {
      const res = await fetch(`/api/reports/${jobId}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: 'error', message: data.error || 'No se pudo actualizar la factura.' });
        return;
      }

      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.report : j)));
      setNotice({ type: 'success', message: successMessage });
    } catch (error) {
      console.error('failed to update invoice status', error);
      setNotice({ type: 'error', message: 'Error al actualizar el estado de la factura.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const markInvoiceAsPaid = async (job: Job) => {
    await patchInvoice(
      job.id,
      {
        status: 'paid',
        depositTaken: true,
        depositAmount: typeof job.price === 'number' ? job.price : job.depositAmount,
      },
      'Factura marcada como pagada.'
    );
  };

  const savePartialPayment = async (job: Job) => {
    const draft = partialDrafts[job.id] ?? '';
    const amount = Number.parseFloat(draft);
    const price = typeof job.price === 'number' ? job.price : 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: 'error', message: 'Ingresa un monto válido para el adelanto.' });
      return;
    }

    if (price <= 0) {
      setNotice({ type: 'error', message: 'La factura no tiene monto total válido.' });
      return;
    }

    const normalizedAmount = Math.min(amount, price);
    const remaining = Math.max(price - normalizedAmount, 0);
    const nextStatus = remaining === 0 ? 'paid' : 'partial_paid';

    await patchInvoice(
      job.id,
      {
        status: nextStatus,
        depositTaken: true,
        depositAmount: normalizedAmount,
      },
      remaining === 0
        ? 'Adelanto completó el total. Factura marcada como pagada.'
        : `Pago parcial guardado. Saldo pendiente: $${remaining.toFixed(2)}`
    );
  };

  const approvedCount = quoteRows.filter((row) => row.quoteState === 'approved').length;
  const pendingQuoteCount = quoteRows.length - approvedCount;
  const quoteAmount = quoteRows.reduce((sum, row) => sum + (row.job.price ?? 0), 0);
  const approvedAmount = quoteRows.reduce((sum, row) => {
    if (row.quoteState !== 'approved') return sum;
    return sum + (row.job.price ?? 0);
  }, 0);

  const visibleInvoiceRows = invoiceRows.filter((row) => {
    if (invoiceFilter === 'all') return true;
    return row.paymentState === invoiceFilter;
  });

  const visibleQuoteRows = quoteRows.filter((row) => {
    if (quoteFilter === 'all') return true;
    return row.quoteState === quoteFilter;
  });

  return (
    <Protected>
      <div className="max-w-5xl mx-auto py-8 px-4 premium-section space-y-6">
        <div className="space-y-3">
          <span className="page-eyebrow">Cobros provisionales</span>
          <h1 className="text-2xl font-bold premium-gradient-text">Estado de reportes</h1>
          <p className="page-subtitle">
            Visualiza por separado el estado de facturas y el estado de cotizaciones.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('invoices')}
            className={`filter-chip ${view === 'invoices' ? 'filter-chip-active' : ''}`}
          >
            Estado de facturas
          </button>
          <button
            type="button"
            onClick={() => setView('quotes')}
            className={`filter-chip ${view === 'quotes' ? 'filter-chip-active' : ''}`}
          >
            Estado de cotizaciones
          </button>
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

        {loading ? (
          <p className="text-zinc-300">Cargando...</p>
        ) : view === 'invoices' && invoiceJobs.length === 0 ? (
          <p className="text-zinc-300">No hay facturas registradas.</p>
        ) : view === 'quotes' && quoteJobs.length === 0 ? (
          <p className="text-zinc-300">No hay cotizaciones registradas.</p>
        ) : (
          <>
            {view === 'invoices' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="stat-card">
                    <p className="stat-label">Pagados</p>
                    <p className="stat-value text-emerald-400">{paidCount}</p>
                    <p className="stat-note">Reportes con cobro resuelto</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Pago parcial</p>
                    <p className="stat-value text-sky-300">{partialCount}</p>
                    <p className="stat-note">Facturas abonadas parcialmente</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Pendientes</p>
                    <p className="stat-value text-orange-400">{pendingCount}</p>
                    <p className="stat-note">Pendientes por confirmar en QuickBooks</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Valor total</p>
                    <p className="stat-value">${totalAmount.toFixed(0)}</p>
                    <p className="stat-note">Valor acumulado de reportes</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Pendiente</p>
                    <p className="stat-value text-orange-400">${pendingAmount.toFixed(0)}</p>
                    <p className="stat-note">Monto provisional por cobrar</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('all')}
                    className={`filter-chip ${invoiceFilter === 'all' ? 'filter-chip-active' : ''}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('paid')}
                    className={`filter-chip ${invoiceFilter === 'paid' ? 'filter-chip-active' : ''}`}
                  >
                    Solo pagados
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('partial')}
                    className={`filter-chip ${invoiceFilter === 'partial' ? 'filter-chip-active' : ''}`}
                  >
                    Pago parcial
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('pending')}
                    className={`filter-chip ${invoiceFilter === 'pending' ? 'filter-chip-active' : ''}`}
                  >
                    Solo pendientes
                  </button>
                </div>

                <ul className="space-y-4">
                  {visibleInvoiceRows.map(({ job, paymentState }) => (
                    // Prioriza nombre/titulo visible y deja el ID como referencia.
                    // Esto evita que el usuario vea el numero como "titulo" principal.
                    <li
                      key={job.id}
                      className={`premium-card p-4 ${
                        paymentState === 'paid'
                          ? 'premium-card-paid'
                          : paymentState === 'partial'
                            ? 'ring-1 ring-sky-500/40 bg-sky-900/15'
                            : 'premium-card-pending'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="status-pill">{job.serviceType || 'Sin tipo'}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ref: {job.id}</span>
                          </div>
                          <p className="font-semibold text-zinc-100">
                            {job.customer.name || job.title || 'Reporte sin nombre'}
                          </p>
                          <p className="text-sm text-zinc-300">{job.serviceAddress}</p>
                        </div>
                        <div className="text-sm text-zinc-200 sm:min-w-[240px]">
                          <p className="mb-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                paymentState === 'paid'
                                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                  : paymentState === 'partial'
                                    ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                                    : 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
                              }`}
                            >
                              {paymentState === 'paid'
                                ? 'Pagado'
                                : paymentState === 'partial'
                                  ? 'Pagado parcialmente'
                                  : 'Pendiente por pagar'}
                            </span>
                          </p>
                          <p>Estatus operativo: {job.status}</p>
                          <p>Téc: {job.technicianName}</p>
                          <p>
                            Monto: ${typeof job.price === 'number' && !isNaN(job.price) ? job.price.toFixed(2) : '0.00'}
                          </p>
                          {paymentState === 'partial' && (
                            <>
                              <p>
                                Adelanto: ${((job.depositAmount ?? 0) as number).toFixed(2)}
                              </p>
                              <p>
                                Debe: ${Math.max((job.price ?? 0) - (job.depositAmount ?? 0), 0).toFixed(2)}
                              </p>
                            </>
                          )}
                          <p>{new Date(job.completedAt).toLocaleDateString()}</p>
                          {canManageInvoices && paymentState !== 'paid' && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={updatingId === job.id}
                                onClick={() => markInvoiceAsPaid(job)}
                                className="px-3 py-1 text-xs rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                              >
                                Marcar pagada
                              </button>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    partialDrafts[job.id] ??
                                    (paymentState === 'partial' && job.depositAmount != null
                                      ? String(job.depositAmount)
                                      : '')
                                  }
                                  onChange={(e) =>
                                    setPartialDrafts((prev) => ({
                                      ...prev,
                                      [job.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Adelanto $"
                                  className="w-28 rounded-full border border-sky-500/30 bg-black/25 px-3 py-1 text-xs text-sky-100"
                                />
                                <button
                                  type="button"
                                  disabled={updatingId === job.id}
                                  onClick={() => savePartialPayment(job)}
                                  className="px-3 py-1 text-xs rounded-full bg-sky-500/15 text-sky-300 hover:bg-sky-500/30 transition-colors disabled:opacity-40"
                                >
                                  Guardar parcial
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="stat-card">
                    <p className="stat-label">Aprobadas</p>
                    <p className="stat-value text-emerald-400">{approvedCount}</p>
                    <p className="stat-note">Cotizaciones en verde</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Pendientes</p>
                    <p className="stat-value text-zinc-300">{pendingQuoteCount}</p>
                    <p className="stat-note">Cotizaciones por confirmar</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Valor total</p>
                    <p className="stat-value">${quoteAmount.toFixed(0)}</p>
                    <p className="stat-note">Valor acumulado de cotizaciones</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">Aprobado</p>
                    <p className="stat-value text-emerald-400">${approvedAmount.toFixed(0)}</p>
                    <p className="stat-note">Monto potencial confirmado</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteFilter('all')}
                    className={`filter-chip ${quoteFilter === 'all' ? 'filter-chip-active' : ''}`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteFilter('approved')}
                    className={`filter-chip ${quoteFilter === 'approved' ? 'filter-chip-active' : ''}`}
                  >
                    Solo aprobadas
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteFilter('pending')}
                    className={`filter-chip ${quoteFilter === 'pending' ? 'filter-chip-active' : ''}`}
                  >
                    Solo pendientes
                  </button>
                </div>

                <ul className="space-y-4">
                  {visibleQuoteRows.map(({ job, quoteState }) => (
                    <li
                      key={job.id}
                      className={`premium-card p-4 ${
                        quoteState === 'approved'
                          ? 'premium-card-paid'
                          : 'ring-1 ring-zinc-500/40 bg-zinc-900/55'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="status-pill">{job.serviceType || 'Sin tipo'}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ref: {job.id}</span>
                          </div>
                          <p className="font-semibold text-zinc-100">
                            {job.customer.name || job.title || 'Reporte sin nombre'}
                          </p>
                          <p className="text-sm text-zinc-300">{job.serviceAddress}</p>
                        </div>
                        <div className="text-sm text-zinc-200 sm:min-w-[240px]">
                          <p className="mb-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                quoteState === 'approved'
                                  ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                                  : 'bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/40'
                              }`}
                            >
                              {quoteState === 'approved' ? 'Aprobada' : 'Pendiente'}
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
          </>
        )}
      </div>
    </Protected>
  );
}
