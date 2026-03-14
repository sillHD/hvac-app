/**
 * JobForm.tsx — Formulario de creación de invoices y quotes.
 *
 * Props:
 *  onSuccess  — Callback al guardar correctamente el reporte
 *  mode       — 'invoice' (factura) | 'quote' (cotización). Default: 'invoice'
 *
 * Características:
 *  - Autocompletado de cliente: al seleccionar un cliente del dropdown, se llenan
 *    nombre, email, teléfono y dirección automáticamente.
 *  - Validación con Zod: los campos requeridos se validan antes de enviar.
 *  - Preview de dinero: los campos precio y depósito muestran el valor
 *    formateado en tiempo real (ej: "Monto actual: 150.00$").
 *  - UX móvil: botón de submit sticky en la parte inferior en pantallas pequeñas.
 *  - Envió: POST /api/reports/create con el token en Authorization.
 *
 * NOTA: El campo technicianName se prerrellena con la info del usuario logueado.
 * Las fotos actualmente son URLs de texto libre (no subida de archivos).
 */
import { useState, useEffect, FormEvent } from 'react';
import { z } from 'zod';
import { Job, Customer } from '../lib/types';
import { mockCustomers } from '../lib/mocks';
import { useAuth } from '../client/hooks/useAuth';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { useI18n } from '../i18n/I18nProvider';

interface JobFormProps {
  onSuccess?: () => void;
  mode?: 'invoice' | 'quote';
}

const emptyJob: Omit<Job, 'id'> = {
  reportType: 'invoice',
  quoteStatus: 'pending',
  customer: { name: '', phone: '', email: '' },
  serviceAddress: '',
  serviceType: '',
  title: '',
  invoiceDescription: '',
  price: 0,
  paymentTerms: '',
  depositTaken: false,
  depositAmount: 0,
  materialsUsed: [],
  technicianName: '',
  completedAt: '',
  photos: [],
  status: 'draft',
};

