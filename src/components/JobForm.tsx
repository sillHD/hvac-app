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
import { formatUsPhoneWithCountry, isValidUsPhone } from '../lib/utils/phone';

interface JobFormProps {
  onSuccess?: () => void;
  mode?: 'invoice' | 'quote';
}

interface TechnicianOption {
  id: string;
  name: string;
  email: string;
}

type JobFormState = Omit<Job, 'id'> & {
  phone: string;
  street: string;
  city: string;
  zipCode: string;
  taxes: string;
};

const jobSchema = z.object({
  reportType: z.enum(['invoice', 'quote']).optional(),
  quoteStatus: z.enum(['approved', 'pending']).optional(),
  customer: z.object({
    name: z.string().min(1, 'Required'),
    phone: z.string().min(1, 'Required'),
    email: z.string().email('Invalid email'),
  }),
  serviceAddress: z.string().min(1, 'Required'),
  serviceType: z.string().min(1, 'Required'),
  title: z.string().optional(),
  invoiceDescription: z.string().min(1, 'Required'),
  price: z.number().nullable(),
  paymentTerms: z.string().optional(),
  depositTaken: z.boolean(),
  depositAmount: z.number().optional(),
  materialsUsed: z.array(z.string()).optional(),
  technicianId: z.string().optional(),
  technicianName: z.string().min(1, 'Required'),
  completedAt: z.string().optional(),
  photos: z.array(z.string()).optional(),
  status: z.enum([
    'draft',
    'submitted',
    'processing',
    'invoice_created',
    'completed',
    'partial_paid',
    'paid',
    'cancelled',
    'error',
  ]),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  taxes: z.string().optional(),
});

const initialForm: JobFormState = {
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
  phone: '+1 ',
  street: '',
  city: '',
  zipCode: '',
  taxes: '6',
};

function composeServiceAddress(street: string, city: string, zipCode: string): string {
  return [street.trim(), city.trim(), zipCode.trim()].filter(Boolean).join(', ');
}

function splitServiceAddress(address: string): { street: string; city: string; zipCode: string } {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return {
    street: parts[0] || '',
    city: parts[1] || '',
    zipCode: parts[2] || '',
  };
}

