import { useState, useEffect, FormEvent } from 'react';
import { z } from 'zod';
import { Job, Customer } from '../lib/types';
import { mockCustomers } from '../lib/mocks';
import { useAuth } from '../client/hooks/useAuth';
import { getAuthHeaders } from '../client/lib/authHeaders';

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




  // validation including email and service address logic
  const jobSchema = z.object({
    customer: z.object({
      name: z.string().nonempty('Required'),
      phone: z.string().nonempty('Required'),
      email: z.string().nonempty('Required').email('Invalid email'),
    }),
    serviceAddress: z.string().nonempty('Required'),
    serviceType: z.enum(['Install','Repair','Maintenance','Diagnóstico'] as const),
    invoiceDescription: z.string()
      .min(1, 'Required')
      .nonempty('Required'),
    price: z.number().gt(0, 'Must be greater than 0'),
    depositTaken: z.boolean(),
    depositAmount: z.number().nonnegative('Invalid'),
    technicianName: z.string().nonempty('Required'),
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
        formatted.depositAmount = 'Must be > 0 when deposit taken';
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
        alert(data.error || 'Error submitting job');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <span className="page-eyebrow">{isQuoteMode ? 'Nueva cotizacion' : 'Nueva factura'}</span>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold premium-gradient-text">
            {isQuoteMode ? 'Registrar cotizacion' : 'Registrar factura'}
          </h2>
          <p className="page-subtitle">
            Captura cliente, direccion, descripcion y datos de cobro en un flujo corto pensado para movil.
          </p>
        </div>
      </div>

      {/* choose existing customer or new */}
      <fieldset className="panel-fieldset">
        <legend className="font-semibold text-amber-300">Cliente</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Cliente registrado</label>
            <p className="field-note mt-1">Selecciona un cliente existente o deja vacio para registrar uno nuevo.</p>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">-- Nuevo cliente --</option>
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
        <legend className="font-semibold text-amber-300">Técnico</legend>
        <div>
          <p className="field-note mb-2">Asigna el trabajo al tecnico responsable antes de enviarlo.</p>
          <select
            value={job.technicianName}
            onChange={(e) => handleChange('technicianName', e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">-- seleccione --</option>
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
        <legend className="font-semibold text-amber-300">Datos del cliente</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Nombre</label>
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
            <label className="block text-sm font-medium text-zinc-100">Teléfono</label>
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
        <legend className="font-semibold text-amber-300">Detalles del trabajo</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Dirección</label>
            <p className="field-note mt-1">La direccion debe ser asi: Direccion, Ciudad</p>
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
                  <option value="">-- seleccione --</option>
                  {addressOptions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  <option value="__other__">Otro</option>
                </select>
                {addingAddress && (
                  <input
                    type="text"
                    value={job.serviceAddress}
                    onChange={(e) => handleChange('serviceAddress', e.target.value)}
                    placeholder="Escriba nueva dirección"
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
            <label className="block text-sm font-medium text-zinc-100">Tipo de trabajo</label>
            <select
              value={job.serviceType}
              onChange={(e) => handleChange('serviceType', e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">-- seleccione --</option>
              {serviceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.serviceType && <p className="text-red-600 text-sm">{errors.serviceType}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-100">Descripción del trabajo</label>
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
        <legend className="font-semibold text-amber-300">Finanzas</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-100">Precio</label>
            <p className="field-note mt-1">Usa el valor total acordado. El estado de pago se podra sincronizar despues con QuickBooks.</p>
            <input
              type="number"
              min="0"
              value={job.price ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                handleChange('price', value === '' ? null : parseFloat(value));
              }}
              className="mt-1 block w-full border rounded p-2"
            />
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
                  Depósito tomado
                </label>
              </div>
              {job.depositTaken && (
                <div>
                  <label className="block text-sm font-medium text-zinc-100">Cantidad del depósito</label>
                  <input
                    type="number"
                    min="0"
                    value={job.depositAmount}
                    onChange={(e) => handleChange('depositAmount', parseFloat(e.target.value))}
                    className="mt-1 block w-full border rounded p-2"
                  />
                  {errors.depositAmount && <p className="text-red-600 text-sm">{errors.depositAmount}</p>}
                </div>
              )}
            </>
          )}
          {isQuoteMode && (
            <div>
              <label className="block text-sm font-medium text-zinc-100">Estado de la cotización</label>
              <select
                value={job.quoteStatus || 'pending'}
                onChange={(e) => handleChange('quoteStatus', e.target.value)}
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobada</option>
              </select>
            </div>
          )}
        </div>
      </fieldset>


      <button
        type="submit"
        disabled={submitting}
        className="w-full btn-primary py-3 disabled:opacity-50 shadow-[0_12px_28px_rgba(202,155,42,0.18)]"
      >
        {submitting ? 'Guardando...' : isQuoteMode ? 'Guardar cotizacion' : 'Guardar factura'}
      </button>
    </form>
  );
}
