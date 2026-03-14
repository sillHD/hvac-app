import { mockCustomers } from '../../lib/mocks';
import type { Customer } from '../../lib/types';

const customerStore: Customer[] = mockCustomers.map((c) => ({ ...c, addresses: [...(c.addresses || [])] }));

function normalizeText(value: string): string {
  return value.trim();
}

function nextCustomerId(): string {
  return `c${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

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

  customerStore.unshift(created);
  return created;
}

export function updateCustomer(id: string, patch: Partial<Customer>): Customer | null {
  const idx = customerStore.findIndex((c) => c.id === id);
  if (idx < 0) return null;

  const current = customerStore[idx];
  const nextEmail = patch.email ? normalizeText(patch.email).toLowerCase() : current.email;
  if (!nextEmail) throw new Error('Email is required');

  const duplicate = customerStore.some((c) => c.id !== id && c.email.toLowerCase() === nextEmail);
  if (duplicate) throw new Error('Customer email already exists');

  const updated: Customer = {
    ...current,
    ...patch,
    id: current.id,
    name: patch.name !== undefined ? normalizeText(patch.name) : current.name,
    email: nextEmail,
    phone: patch.phone !== undefined ? normalizeText(patch.phone) : current.phone,
    addresses: patch.addresses ? patch.addresses.map(normalizeText).filter(Boolean) : current.addresses,
  };

  customerStore[idx] = updated;
  return updated;
}

export function deleteCustomer(id: string): boolean {
  const idx = customerStore.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  customerStore.splice(idx, 1);
  return true;
}
