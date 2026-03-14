import React, { useEffect, useState } from 'react';

// Protected dashboard view
import Protected from '../components/Protected';

import { useAuth } from '../client/hooks/useAuth';
import DashboardCard from '../components/DashboardCard';
import { Job } from '../lib/types';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { canManageUsers, canViewLogs } from '../lib/utils/roles';
import { useI18n } from '../i18n/I18nProvider';

export default function DashboardPage() {
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

  // assume Protected wrapper ensures user != null
  const canViewAdminTools = canViewLogs(user?.role);
  const isRoot = canManageUsers(user?.role);

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
        console.error('failed to load dashboard metrics', err);
      }
    }
    load();
  }, []);

  const totalReports = jobs.length;
  const paidReports = jobs.filter((job) => job.status === 'paid').length;
  const activeReports = jobs.filter((job) => job.status !== 'paid' && job.status !== 'cancelled').length;
  const pendingValue = jobs.reduce((sum, job) => {
    if (job.status === 'paid') return sum;
    return sum + (job.price ?? 0);
  }, 0);

  return (
    <Protected>
      <div className="space-y-8 p-5 sm:p-6 premium-section">
        <div className="space-y-3">
          <span className="page-eyebrow">{t('dashboard.eyebrow')}</span>
          <h1 className="text-3xl font-bold premium-gradient-text">{t('dashboard.title')}</h1>
          <p className="page-subtitle">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="stat-card">
            <p className="stat-label">{t('dashboard.totalReports')}</p>
            <p className="stat-value">{totalReports}</p>
            <p className="stat-note">{t('dashboard.totalReportsNote')}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{t('dashboard.active')}</p>
            <p className="stat-value">{activeReports}</p>
            <p className="stat-note">{t('dashboard.activeNote')}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{t('dashboard.paid')}</p>
            <p className="stat-value">{paidReports}</p>
            <p className="stat-note">{t('dashboard.paidNote')}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{t('dashboard.pending')}</p>
            <p className="stat-value">{formatMoneyNoCents(pendingValue)}</p>
            <p className="stat-note">{t('dashboard.pendingNote')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            href="/reports"
            title={t('dashboard.newInvoiceTitle')}
            description={t('dashboard.newInvoiceDesc')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>}
          />

          <DashboardCard
            href="/quotes"
            title={t('dashboard.newQuoteTitle')}
            description={t('dashboard.newQuoteDesc')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
            </svg>}
          />

          <DashboardCard
            href="/history"
            title={t('dashboard.historyTitle')}
            description={t('dashboard.historyDesc')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 8 4-16 3 8h4" />
            </svg>}
          />

          <DashboardCard
            href="/reports/status"
            title={t('dashboard.reportStatusTitle')}
            description={t('dashboard.reportStatusDesc')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h6v6m-3-6v6m3-12H6a2 2 0 00-2 2v4h16V7a2 2 0 00-2-2z" />
            </svg>}
          />

          {canViewAdminTools && (
            <DashboardCard
              href="/logs"
              title={t('dashboard.systemLogsTitle')}
              description={t('dashboard.systemLogsDesc')}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
              </svg>}
            />
          )}

          {isRoot && (
            <DashboardCard
              href="/admin/users"
              title={t('dashboard.usersTitle')}
              description={t('dashboard.usersDesc')}
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V9a2 2 0 00-2-2h-3M9 20H4V9a2 2 0 012-2h3m0 13v-3a3 3 0 013-3h0a3 3 0 013 3v3m-6 0h6M9 7a3 3 0 116 0 3 3 0 01-6 0z" />
              </svg>}
            />
          )}
        </div>
      </div>
    </Protected>
  );
}
