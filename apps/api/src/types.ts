import type { QueryMode } from "@agenticgate/shared";

export interface QueryExecutionInput {
  mode: QueryMode;
  providerId: string;
  queryOrUrl: string;
}

export interface TraceContext {
  traceId: string;
  startedAt: number;
}
