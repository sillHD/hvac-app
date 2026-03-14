/**
 * customers.ts — Servicio CRUD de clientes.
 *
 * Mantiene un store en memoria de clientes inicializado con datos mock.
 * Todas las operaciones son síncronas.
 *
 * Para producción:
 *  - Reemplazar customerStore con lecturas/escrituras a Google Sheets o BD.
 *  - El formato de addresses usa array de strings (una dirección por elemento).
 *
 * API pública:
 *  listCustomers(query?)  — Lista todos o filtra por texto libre
 *  createCustomer(input)  — Crea un nuevo cliente (email único)
 *  updateCustomer(id, p)  — Actualiza campos del cliente
 *  deleteCustomer(id)     — Elimina un cliente por ID
 */
import { mockCustomers } from '../../lib/mocks';
import type { Customer } from '../../lib/types';

/** Store en memoria; inicializado desde mocks al arrancar el servidor */
const customerStore: Customer[] = mockCustomers.map((c) => ({ ...c, addresses: [...(c.addresses || [])] }));

/** Elimina espacios sobrantes de los campos de texto */
function normalizeText(value: string): string {
  return value.trim();
}

/** Genera un ID único para un nuevo cliente */
function nextCustomerId(): string {
  return `c${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * Lista clientes; si se pasa `query`, filtra por nombre, email, teléfono o dirección.
 * La búsqueda es case-insensitive y busca en todos los campos de texto.
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
 * Crea un nuevo cliente.
 * Requiere: name, email, phone. El email debe ser único en el store.
 * @throws Error si faltan campos o si el email ya existe.
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

  customerStore.unshift(created); // insertar al inicio para mostrar el más reciente primero
  return created;
}

/**
 * Actualiza campos de un cliente existente.
 * No permite cambiar el id. El email debe seguir siendo único.
 * @returns El cliente actualizado, o null si no se encontró el ID.
 */
export function updateCustomer(id: string, patch: Partial<Customer>): Customer | null {
  const idx = customerStore.findIndex((c) => c.id === id);
  if (idx < 0) return null;

  const current = customerStore[idx];
  const nextEmail = patch.email ? normalizeText(patch.email).toLowerCase() : current.email;
  if (!nextEmail) throw new Error('Email is required');

  // Verificar que el nuevo email no pertenezca a otro cliente
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
 * Elimina un cliente del store por su ID.
 * @returns true si fue eliminado, false si no se encontró.
 */
export function deleteCustomer(id: string): boolean {
  const idx = customerStore.findIndex((c) => c.id === id);
  if (idx < 0) return false;
  customerStore.splice(idx, 1);
  return true;
}
