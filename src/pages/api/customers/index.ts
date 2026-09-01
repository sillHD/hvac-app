/**
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * Internal implementation detail.
 *
 * Internal implementation detail.
 * POST             — Creates a customer (body: Customer)
 * PATCH            — Updates a customer (body: { id, ...fields })
 * DELETE ?id=xxx   — Deletes a customer by ID
 *
 * Internal implementation detail.
 *
 * Responses:
 * Internal implementation detail.
 * Internal implementation detail.
 * Internal implementation detail.
 *  404     — Customer not found
 * Internal implementation detail.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../server/middleware/auth';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../../server/services/customers';
import { logAuditEvent } from '../../../server/services/audit';

function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user as { email: string; role: 'technician' | 'admin' | 'root' };

  if (req.method === 'GET') {
    const q = String(req.query.q || '');
    return res.status(200).json({ customers: listCustomers(q) });
  }

  if (req.method === 'POST') {
    const payload = req.body || {};
    try {
      const created = createCustomer(payload);
      logAuditEvent({
        action: 'customer.create',
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'customer',
        targetId: created.id,
        details: { email: created.email, name: created.name },
      });
      return res.status(201).json({ customer: created });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...patch } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Customer id is required' });
    }

    try {
      const updated = updateCustomer(String(id), patch);
      if (!updated) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      logAuditEvent({
        action: 'customer.update',
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'customer',
        targetId: updated.id,
        details: { email: updated.email, name: updated.name },
      });
      return res.status(200).json({ customer: updated });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    if (!id) {
      return res.status(400).json({ error: 'Customer id is required' });
    }

    const removed = deleteCustomer(id);
    if (!removed) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    logAuditEvent({
      action: 'customer.delete',
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'customer',
      targetId: id,
    });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return res.status(405).end('Method Not Allowed');
}

export default withAuth(handler);
