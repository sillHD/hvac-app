// Shared backend types

export interface Technician {
  id: string;
  name: string;
}

export interface Report {
  id: string;
  technicianId: string;
  details: string;
  timestamp: string;
}