export default function JobForm({ onSuccess, mode = 'invoice' }: JobFormProps) {
  const isQuoteMode = mode === 'quote';
  const { t } = useI18n();
  const formatMoney = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const formatCurrencyInput = (value: number | null | undefined) => {
    const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const parseCurrencyInput = (raw: string): number | null => {
    const normalized = raw.replace(/[^\d.]/g, '');
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const { user } = useAuth();
  const [job, setJob] = useState<JobFormState>({
    ...initialForm,
    // default to logged in technician or empty
    technicianId: user?.id,
    technicianName: user?.name || user?.email || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);

  // customers + selection state
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(''); // '' means new customer
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);

  const basePrice = typeof job.price === 'number' && Number.isFinite(job.price) ? job.price : 0;
  const taxesPercent = (() => {
    const parsed = Number.parseFloat(job.taxes || '0');
    return Number.isFinite(parsed) ? parsed : 0;
  })();
  const taxesAmount = basePrice * (taxesPercent / 100);
  const finalPrice = basePrice + taxesAmount;

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

  useEffect(() => {
    let isCancelled = false;

    async function loadTechnicians() {
      try {
        const res = await fetch('/api/users/technicians', {
          headers: getAuthHeaders(),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.technicians)) {
          return;
        }

        if (!isCancelled) {
          setTechnicians(data.technicians as TechnicianOption[]);
        }
      } catch {
        // Keep the fallback to current user below if this request fails.
      }
    }

    loadTechnicians();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const defaultTechnicianName = user?.name || user?.email || '';
    if (!defaultTechnicianName) return;

    setTechnicians((current) => {
      if (current.some((tech) => tech.name === defaultTechnicianName)) {
        return current;
      }
      return [
        ...current,
        {
          id: user?.id || `self-${user?.email || 'unknown'}`,
          name: defaultTechnicianName,
          email: user?.email || '',
        },
      ];
    });

    setJob((current) =>
      current.technicianName
        ? current
        : {
            ...current,
            technicianId: user?.id,
            technicianName: defaultTechnicianName,
          }
    );
  }, [user?.id, user?.name, user?.email]);

  useEffect(() => {
    if (job.technicianId || !job.technicianName || technicians.length === 0) return;

    const match = technicians.find((tech) => tech.name === job.technicianName);
    if (!match) return;

    setJob((current) => ({
      ...current,
      technicianId: match.id,
      technicianName: match.name,
    }));
  }, [job.technicianId, job.technicianName, technicians]);

  const serviceTypes = ['Install', 'Repair', 'Maintenance', 'Diagnóstico'];
  const serviceTypeLabel = (value: string) => {
    if (value === 'Install') return 'Install';
    if (value === 'Repair') return 'Repair';
    if (value === 'Maintenance') return 'Maintenance';
    if (value === 'Diagnóstico') return t('form.jobType');
    return value;
  };

  const validate = () => {
    try {
      const combinedAddress = composeServiceAddress(job.street, job.city, job.zipCode);
      if (!combinedAddress) {
        throw new Error('serviceAddress');
      }
      if (job.customer.phone && !isValidUsPhone(formatUsPhoneWithCountry(job.customer.phone))) {
        throw new Error('customer.phone');
      }
      if (!Number.isFinite(taxesPercent) || taxesPercent < 0 || taxesPercent > 100) {
        throw new Error('taxes');
      }
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
      } else if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        (e as { message?: unknown }).message === 'taxes'
      ) {
        formatted.taxes = 'Taxes % debe estar entre 0 y 100';
      } else if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        (e as { message?: unknown }).message === 'serviceAddress'
      ) {
        formatted.serviceAddress = t('form.address');
      } else if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        (e as { message?: unknown }).message === 'customer.phone'
      ) {
        formatted['customer.phone'] = t('form.phone');
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
      const combinedServiceAddress = composeServiceAddress(job.street, job.city, job.zipCode);
      const jobCore: Omit<Job, 'id'> = {
        reportType: job.reportType,
        quoteStatus: job.quoteStatus,
        createdByEmail: job.createdByEmail,
        qbInvoiceId: job.qbInvoiceId,
        qbInvoiceNumber: job.qbInvoiceNumber,
        paymentStatus: job.paymentStatus,
        paymentAmount: job.paymentAmount,
        paymentDate: job.paymentDate,
        lastSynced: job.lastSynced,
        customer: job.customer,
        serviceAddress: combinedServiceAddress,
        serviceType: job.serviceType,
        title: job.title,
        invoiceDescription: job.invoiceDescription,
        price: job.price,
        paymentTerms: job.paymentTerms,
        depositTaken: job.depositTaken,
        depositAmount: job.depositAmount,
        materialsUsed: job.materialsUsed,
        technicianId: job.technicianId,
        technicianName: job.technicianName,
        completedAt: job.completedAt,
        photos: job.photos,
        status: job.status,
      };

      const payload: Omit<Job, 'id'> = isQuoteMode
        ? {
            ...jobCore,
            reportType: 'quote',
            quoteStatus: job.quoteStatus || 'pending',
            serviceAddress: combinedServiceAddress,
            depositTaken: false,
            depositAmount: 0,
          }
        : { ...jobCore, reportType: 'invoice', serviceAddress: combinedServiceAddress };

      // if new customer, add to options
      if (!selectedCustomerId) {
        const newCust: Customer = {
          id: `c${Date.now()}`,
          name: job.customer.name,
          phone: job.customer.phone,
          email: job.customer.email,
          addresses: combinedServiceAddress ? [combinedServiceAddress] : [],
        };
        setCustomers((c) => [...c, newCust]);
        // also mutate global mock so other components see it
        mockCustomers.push(newCust);
      } else {
        // if existing but new address provided, push to that customer
        const cust = customers.find((c) => c.id === selectedCustomerId);
        if (cust && combinedServiceAddress && !cust.addresses?.includes(combinedServiceAddress)) {
          cust.addresses = [...(cust.addresses || []), combinedServiceAddress];
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
              onChange={(e) => handleSelectCustomer(e.target.value)}
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
            value={job.technicianId || ''}
            onChange={(e) => {
              const selected = technicians.find((tech) => tech.id === e.target.value);
              if (!selected) {
                setJob((current) => ({ ...current, technicianId: undefined, technicianName: '' }));
                return;
              }
              setJob((current) => ({
                ...current,
                technicianId: selected.id,
                technicianName: selected.name,
              }));
            }}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">{t('form.selectOption')}</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
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
              onChange={(e) => handleCustomerChange('phone', formatUsPhoneWithCountry(e.target.value))}
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
                      setJob((j) => ({ ...j, serviceAddress: '', street: '', city: '', zipCode: '' }));
                    } else {
                      const parsed = splitServiceAddress(val);
                      setAddingAddress(false);
                      setJob((j) => ({
                        ...j,
                        serviceAddress: val,
                        street: parsed.street,
                        city: parsed.city,
                        zipCode: parsed.zipCode,
                      }));
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
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={job.street}
                      onChange={(e) => {
                        const nextStreet = e.target.value;
                        setJob((j) => ({
                          ...j,
                          street: nextStreet,
                          serviceAddress: composeServiceAddress(nextStreet, j.city, j.zipCode),
                        }));
                      }}
                      placeholder="Street"
                      className="mt-1 block w-full border rounded p-2"
                    />
                    <input
                      type="text"
                      value={job.city}
                      onChange={(e) => {
                        const nextCity = e.target.value;
                        setJob((j) => ({
                          ...j,
                          city: nextCity,
                          serviceAddress: composeServiceAddress(j.street, nextCity, j.zipCode),
                        }));
                      }}
                      placeholder="City"
                      className="mt-1 block w-full border rounded p-2"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={job.zipCode}
                      onChange={(e) => {
                        const nextZip = e.target.value.replace(/\D/g, '');
                        setJob((j) => ({
                          ...j,
                          zipCode: nextZip,
                          serviceAddress: composeServiceAddress(j.street, j.city, nextZip),
                        }));
                      }}
                      placeholder="Zip code"
                      className="mt-1 block w-full border rounded p-2"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={job.street}
                  onChange={(e) => {
                    const nextStreet = e.target.value;
                    setJob((j) => ({
                      ...j,
                      street: nextStreet,
                      serviceAddress: composeServiceAddress(nextStreet, j.city, j.zipCode),
                    }));
                  }}
                  placeholder="Street"
                  className="mt-1 block w-full border rounded p-2"
                />
                <input
                  type="text"
                  value={job.city}
                  onChange={(e) => {
                    const nextCity = e.target.value;
                    setJob((j) => ({
                      ...j,
                      city: nextCity,
                      serviceAddress: composeServiceAddress(j.street, nextCity, j.zipCode),
                    }));
                  }}
                  placeholder="City"
                  className="mt-1 block w-full border rounded p-2"
                />
                <input
                  type="text"
                  value={job.zipCode}
                  onChange={(e) => {
                    const nextZip = e.target.value;
                    setJob((j) => ({
                      ...j,
                      zipCode: nextZip,
                      serviceAddress: composeServiceAddress(j.street, j.city, nextZip),
                    }));
                  }}
                  placeholder="Zip code"
                  className="mt-1 block w-full border rounded p-2"
                />
              </div>
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
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formatCurrencyInput(job.price)}
                onChange={(e) => {
                  handleChange('price', parseCurrencyInput(e.target.value));
                }}
                className="block w-full border rounded p-3 pl-7 text-base"
              />
            </div>
            <p className="field-note mt-1">{t('form.currentAmount')}: {formatMoney(job.price)}</p>
            {errors.price && <p className="text-red-600 text-sm">{errors.price}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">Taxes %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              inputMode="decimal"
              value={job.taxes}
              onChange={(e) => handleChange('taxes', e.target.value)}
              className="mt-1 block w-full border rounded p-3 text-base"
            />
            <p className="field-note mt-1">Monto de taxes: {formatMoney(taxesAmount)}</p>
            <p className="field-note">Precio final: {formatMoney(finalPrice)}</p>
            {errors.taxes && <p className="text-red-600 text-sm">{errors.taxes}</p>}
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
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatCurrencyInput(job.depositAmount)}
                      onChange={(e) => handleChange('depositAmount', parseCurrencyInput(e.target.value) ?? 0)}
                      className="block w-full border rounded p-3 pl-7 text-base"
                    />
                  </div>
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
