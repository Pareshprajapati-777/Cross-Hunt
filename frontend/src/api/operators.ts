import { apiRequest } from './client';
import { OperatorSummary } from './types';

export interface PublicOperator extends OperatorSummary {
  operator_type?: string;
  whatsapp_number?: string;
  tours_count?: number;
}

export async function getPublicOperators(): Promise<{ operators: PublicOperator[] }> {
  return apiRequest<{ operators: PublicOperator[] }>('/api/operators/');
}