export default function JobForm({ onSuccess, mode = 'invoice' }: JobFormProps) {
  const isQuoteMode = mode === 'quote';
  const { t } = useI18n();
  const formatMoney = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && !isNaN(value) ? value : 0;
    return `${amount.toFixed(2)}$`;
  };
  const { user } = useAuth();
  const [job, setJob] = useState<Omit<Job, 'id'>>({
    ...emptyJob,
    // default to logged in technician or empty
    technicianName: user?.name || user?.email || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // customers + selection state
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(''); // '' means new customer
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
  };

  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        setJob((j) => ({
          ...j,
          customer: { name: cust.name, phone: cust.phone, email: cust.email },
          serviceAddress: '',
        }));
        setAddressOptions(cust.addresses || []);
      }
    } else {
      setJob((j) => ({
        ...j,
        customer: { name: '', phone: '', email: '' },
      }));
      setAddressOptions([]);
      setAddingAddress(false);
    }
  }, [selectedCustomerId, customers]);

  // technicians list (statically defined for now)
  const technicians = ['Diego', 'Ángel'];
  const serviceTypes = ['Install', 'Repair', 'Maintenance', 'Diagnóstico'];
  const serviceTypeLabel = (value: string) => {
    if (value === 'Install') return 'Install';
    if (value === 'Repair') return 'Repair';
    if (value === 'Maintenance') return 'Maintenance';
    if (value === 'Diagnóstico') return t('form.jobType');
    return value;
  };




  // validation including email and service address logic
  const jobSchema = z.object({
    customer: z.object({
      name: z.string().nonempty(t('form.required')),
      phone: z.string().nonempty(t('form.required')),
      email: z.string().nonempty(t('form.required')).email(t('form.invalidEmail')),
    }),
    serviceAddress: z.string().nonempty(t('form.required')),
    serviceType: z.enum(['Install','Repair','Maintenance','Diagnóstico'] as const),
    invoiceDescription: z.string()
      .min(1, t('form.required'))
      .nonempty(t('form.required')),
    price: z.number().gt(0, t('form.invalidAmount')),
    depositTaken: z.boolean(),
    depositAmount: z.number().nonnegative(t('form.invalidDeposit')),
    technicianName: z.string().nonempty(t('form.required')),
  });
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    try {
      jobSchema.parse(job);
      // additional conditional rule
      if (job.depositTaken && (!job.depositAmount || job.depositAmount <= 0)) {
        throw new Error('depositAmount');
      }
      return {} as Record<string, string>;
    } catch (e: unknown) {
      const formatted: Record<string, string> = {};
      if (e instanceof z.ZodError) {
        e.issues.forEach((err) => {
          if (err.path.length) {
            const key = err.path.join('.');
            formatted[key] = err.message;
          }
        });
      } else if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        (e as { message?: unknown }).message === 'depositAmount'
      ) {
        formatted.depositAmount = t('form.depositRule');
      }
      return formatted;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: string, value: any) => {
    setJob((j) => ({ ...j, [field]: value }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCustomerChange = (field: string, value: any) => {
    if (selectedCustomerId) return; // don't allow editing when selecting existing
    setJob((j) => ({
      ...j,
      customer: { ...j.customer, [field]: value },
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    setSubmitting(true);
    try {
      const payload: Omit<Job, 'id'> = isQuoteMode
        ? {
            ...job,
            reportType: 'quote',
            quoteStatus: job.quoteStatus || 'pending',
            depositTaken: false,
            depositAmount: 0,
          }
        : { ...job, reportType: 'invoice' };

      // if new customer, add to options
      if (!selectedCustomerId) {
        const newCust: Customer = {
          id: `c${Date.now()}`,
          name: job.customer.name,
          phone: job.customer.phone,
          email: job.customer.email,
          addresses: job.serviceAddress ? [job.serviceAddress] : [],
        };
        setCustomers((c) => [...c, newCust]);
        // also mutate global mock so other components see it
        mockCustomers.push(newCust);
      } else {
        // if existing but new address provided, push to that customer
        const cust = customers.find((c) => c.id === selectedCustomerId);
        if (cust && job.serviceAddress && !cust.addresses?.includes(job.serviceAddress)) {
          cust.addresses = [...(cust.addresses || []), job.serviceAddress];
        }
      }

      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onSuccess?.();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t('form.submitError'));
      }
    } catch (err) {
      console.error(err);
      alert(t('form.networkError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-8 pb-28" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <span className="page-eyebrow">{isQuoteMode ? t('form.eyebrowQuote') : t('form.eyebrowInvoice')}</span>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold premium-gradient-text">
            {isQuoteMode ? t('form.titleQuote') : t('form.titleInvoice')}
          </h2>
          <p className="page-subtitle">
            {t('form.subtitle')}
          </p>
        </div>
      </div>

      {/* choose existing customer or new */}
      <fieldset className="panel-fieldset">
        <legend className="font-semibold text-amber-300">{t('form.customer')}</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.registeredCustomer')}</label>
            <p className="field-note mt-1">{t('form.customerHelp')}</p>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">{t('form.newCustomerOption')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      {/* simplified customer section */}
      <fieldset className="panel-fieldset">
        <legend className="font-semibold text-amber-300">{t('form.technician')}</legend>
        <div>
          <p className="field-note mb-2">{t('form.technicianHelp')}</p>
          <select
            value={job.technicianName}
            onChange={(e) => handleChange('technicianName', e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">{t('form.selectOption')}</option>
            {technicians.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.technicianName && <p className="text-red-600 text-sm">{errors.technicianName}</p>}
        </div>
      </fieldset>

      {/* simplified customer section */}
      <fieldset className="panel-fieldset">
        <legend className="font-semibold text-amber-300">{t('form.customerData')}</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.name')}</label>
            <input
              type="text"
              value={job.customer.name}
              onChange={(e) => handleCustomerChange('name', e.target.value)}
              readOnly={!!selectedCustomerId}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors['customer.name'] && <p className="text-red-600 text-sm">{errors['customer.name']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">Email</label>
            <input
              type="email"
              value={job.customer.email}
              onChange={(e) => handleCustomerChange('email', e.target.value)}
              readOnly={!!selectedCustomerId}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors['customer.email'] && <p className="text-red-600 text-sm">{errors['customer.email']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.phone')}</label>
            <input
              type="tel"
              value={job.customer.phone}
              onChange={(e) => handleCustomerChange('phone', e.target.value)}
              readOnly={!!selectedCustomerId}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors['customer.phone'] && <p className="text-red-600 text-sm">{errors['customer.phone']}</p>}
          </div>
        </div>
      </fieldset>

      {/* Service details */}
      <fieldset className="panel-fieldset">
        <legend className="font-semibold text-amber-300">{t('form.jobDetails')}</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.address')}</label>
            <p className="field-note mt-1">{t('form.addressHelp')}</p>
            {addressOptions.length > 0 ? (
              <>
                <select
                  value={addingAddress ? '__other__' : job.serviceAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__other__') {
                      setAddingAddress(true);
                      setJob((j) => ({ ...j, serviceAddress: '' }));
                    } else {
                      setAddingAddress(false);
                      setJob((j) => ({ ...j, serviceAddress: val }));
                    }
                  }}
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="">{t('form.selectOption')}</option>
                  {addressOptions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  <option value="__other__">{t('form.other')}</option>
                </select>
                {addingAddress && (
                  <input
                    type="text"
                    value={job.serviceAddress}
                    onChange={(e) => handleChange('serviceAddress', e.target.value)}
                    placeholder={t('form.newAddressPlaceholder')}
                    className="mt-1 block w-full border rounded p-2"
                  />
                )}
              </>
            ) : (
              <input
                type="text"
                value={job.serviceAddress}
                onChange={(e) => handleChange('serviceAddress', e.target.value)}
                className="mt-1 block w-full border rounded p-2"
              />
            )}
            {errors.serviceAddress && <p className="text-red-600 text-sm">{errors.serviceAddress}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.jobType')}</label>
            <select
              value={job.serviceType}
              onChange={(e) => handleChange('serviceType', e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">{t('form.selectOption')}</option>
              {serviceTypes.map((t) => (
                <option key={t} value={t}>
                  {serviceTypeLabel(t)}
                </option>
              ))}
            </select>
            {errors.serviceType && <p className="text-red-600 text-sm">{errors.serviceType}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.jobDescription')}</label>
            <textarea
              value={job.invoiceDescription}
              onChange={(e) => handleChange('invoiceDescription', e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.invoiceDescription && <p className="text-red-600 text-sm">{errors.invoiceDescription}</p>}
          </div>
        </div>
      </fieldset>

      {/* Financial */}
      <fieldset className="panel-fieldset">
        <legend className="font-semibold text-amber-300">{t('form.finance')}</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">{t('form.price')}</label>
            <p className="field-note mt-1">{t('form.priceHelp')}</p>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={job.price ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange('price', value === '' ? null : parseFloat(value));
              }}
              className="mt-1 block w-full border rounded p-3 text-base"
            />
            <p className="field-note mt-1">{t('form.currentAmount')}: {formatMoney(job.price)}</p>
            {errors.price && <p className="text-red-600 text-sm">{errors.price}</p>}
          </div>
          {!isQuoteMode && (
            <>
              <div className="flex items-center">
                <input
                  id="depositTaken"
                  type="checkbox"
                  checked={job.depositTaken}
                  onChange={(e) => handleChange('depositTaken', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="depositTaken" className="text-sm text-zinc-100">
                  {t('form.depositTaken')}
                </label>
              </div>
              {job.depositTaken && (
                <div>
                  <label className="block text-sm font-medium text-zinc-100">{t('form.depositAmount')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={job.depositAmount}
                    onChange={(e) => handleChange('depositAmount', parseFloat(e.target.value))}
                    className="mt-1 block w-full border rounded p-3 text-base"
                  />
                  <p className="field-note mt-1">{t('form.currentAmount')}: {formatMoney(job.depositAmount)}</p>
                  {errors.depositAmount && <p className="text-red-600 text-sm">{errors.depositAmount}</p>}
                </div>
              )}
            </>
          )}
          {isQuoteMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-100">{t('status.quotesView')}</label>
              <select
                value={job.quoteStatus || 'pending'}
                onChange={(e) => handleChange('quoteStatus', e.target.value)}
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="pending">{t('status.pending')}</option>
                <option value="approved">{t('status.approved')}</option>
              </select>
            </div>
          )}
        </div>
      </fieldset>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-500/20 bg-[#171717]/95 backdrop-blur px-4 py-3 sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary py-4 text-base disabled:opacity-50 shadow-[0_12px_28px_rgba(202,155,42,0.18)]"
        >
          {submitting ? t('form.submitting') : isQuoteMode ? t('form.submitQuote') : t('form.submitInvoice')}
        </button>
      </div>
    </form>
  );
}
