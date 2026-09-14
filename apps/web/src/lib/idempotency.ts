const idempotencyKeys = new Map<string, string>();

export function buildPaidClientRequestKey(input: {
  route: string;
  mode: string;
  provider: string;
  query?: string;
  url?: string;
  payer: string;
}) {
  return JSON.stringify({
    route: input.route,
    mode: input.mode,
    provider: input.provider,
    query: input.query ?? null,
    url: input.url ?? null,
    payer: input.payer
  });
}

export function getIdempotencyKey(requestKey: string): string {
  const existing = idempotencyKeys.get(requestKey);
  if (existing) {
    return existing;
  }

  const key = crypto.randomUUID();
  idempotencyKeys.set(requestKey, key);
  return key;
}
