/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *  updateCustomer(id, p)  — Updates customer fields
 * Internal implementation detail.
 */
import { mockCustomers } from '../../lib/mocks';
import type { Customer } from '../../lib/types';

/* Internal implementation detail. */
const customerStore: Customer[] = mockCustomers.map((c) => ({ ...c, addresses: [...(c.addresses || [])] }));

/* Internal implementation detail. */
function normalizeText(value: string): string {
  return value.trim();
}

/* Internal implementation detail. */
function nextCustomerId(): string {
  return `c${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function listCustomers(query?: string): Customer[] {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [...customerStore];

  return customerStore.filter((c) => {
    return [c.name, c.email, c.phone, ...(c.addresses || [])]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function createCustomer(input: Customer): Customer {
  const name = normalizeText(input.name || '');
  const email = normalizeText(input.email || '').toLowerCase();
  const phone = normalizeText(input.phone || '');
  if (!name || !email || !phone) {
    throw new Error('Name, email and phone are required');
  }

  if (customerStore.some((c) => c.email.toLowerCase() === email)) {
    throw new Error('Customer email already exists');
  }

  const created: Customer = {
    id: input.id || nextCustomerId(),
    name,
    email,
    phone,
    addresses: (input.addresses || []).map(normalizeText).filter(Boolean),
  };

  customerStore.unshift(created); // Show the most recently created customer first.
  return created;
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function updateCustomer(id: string, patch: Partial<Customer>): Customer | null {
  const idx = customerStore.findIndex((c) => c.id === id);
  if (idx < 0) return null;

  const current = customerStore[idx];
  const nextEmail = patch.email ? normalizeText(patch.email).toLowerCase() : current.email;
  if (!nextEmail) throw new Error('Email is required');

  // Internal implementation detail.
  const duplicate = customerStore.some((c) => c.id !== id && c.email.toLowerCase() === nextEmail);
  if (duplicate) throw new Error('Customer email already exists');

  const updated: Customer = {
    ...current,
    ...patch,
    id: current.id, // el ID nunca cambia
    name: patch.name !== undefined ? normalizeText(patch.name) : current.name,
    email: nextEmail,
    phone: patch.phone !== undefined ? normalizeText(patch.phone) : current.phone,
    addresses: patch.addresses ? patch.addresses.map(normalizeText).filter(Boolean) : current.addresses,
  };

  customerStore[idx] = updated;
  return updated;
}

/**
 * Internal implementation detail.
 * Internal implementation detail.
 */
export function deleteCustomer(id: string): boolean {
  const idx = customerStore.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  customerStore.splice(idx, 1);
  return true;
}
