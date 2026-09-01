/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *    'draft', 'submitted', or 'processing'
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *                    en api/reports/[id].ts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { Job } from '../lib/types';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { useAuth } from '../client/hooks/useAuth';
import { useI18n } from '../i18n/I18nProvider';

const TAX_RATE = 6;

export default function HistoryPage() {
  const { t } = useI18n();
  const formatMoney = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && !isNaN(value) ? value : 0;
    return `$${amount.toFixed(2)}`;
  };
  const formatWithTax = (value: number | null | undefined) => {
    const base = typeof value === 'number' && !isNaN(value) ? value : 0;
    return `$${(base * (1 + TAX_RATE / 100)).toFixed(2)}`;
  };
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { user } = useAuth();
  const canManage = (job: Job) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'root') return true;
    const isOwner = job.createdByEmail ? job.createdByEmail === user.email : job.technicianName === user.email;
    const editableStatus = job.status === 'draft' || job.status === 'submitted' || job.status === 'processing';
    return user.role === 'technician' && isOwner && editableStatus;
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

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
    if (!confirm(t('history.deleteConfirm'))) return;
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
            ? t('history.deletedSheet')
            : t('history.deleted'),
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: data.error || t('history.deleteError') });
      }
    } catch (err) {
      console.error('delete failed', err);
      setNotice({ type: 'error', message: t('history.networkDeleteError') });
    }
  };

  return (
    <Protected>
      <div className="max-w-4xl mx-auto py-8 px-4 premium-section space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="page-eyebrow">{t('history.eyebrow')}</span>
            <h1 className="text-2xl font-bold premium-gradient-text">{t('history.title')}</h1>
            <p className="page-subtitle">
              {t('history.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={loadJobs}
            disabled={loading}
            className="shrink-0 mt-1 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? t('ui.loading') : t('history.refresh')}
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

        {!loading && jobs.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <p className="stat-label">{t('history.reports')}</p>
              <p className="stat-value">{jobs.length}</p>
              <p className="stat-note">{t('history.reportsNote')}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">{t('history.paid')}</p>
              <p className="stat-value">{paidCount}</p>
              <p className="stat-note">{t('history.paidNote')}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">{t('history.totalValue')}</p>
              <p className="stat-value">{formatMoney(totalValue)}</p>
              <p className="stat-note">{t('history.totalValueNote')}</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-300">{t('ui.loading')}</p>
        ) : jobs.length === 0 ? (
          <p className="text-zinc-300">{t('history.noJobs')}</p>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id} className="premium-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                  <div>
                    <span className="status-pill mb-3">
                      {job.status === 'paid' ? t('history.paidPill') : job.status}
                    </span>
                    <p className="font-semibold text-zinc-100">{job.customer.name}</p>
                    <p className="text-sm text-zinc-300">{job.serviceType} - {job.title}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-zinc-200">
                    <p>
                      {t('history.type')}:{' '}
                      {job.reportType === 'quote' || job.quoteStatus ? t('history.quote') : t('history.invoice')}
                    </p>
                    <p>{t('history.tech')}: {job.technicianName}</p>
                    <p>{formatDate(job.completedAt)}</p>
                    <p>
                      {t('history.price')}: {formatMoney(job.price)}
                      {' '}&#8226;{' '}
                      {t('history.total')}: {formatWithTax(job.price)}
                    </p>
                    <p>{t('history.status')}: {job.status}</p>
                    {canManage(job) && (
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`/reports/${job.id}`}
                          className="px-3 py-1 text-xs rounded-full bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 transition-colors"
                        >
                          {t('ui.edit')}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(job.id)}
                          className="px-3 py-1 text-xs rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          {t('ui.delete')}
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
