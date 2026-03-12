import { useState, useEffect, FormEvent } from 'react';
import { z } from 'zod';
import { Job, Customer } from '../lib/types';
import { mockCustomers } from '../lib/mocks';
import { useAuth } from '../client/hooks/useAuth';

interface JobFormProps {
  onSuccess?: () => void;
}

const emptyJob: Omit<Job, 'id'> = {
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

export default function JobForm({ onSuccess }: JobFormProps) {
  const { user } = useAuth();
  const [job, setJob] = useState<Omit<Job, 'id'>>({
    ...emptyJob,
    // default to logged in technician or empty
    technicianName: user?.name || user?.email || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // customers + selection state
  const [customers] = useState<Customer[]>(mockCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(''); // '' means new
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);

  // technicians list (statically defined for now)
  const technicians = ['Diego', 'Ángel'];
  const serviceTypes = ['Install', 'Repair', 'Maintenance', 'Diagnóstico'];

  // when the user toggles the customer select we need to update job state
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const handleAddressSelect = (val: string) => {
    if (val === '__other__') {
      setAddingAddress(true);
      setJob((j) => ({ ...j, serviceAddress: '' }));
    } else {
      setAddingAddress(false);
      setJob((j) => ({ ...j, serviceAddress: val }));
    }
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
      // new customer
      setJob((j) => ({
        ...j,
        customer: { name: '', phone: '', email: '' },
        serviceAddress: '',
      }));
      setAddressOptions([]);
      setAddingAddress(false);
    }
  }, [selectedCustomerId, customers]);

  const jobSchema = z.object({
    customer: z.object({
      name: z.string().nonempty('Required'),
      phone: z.string().nonempty('Required'),
      email: z.string().nonempty('Required').email('Invalid email'),
    }),
    serviceAddress: z.string().nonempty('Required'),
    serviceType: z.enum(['Install','Repair','Maintenance','Diagnóstico'] as const),
    title: z.string().nonempty('Required'),
    invoiceDescription: z.string()
      .min(10, 'Must be at least 10 characters')
      .nonempty('Required'),
    price: z.number().gt(0, 'Must be greater than 0'),
    paymentTerms: z.string().nonempty('Required'),
    depositTaken: z.boolean(),
    depositAmount: z.number().nonnegative('Invalid'),
    materialsUsed: z.array(z.string()).optional(),
    technicianName: z.string().nonempty('Required'),
    completedAt: z.string().nonempty('Required'),
    photos: z.array(z.string()).optional(),
    status: z.string(),
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
    if (selectedCustomerId) return; // lock while existing customer selected
    setJob((j) => ({
      ...j,
      customer: { ...j.customer, [field]: value },
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    // if user was adding a new address, commit it to job before validation
    if (addingAddress) {
      setJob((j) => ({ ...j, serviceAddress: j.serviceAddress }));
    }
    e.preventDefault();
    const err = validate();
    setErrors(err);
    if (Object.keys(err).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job),
      });
      if (res.ok) {
        // also send to Google Form mirror (ignored errors since
        // backend/service will log if it fails but it shouldn't block UI)
        fetch('/api/submitForm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technician: job.technicianName,
            customerName: job.customer.name,
            customerPhone: job.customer.phone,
            serviceAddress: job.serviceAddress,
            workType: job.serviceType,
            workDescription: job.invoiceDescription,
            jobPrice: job.price,
            depositTaken: job.depositTaken,
            depositAmount: job.depositAmount,
          }),
        }).catch((e) => console.error('google form submit failed', e));

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
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Customer section */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">Cliente</legend>
        <div className="grid gap-4">
          {/* choose existing or new */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Cliente registrado</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="">-- Nuevo cliente --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id || ''}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">Nombre</label>
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
            <label className="block text-sm font-medium text-zinc-700">Teléfono</label>
            <input
              type="tel"
              value={job.customer.phone}
              onChange={(e) => handleCustomerChange('phone', e.target.value)}
              readOnly={!!selectedCustomerId}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors['customer.phone'] && <p className="text-red-600 text-sm">{errors['customer.phone']}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input
              type="email"
              value={job.customer.email}
              onChange={(e) => handleCustomerChange('email', e.target.value)}
              readOnly={!!selectedCustomerId}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors['customer.email'] && <p className="text-red-600 text-sm">{errors['customer.email']}</p>}
          </div>
        </div>
      </fieldset>

      {/* Service details */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">Detalles del trabajo</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Dirección del servicio</label>
            {addressOptions.length > 0 ? (
              <>
                <select
                  value={addingAddress ? '__other__' : job.serviceAddress}
                  onChange={(e) => handleAddressSelect(e.target.value)}
                  className="mt-1 block w-full border rounded p-2"
                >
                  <option value="">-- seleccione --</option>
                  {addressOptions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
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
            <label className="block text-sm font-medium text-zinc-700">Tipo de servicio</label>
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
            <label className="block text-sm font-medium text-zinc-700">Título del trabajo</label>
            <input
              type="text"
              value={job.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.title && <p className="text-red-600 text-sm">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Descripción para factura</label>
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
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">Finanzas</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Precio del trabajo</label>
            <input
              type="number"
              min="0"
              value={job.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value))}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.price && <p className="text-red-600 text-sm">{errors.price}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Términos de pago</label>
            <input
              type="text"
              value={job.paymentTerms}
              onChange={(e) => handleChange('paymentTerms', e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.paymentTerms && <p className="text-red-600 text-sm">{errors.paymentTerms}</p>}
          </div>
          <div className="flex items-center">
            <input
              id="depositTaken"
              type="checkbox"
              checked={job.depositTaken}
              onChange={(e) => handleChange('depositTaken', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="depositTaken" className="text-sm">
              Depósito tomado
            </label>
          </div>
          {job.depositTaken && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">Monto del depósito</label>
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
        </div>
      </fieldset>

      {/* Misc */}
      <fieldset className="border p-4 rounded">
        <legend className="font-semibold">Otros</legend>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Materiales usados (separados por comas)</label>
            <input
              type="text"
              value={job.materialsUsed?.join(',') || ''}
              onChange={(e) =>
                handleChange('materialsUsed', e.target.value.split(',').map((s) => s.trim()))
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Técnico</label>
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
          <div>
            <label className="block text-sm font-medium text-zinc-700">Fecha completado</label>
            <input
              type="date"
              value={job.completedAt}
              onChange={(e) => handleChange('completedAt', e.target.value)}
              className="mt-1 block w-full border rounded p-2"
            />
            {errors.completedAt && <p className="text-red-600 text-sm">{errors.completedAt}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Fotos (URL, opcional)</label>
            <input
              type="text"
              value={job.photos?.join(',') || ''}
              onChange={(e) =>
                handleChange('photos', e.target.value.split(',').map((s) => s.trim()))
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {submitting ? 'Guardando...' : 'Enviar reporte'}
      </button>
    </form>
  );
}
