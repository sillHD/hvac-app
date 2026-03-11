// Job-related persistence/service layer.
// For now we keep an in‑memory store using mock data.  All exported functions
// return Promises and mirror what a real database adapter might look like.  In
// production you would replace implementations with queries to PostgreSQL,
// MongoDB, etc., and make sure the functions run strictly server-side (no
// front-end imports).

import { Job } from '../../../lib/types';
import { mockJobs } from '../../../lib/mocks';

const jobStore: Job[] = [...mockJobs];

export async function createReport(report: Job) {
  // TODO: write to database, validate user permissions, etc.
  jobStore.push(report);
}

export async function listReports(userId?: string) {
  // TODO: perform DB query filtering by technician/user
  if (userId) {
    return jobStore.filter((j) => j.technicianName === userId);
  }
  return jobStore;
}

export async function getReport(id: string) {
  return jobStore.find((j) => j.id === id) || null;
}
