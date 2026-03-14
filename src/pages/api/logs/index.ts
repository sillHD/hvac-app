import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../server/middleware/auth';
import { requireAnyRole } from '../../../server/middleware/permissions';

// GET /api/logs
function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: secure endpoint and return application logs
  res.status(200).json({ logs: [] });
}

export default withAuth(requireAnyRole(['admin', 'root'], handler));
