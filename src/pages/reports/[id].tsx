import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Protected from '../../components/Protected';
import { Job } from '../../lib/types';
import { getAuthHeaders } from '../../client/lib/authHeaders';
import { useAuth } from '../../client/hooks/useAuth';
import { useI18n } from '../../i18n/I18nProvider';

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { user } = useAuth();
  const { t } = useI18n();
  const formatMoney = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && !isNaN(value) ? value : 0;
    return `${amount.toFixed(2)}$`;
  };
  const canManage = (() => {
    if (!user || !job) return false;
    if (user.role === 'admin' || user.role === 'root') return true;
    const isOwner = job.createdByEmail ? job.createdByEmail === user.email : job.technicianName === user.email;
    const editableStatus = job.status === 'draft' || job.status === 'submitted' || job.status === 'processing';
    return user.role === 'technician' && isOwner && editableStatus;
  })();

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

  if (loading) return <p>{t('ui.loading')}</p>;
  if (!job) return <p>{t('detail.notFound')}</p>;

  const handleDelete = async () => {
    if (!confirm(t('detail.deleteConfirm'))) return;
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
            ? t('detail.deletedSheet')
            : t('detail.deleted')
        );
        router.replace('/history');
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: data.error || t('detail.deleteError') });
      }
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: t('detail.deleteNetworkError') });
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
        setNotice({ type: 'success', message: t('detail.updateOk') });
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ type: 'error', message: data.error || t('detail.updateError') });
      }
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', message: t('detail.updateNetworkError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Protected>
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 premium-section">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold premium-gradient-text">{t('detail.title')}</h1>
          {canManage && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                {t('ui.delete')}
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
          <h2 className="font-semibold mb-2 text-amber-300">{t('detail.customer')}</h2>
          <p className="text-zinc-200">{t('detail.name')}: {job.customer.name}</p>
          <p className="text-zinc-200">{t('detail.phone')}: {job.customer.phone}</p>
          <p className="text-zinc-200">Email: {job.customer.email}</p>
        </section>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">{t('detail.service')}</h2>
          <p className="text-zinc-200">{t('detail.address')}: {job.serviceAddress}</p>
          <p className="text-zinc-200">{t('detail.type')}: {job.serviceType}</p>
          <p className="text-zinc-200">{t('detail.titleField')}: {job.title}</p>
          <p className="text-zinc-200">{t('detail.invoiceDescription')}: {job.invoiceDescription}</p>
        </section>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">{t('detail.finance')}</h2>
          <p className="text-zinc-200">
            {t('detail.price')}: {formatMoney(job.price)}
          </p>
          <p className="text-zinc-200">{t('detail.terms')}: {job.paymentTerms}</p>
          <p className="text-zinc-200">
            {t('detail.depositTaken')}: {job.depositTaken ? t('detail.yes') : t('detail.no')}
            {job.depositTaken && <> - {t('detail.amount')}: {formatMoney(job.depositAmount)}</>}
          </p>
          {job.materialsUsed && job.materialsUsed.length > 0 && (
            <p className="text-zinc-200">{t('detail.materials')}: {job.materialsUsed.join(', ')}</p>
          )}
        </section>

        <section className="premium-card p-4">
          <h2 className="font-semibold mb-2 text-amber-300">{t('detail.moreInfo')}</h2>
          <p className="text-zinc-200">{t('detail.tech')}: {job.technicianName}</p>
          <p className="text-zinc-200">{t('detail.date')}: {new Date(job.completedAt).toLocaleDateString()}</p>
          <p className="text-zinc-200">{t('detail.status')}: {job.status}</p>
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
                    {t('detail.markPaid')}
                  </button>
                  <button
                    type="button"
                    disabled={saving || job.status === 'submitted'}
                    onClick={() => handleStatusChange('submitted')}
                    className="px-3 py-1 text-xs rounded-full bg-orange-500/15 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-40"
                  >
                    {t('detail.markPending')}
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
                    {t('detail.approveQuote')}
                  </button>
                  <button
                    type="button"
                    disabled={saving || job.quoteStatus === 'pending'}
                    onClick={() => handleStatusChange('pending')}
                    className="px-3 py-1 text-xs rounded-full bg-zinc-500/15 text-zinc-300 hover:bg-zinc-500/30 transition-colors disabled:opacity-40"
                  >
                    {t('detail.markPending')}
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {job.logs && job.logs.length > 0 && (
          <section className="premium-card p-4">
            <h2 className="font-semibold mb-2 text-amber-300">{t('detail.logs')}</h2>
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
