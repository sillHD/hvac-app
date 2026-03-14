import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../server/middleware/auth';
import { requireAnyRole } from '../../../server/middleware/permissions';
import { listAuditEvents } from '../../../server/services/audit';

// GET /api/logs
function handler(req: NextApiRequest, res: NextApiResponse) {
  const limit = Number.parseInt(String(req.query.limit || '200'), 10);
  const events = listAuditEvents(Number.isFinite(limit) ? limit : 200);
  const logs = events.map((e) => {
    const actor = e.actorEmail ? `${e.actorEmail}${e.actorRole ? ` (${e.actorRole})` : ''}` : 'system';
    const target = e.targetId ? `${e.targetType}:${e.targetId}` : e.targetType;
    const details = e.details ? ` | ${JSON.stringify(e.details)}` : '';
    return `${e.timestamp} | ${e.action} | actor=${actor} | target=${target}${details}`;
  });

  res.status(200).json({ logs });
}

export default withAuth(requireAnyRole(['admin', 'root'], handler));
