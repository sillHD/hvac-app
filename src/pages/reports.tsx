import React, { useState } from 'react';
import Protected from '../components/Protected';
import JobForm from '../components/JobForm';
import { useI18n } from '../i18n/I18nProvider';

export default function ReportsPage() {
  const [done, setDone] = useState(false);
  const { t } = useI18n();

  return (
    <Protected>
      <div className="max-w-2xl mx-auto py-8 premium-section px-6">
        <h1 className="text-2xl font-bold mb-4 premium-gradient-text">{t('reports.newInvoice')}</h1>
        {done ? (
          <p className="text-amber-300">{t('reports.invoiceSaved')}</p>
        ) : (
          <JobForm mode="invoice" onSuccess={() => setDone(true)} />
        )}
      </div>
    </Protected>
  );
}
