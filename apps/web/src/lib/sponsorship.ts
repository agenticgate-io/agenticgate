import { signMessage } from "@stellar/freighter-api";
import type { QueryMode } from "@agenticgate/shared";
import type { z } from "zod";
import { signedGrantSchema, sponsorshipPreviewResponseSchema } from "@agenticgate/shared";
import type { PaidQueryResponse } from "../types.js";
import { fetchJson } from "./api.js";
import { buildPaidClientRequestKey, getIdempotencyKey } from "./idempotency.js";

type SignedGrant = z.infer<typeof signedGrantSchema>;
export type SponsorshipPreview = z.infer<typeof sponsorshipPreviewResponseSchema>;

// SponsorshipChallenge — defined locally as it's not exported from shared
interface SponsorshipChallenge {
  challengeId: string;
  wallet: string;
  message: string;
  expiresAt: string;
}

function extractFreighterError(error: unknown) {
  if (!error) {
    return "Freighter message signing failed";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return JSON.stringify(error);
}

function normalizeSignature(signedMessage: string | Uint8Array | null): string {
  if (!signedMessage) {
    throw new Error("Freighter did not return a message signature");
  }

  if (typeof signedMessage === "string") {
    return signedMessage;
  }

  let binary = "";
  signedMessage.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function fetchSponsorshipEnabled(apiBaseUrl: string): Promise<boolean> {
  const health = await fetchJson<{ sponsorshipEnabled?: boolean }>(`${apiBaseUrl}/health`);
  return health.sponsorshipEnabled === true;
}

export async function fetchSponsorshipPreview(input: {
  apiBaseUrl: string;
  wallet: string;
  mode: QueryMode;
  provider: string;
  signal?: AbortSignal;
}): Promise<SponsorshipPreview> {
  return fetchJson<SponsorshipPreview>(`${input.apiBaseUrl}/api/sponsorship/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: input.wallet,
      mode: input.mode,
      provider: input.provider
    }),
    ...(input.signal ? { signal: input.signal } : {})
  });
}

export async function runSponsoredPaidQuery(input: {
  apiBaseUrl: string;
  mode: QueryMode;
  provider: string;
  query?: string;
  url?: string;
  walletAddress: string;
}): Promise<PaidQueryResponse> {
  const challenge = await fetchJson<SponsorshipChallenge>(
    `${input.apiBaseUrl}/api/sponsorship/challenge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: input.walletAddress })
    }
  );

  const signResult = await signMessage(challenge.message, { address: input.walletAddress });
  if (signResult.error || !signResult.signedMessage) {
    throw new Error(extractFreighterError(signResult.error));
  }

  const signedGrant = await fetchJson<SignedGrant>(`${input.apiBaseUrl}/api/sponsorship/grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: input.walletAddress,
      challengeId: challenge.challengeId,
      signature: normalizeSignature(signResult.signedMessage)
    })
  });

  const requestKey = buildPaidClientRequestKey({
    route: "/api/paid/run",
    mode: input.mode,
    provider: input.provider,
    query: input.query,
    url: input.url,
    payer: input.walletAddress
  });
  const idempotencyKey = getIdempotencyKey(requestKey);
  const grantHeader = btoa(JSON.stringify(signedGrant));

  return fetchJson<PaidQueryResponse>(`${input.apiBaseUrl}/api/paid/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-Sponsorship-Grant": grantHeader
    },
    body: JSON.stringify({
      mode: input.mode,
      provider: input.provider,
      wallet: input.walletAddress,
      query: input.query,
      url: input.url
    })
  });
}
