/**
 * Public API / 공개 API
 * Export client entity types and API / 클라이언트 엔티티 타입 및 API export
 */
export type { Client } from './model/types';
export { clientQueries } from './api/client.queries';
export { getClients, GetClientsError } from './api/get-clients';
