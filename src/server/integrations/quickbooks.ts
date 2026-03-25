/**
 * integrations/quickbooks.ts — Cliente QuickBooks (stub, sin implementar).
 *
 * Punto de entrada para la integración con QuickBooks Online.
 * La implementación real debe ir en services/quickbooks/index.ts.
 *
 * TODO: Implementar con el SDK oficial de QuickBooks o llamadas HTTP a:
 *  https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
 *
 * Variables de entorno necesarias (cuando se implemente):
 *  QB_CLIENT_ID      — Client ID de la app QuickBooks registrada
 *  QB_CLIENT_SECRET  — Client Secret
 *  QB_REFRESH_TOKEN  — Token OAuth2 de larga duración
 *  QB_REALM_ID       — Company ID en QuickBooks
 */

// Server-only QuickBooks API client

export async function createInvoice(data: unknown) {
  // TODO: implement QuickBooks integration
  void data;
  return { ok: true };
}
