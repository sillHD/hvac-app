import type { NextApiRequest, NextApiResponse } from 'next';
import type { GoogleFormInternal } from '../../lib/googleForm';
import { appendToSheet } from '../../server/services/googleSheets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method not allowed');
  }

  const payload = req.body as GoogleFormInternal;
  try {
    // write directly to spreadsheet instead of posting a form
    await appendToSheet(payload);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submitForm (sheets) error', err);
    res.status(500).json({ error: 'submission failed' });
  }
}
