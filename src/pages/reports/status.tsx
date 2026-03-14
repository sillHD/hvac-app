import React, { useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { Job } from '../../lib/types';
import { getAuthHeaders } from '../../client/lib/authHeaders';
import { useAuth } from '../../client/hooks/useAuth';
import { useI18n } from '../../i18n/I18nProvider';

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
  const { t } = useI18n();
  const formatMoney = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && !isNaN(value) ? value : 0;
    return `${amount.toFixed(2)}$`;
  };
  const formatMoneyNoCents = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && !isNaN(value) ? value : 0;
    return `${amount.toFixed(0)}$`;
  };
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
        setNotice({ type: 'error', message: data.error || t('status.updateInvoiceError') });
        return;
      }

      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.report : j)));
      setNotice({ type: 'success', message: successMessage });
    } catch (error) {
      console.error('failed to update invoice status', error);
      setNotice({ type: 'error', message: t('status.updateInvoiceNetworkError') });
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
      t('status.markedPaid')
    );
  };

  const savePartialPayment = async (job: Job) => {
    const draft = partialDrafts[job.id] ?? '';
    const amount = Number.parseFloat(draft);
    const price = typeof job.price === 'number' ? job.price : 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: 'error', message: t('status.partialInvalid') });
      return;
    }

    if (price <= 0) {
      setNotice({ type: 'error', message: t('status.totalInvalid') });
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
        ? t('status.partialCompleted')
        : t('status.partialSaved').replace('${amount}', formatMoney(remaining))
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
      <div className="max-w-[96rem] mx-auto py-8 px-4 premium-section space-y-6">
        <div className="space-y-3">
          <span className="page-eyebrow">{t('status.eyebrow')}</span>
          <h1 className="text-2xl font-bold premium-gradient-text">{t('status.title')}</h1>
          <p className="page-subtitle">
            {t('status.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('invoices')}
            className={`filter-chip ${view === 'invoices' ? 'filter-chip-active' : ''}`}
          >
            {t('status.invoicesView')}
          </button>
          <button
            type="button"
            onClick={() => setView('quotes')}
            className={`filter-chip ${view === 'quotes' ? 'filter-chip-active' : ''}`}
          >
            {t('status.quotesView')}
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
          <p className="text-zinc-300">{t('ui.loading')}</p>
        ) : view === 'invoices' && invoiceJobs.length === 0 ? (
          <p className="text-zinc-300">{t('status.noInvoices')}</p>
        ) : view === 'quotes' && quoteJobs.length === 0 ? (
          <p className="text-zinc-300">{t('status.noQuotes')}</p>
        ) : (
          <>
            {view === 'invoices' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  <div className="stat-card">
                    <p className="stat-label">{t('status.paidStat')}</p>
                    <p className="stat-value text-emerald-400">{paidCount}</p>
                    <p className="stat-note">{t('status.paidStatNote')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.partialStat')}</p>
                    <p className="stat-value text-sky-300">{partialCount}</p>
                    <p className="stat-note">{t('status.partialStatNote')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.pendingStat')}</p>
                    <p className="stat-value text-orange-400">{pendingCount}</p>
                    <p className="stat-note">{t('status.pendingStatNote')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.totalValue')}</p>
                    <p className="stat-value">{formatMoney(totalAmount)}</p>
                    <p className="stat-note">{t('status.totalValueNoteInvoices')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.pendingValue')}</p>
                    <p className="stat-value text-orange-400">{formatMoneyNoCents(pendingAmount)}</p>
                    <p className="stat-note">{t('status.pendingValueNote')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('all')}
                    className={`filter-chip ${invoiceFilter === 'all' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.all')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('paid')}
                    className={`filter-chip ${invoiceFilter === 'paid' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.onlyPaid')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('partial')}
                    className={`filter-chip ${invoiceFilter === 'partial' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.partial')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceFilter('pending')}
                    className={`filter-chip ${invoiceFilter === 'pending' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.onlyPending')}
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
                            <span className="status-pill">{job.serviceType || t('status.noType')}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t('ui.ref')}: {job.id}</span>
                          </div>
                          <p className="font-semibold text-zinc-100">
                            {job.customer.name || job.title || t('status.unnamed')}
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
                                ? t('status.paymentPaid')
                                : paymentState === 'partial'
                                  ? t('status.paymentPartial')
                                  : t('status.paymentPending')}
                            </span>
                          </p>
                          <p>{t('status.operational')}: {job.status}</p>
                          <p>{t('history.tech')}: {job.technicianName}</p>
                          <p>
                            {t('status.amount')}: {formatMoney(job.price)}
                          </p>
                          {paymentState === 'partial' && (
                            <>
                              <p>
                                {t('status.deposit')}: {formatMoney(job.depositAmount ?? 0)}
                              </p>
                              <p>
                                {t('status.due')}: {formatMoney(Math.max((job.price ?? 0) - (job.depositAmount ?? 0), 0))}
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
                                {t('status.markPaid')}
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
                                  placeholder={t('status.partialPlaceholder')}
                                  className="w-28 rounded-full border border-sky-500/30 bg-black/25 px-3 py-1 text-xs text-sky-100"
                                />
                                <button
                                  type="button"
                                  disabled={updatingId === job.id}
                                  onClick={() => savePartialPayment(job)}
                                  className="px-3 py-1 text-xs rounded-full bg-sky-500/15 text-sky-300 hover:bg-sky-500/30 transition-colors disabled:opacity-40"
                                >
                                  {t('status.savePartial')}
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                  <div className="stat-card">
                    <p className="stat-label">{t('status.approvedStat')}</p>
                    <p className="stat-value text-emerald-400">{approvedCount}</p>
                    <p className="stat-note">{t('status.approvedStatNote')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.pendingQuotesStat')}</p>
                    <p className="stat-value text-zinc-300">{pendingQuoteCount}</p>
                    <p className="stat-note">{t('status.pendingQuotesStatNote')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.totalValue')}</p>
                    <p className="stat-value">{formatMoney(quoteAmount)}</p>
                    <p className="stat-note">{t('status.totalQuotesValueNote')}</p>
                  </div>
                  <div className="stat-card">
                    <p className="stat-label">{t('status.approvedValue')}</p>
                    <p className="stat-value text-emerald-400">{formatMoney(approvedAmount)}</p>
                    <p className="stat-note">{t('status.approvedValueNote')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteFilter('all')}
                    className={`filter-chip ${quoteFilter === 'all' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.allF')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteFilter('approved')}
                    className={`filter-chip ${quoteFilter === 'approved' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.onlyApproved')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteFilter('pending')}
                    className={`filter-chip ${quoteFilter === 'pending' ? 'filter-chip-active' : ''}`}
                  >
                    {t('status.onlyPendingF')}
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
                            <span className="status-pill">{job.serviceType || t('status.noType')}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t('ui.ref')}: {job.id}</span>
                          </div>
                          <p className="font-semibold text-zinc-100">
                            {job.customer.name || job.title || t('status.unnamed')}
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
                              {quoteState === 'approved' ? t('status.approved') : t('status.pending')}
                            </span>
                          </p>
                          <p>{t('status.operational')}: {job.status}</p>
                          <p>{t('history.tech')}: {job.technicianName}</p>
                          <p>
                            {t('status.amount')}: {formatMoney(job.price)}
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
