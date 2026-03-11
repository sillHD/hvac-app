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
    <Link href={href} className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition flex flex-col">
      <div className="flex items-center mb-4">
        {icon && <div className="mr-3 text-blue-500">{icon}</div>}
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      {description && <p className="text-gray-600 text-sm flex-1">{description}</p>}
    </Link>
  );
}
