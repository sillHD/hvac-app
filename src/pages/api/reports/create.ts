import type { NextApiRequest, NextApiResponse } from 'next';
import type { Job } from '../../../lib/types';
import { createReport } from '../../../server/services/jobs';

// POST /api/reports/create
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const report = req.body as Job;
  if (!report) {
    return res.status(400).json({ error: 'Missing job payload' });
  }

  // generate an ID if the client didn't provide one
  if (!report.id) {
    report.id = `job${Date.now()}`;
  }

  // ensure completedAt timestamp exists
  if (!report.completedAt) {
    report.completedAt = new Date().toISOString();
  }

  try {
    await createReport(report);
    res.status(200).json({ ok: true, report });
  } catch (err) {
    console.error('reports/create error', err);
    res.status(500).json({ error: 'could not save report' });
  }
}
