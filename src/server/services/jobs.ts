import { Job } from '../../lib/types';

// in-memory store for demonstration
const jobStore: Job[] = [];

export async function createReport(report: Job) {
  // TODO: persist report to database
  jobStore.push(report);
}

export async function listReports(userId: string) {
  // TODO: query database for reports by technician/user
  return jobStore.filter((j) => j.technicianName === userId);
}
