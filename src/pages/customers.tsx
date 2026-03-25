/**
 * customers.tsx — Página de gestión de clientes.
 *
 * Funcionalidades:
 *  - Lista clientes con búsqueda en tiempo real (filtra por nombre, email, teléfono, dirección)
 *  - Crear nuevo cliente (formulario con nombre, email, teléfono, direcciones)
 *  - Editar cliente existente (carga datos en el formulario, envía PATCH)
 *  - Eliminar cliente (con confirmación)
 *
 * Las direcciones se editan en un único campo de texto separado por |  (pipe),
 * y se parsean al enviar para crear el array de strings.
 *
 * Acceso: Cualquier usuario autenticado (Protected).
 * CRUD: Llama a /api/customers con los métodos GET, POST, PATCH, DELETE.
 */
import React, { FormEvent, useEffect, useState } from 'react';
import Protected from '../components/Protected';
import { useAuth } from '../client/hooks/useAuth';
import { getAuthHeaders } from '../client/lib/authHeaders';
import { useI18n } from '../i18n/I18nProvider';
import { canDeleteCustomers, canEditCustomers } from '../lib/utils/permissions';
import { formatUsPhoneWithCountry } from '../lib/utils/phone';

type Customer = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  addresses?: string[];
};

type AddressDraft = { street: string; city: string; zip: string };

function composeAddress(d: AddressDraft): string {
  return [d.street.trim(), d.city.trim(), d.zip.trim()].filter(Boolean).join(', ');
}
function splitAddress(addr: string): AddressDraft {
  const parts = addr.split(',').map((p) => p.trim());
  return { street: parts[0] || '', city: parts[1] || '', zip: parts[2] || '' };
}

const emptyForm: Customer = {
  name: '',
  email: '',
  phone: '+1 ',
  addresses: [],
};
const emptyAddress: AddressDraft = { street: '', city: '', zip: '' };

export default function CustomersPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<Customer>(emptyForm);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddress);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const userRole = user?.role ?? null;
  const allowEdit = canEditCustomers(userRole);
  const allowDelete = canDeleteCustomers(userRole);

  const loadCustomers = async (search = '') => {
    setLoading(true);
    try {
      const qs = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/customers${qs}`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const composed = composeAddress(addressDraft);
      const payload = {
        ...form,
        addresses: composed ? [composed] : [],
      };
      const res = await fetch('/api/customers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.error || t('customers.saveError'));
        return;
      }

      setForm(emptyForm);
      setAddressDraft(emptyAddress);
      setEditingId(null);
      setNotice(t('customers.saved'));
      await loadCustomers(query);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (customer: Customer) => {
    setEditingId(customer.id || null);
    const firstAddr = (customer.addresses || [])[0] || '';
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addresses: [...(customer.addresses || [])],
    });
    setAddressDraft(splitAddress(firstAddr));
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!allowDelete) return;
    const res = await fetch(`/api/customers?id=${encodeURIComponent(customerId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice(data.error || t('customers.deleteError'));
      return;
    }
    setNotice(t('customers.deleted'));
    await loadCustomers(query);
  };

  return (
    <Protected>
      <div className="max-w-5xl mx-auto py-8 px-4 premium-section space-y-6">
        <div className="space-y-2">
          <span className="page-eyebrow">{t('customers.eyebrow')}</span>
          <h1 className="text-2xl font-bold premium-gradient-text">{t('customers.title')}</h1>
          <p className="page-subtitle">{t('customers.subtitle')}</p>
        </div>

        {notice && <div className="premium-card p-3 text-sm text-amber-300">{notice}</div>}

        <div className="premium-card p-4 grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('customers.searchPlaceholder')}
            className="sm:col-span-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
          />
          <button
            type="button"
            onClick={() => loadCustomers(query)}
            className="rounded-full bg-amber-500/20 text-amber-300 px-4 py-2 hover:bg-amber-500/35 transition-colors"
          >
            {t('customers.search')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="premium-card p-4 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('customers.name')}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            required
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder={t('customers.email')}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            required
          />
          <input
            type="tel"
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: formatUsPhoneWithCountry(e.target.value) }))
            }
            placeholder="+1 (305) 000-0000"
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            required
          />
          {/* Address split into street / city / zip */}
          <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
            <input
              type="text"
              value={addressDraft.street}
              onChange={(e) => setAddressDraft((d) => ({ ...d, street: e.target.value }))}
              placeholder={t('customers.street')}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            />
            <input
              type="text"
              value={addressDraft.city}
              onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder={t('customers.city')}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            />
            <input
              type="text"
              inputMode="numeric"
              value={addressDraft.zip}
              onChange={(e) =>
                setAddressDraft((d) => ({ ...d, zip: e.target.value.replace(/\D/g, '') }))
              }
              placeholder={t('customers.zip')}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-zinc-100"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-amber-500/20 text-amber-300 px-4 py-2 hover:bg-amber-500/35 transition-colors disabled:opacity-50"
            >
              {saving ? t('form.submitting') : editingId ? t('customers.update') : t('customers.create')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setAddressDraft(emptyAddress);
                }}
                className="rounded-full bg-zinc-500/20 text-zinc-200 px-4 py-2 hover:bg-zinc-500/35 transition-colors"
              >
                {t('customers.cancel')}
              </button>
            )}
          </div>
        </form>

        {loading ? (
          <p className="text-zinc-300">{t('ui.loading')}</p>
        ) : authLoading ? (
          <p className="text-zinc-300">{t('ui.loading')}</p>
        ) : customers.length === 0 ? (
          <p className="text-zinc-300">{t('customers.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {customers.map((c) => (
              <li key={c.id} className="premium-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-zinc-100">{c.name}</p>
                  <p className="text-sm text-zinc-300">{c.email} · {c.phone}</p>
                  <p className="text-xs text-zinc-400">{(c.addresses || []).join(' | ')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    disabled={!allowEdit}
                    className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/35"
                  >
                    {t('ui.edit')}
                  </button>
                  {c.id && allowDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(c.id as string)}
                      className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/35"
                    >
                      {t('ui.delete')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Protected>
  );
}
