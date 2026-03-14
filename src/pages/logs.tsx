import React, { useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { useAuth } from '../client/hooks/useAuth';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { canViewLogs } from '../lib/utils/roles';
import { useI18n } from '../i18n/I18nProvider';

export default function LogsPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (!user || !canViewLogs(user.role)) {
      setLoadingLogs(false);
      return;
    }

    async function loadLogs() {
      try {
        const res = await fetch('/api/logs', {
          headers: getAuthHeaders(),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setLogs(Array.isArray(data.logs) ? data.logs : []);
        }
      } catch (error) {
        console.error('Failed to load logs', error);
      } finally {
        setLoadingLogs(false);
      }
    }

    loadLogs();
  }, [user]);

  if (loading) {
    return <p className="text-zinc-300 p-4">{t('ui.loading')}</p>;
  }

  if (!user || !canViewLogs(user.role)) {
    return (
      <Protected>
        <div className="premium-card p-4 text-zinc-300">{t('logs.noPermission')}</div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="premium-section p-4 space-y-4">
        <h1 className="text-2xl premium-gradient-text">{t('logs.title')}</h1>
        <p className="text-zinc-300">{t('logs.roleNote')}</p>

        {loadingLogs ? (
          <div className="premium-card p-4 text-zinc-300">{t('logs.loading')}</div>
        ) : logs.length === 0 ? (
          <div className="premium-card p-4 text-zinc-300">{t('logs.empty')}</div>
        ) : (
          <ul className="space-y-3">
            {logs.map((log, index) => (
              <li key={`${index}-${log}`} className="premium-card p-4 text-zinc-200">
                {log}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Protected>
  );
}
