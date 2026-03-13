import React from 'react';

// Protected dashboard view
import Protected from '../components/Protected';

import { useAuth } from '../client/hooks/useAuth';
import DashboardCard from '../components/DashboardCard';

export default function DashboardPage() {
  const { user } = useAuth();

  // assume Protected wrapper ensures user != null
  const isAdmin = user?.role === 'admin';

  return (
    <Protected>
      <div className="space-y-6 p-4 premium-section">
        <h1 className="text-3xl font-bold premium-gradient-text">Panel de control</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            href="/reports"
            title="Nuevo reporte"
            description="Crear un trabajo terminado"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>}
          />

          <DashboardCard
            href="/history"
            title="Historial"
            description="Ver trabajos pasados"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 8 4-16 3 8h4" />
            </svg>}
          />

          <DashboardCard
            href="/reports/status"
            title="Estado de reportes"
            description="Revisar reportes enviados"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h6v6m-3-6v6m3-12H6a2 2 0 00-2 2v4h16V7a2 2 0 00-2-2z" />
            </svg>}
          />

          {isAdmin && (
            <DashboardCard
              href="/logs"
              title="Logs de sistema"
              description="(sólo administradores)"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
              </svg>}
            />
          )}
        </div>
      </div>
    </Protected>
  );
}
