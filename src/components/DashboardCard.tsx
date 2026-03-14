/**
 * DashboardCard.tsx — Tarjeta de navegación para el dashboard.
 *
 * Componente básico que renderiza un link estilizado con:
 *  - href: destino del enlace
 *  - title: título principal (en gradiente dorado)
 *  - description: texto secundario opcional
 *  - icon: icono opcional (SVG, emoji, etc.)
 *
 * Usado en dashboard.tsx para accesos rápidos a las funciones principales.
 */
import Link from 'next/link';
import { ReactNode } from 'react';

interface DashboardCardProps {
  href: string;
  title: string;
  description?: string;
  icon?: ReactNode;
}

export default function DashboardCard({ href, title, description, icon }: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="block p-6 premium-card flex flex-col"
    >
      <div className="flex items-center mb-4">
        {icon && <div className="mr-3 icon-gold">{icon}</div>}
        <h2 className="text-xl font-semibold premium-gradient-text">{title}</h2>
      </div>
      {description && <p className="text-zinc-300 text-sm flex-1">{description}</p>}
    </Link>
  );
}
