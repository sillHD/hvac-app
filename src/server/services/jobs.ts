// Temporary compatibility layer.  The real implementation now lives in
// `services/jobs/index.ts`.  This file re-exports the same functions so that
// existing imports continue working while we gradually migrate or refactor.

export { createReport, listReports, getReport, updateReport, deleteReport } from './jobs/index';
