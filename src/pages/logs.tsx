import React, { useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { useAuth } from '../client/hooks/useAuth';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { canViewLogs } from '../lib/utils/roles';

export default function LogsPage() {
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
    return <p className="text-zinc-300 p-4">Cargando...</p>;
  }

  if (!user || !canViewLogs(user.role)) {
    return (
      <Protected>
        <div className="premium-card p-4 text-zinc-300">No tienes permisos para ver logs.</div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="premium-section p-4 space-y-4">
        <h1 className="text-2xl premium-gradient-text">Logs</h1>
        <p className="text-zinc-300">Disponible para cuentas con rol admin y root.</p>

        {loadingLogs ? (
          <div className="premium-card p-4 text-zinc-300">Cargando logs...</div>
        ) : logs.length === 0 ? (
          <div className="premium-card p-4 text-zinc-300">No hay logs disponibles por ahora.</div>
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
