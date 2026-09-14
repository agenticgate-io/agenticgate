import { createHash, randomUUID } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import type { SponsorshipChallenge } from "@agenticgate/shared";
import { config } from "../config.js";

const SEP53_PREFIX = Buffer.from("Stellar Signed Message:\n", "utf8");

interface StoredChallenge {
  challenge: SponsorshipChallenge;
  consumed: boolean;
}

const challengeStore = new Map<string, StoredChallenge>();

function hashSep53Message(message: string): Buffer {
  const payload = Buffer.concat([SEP53_PREFIX, Buffer.from(message, "utf8")]);
  return createHash("sha256").update(payload).digest();
}

export function verifySep53MessageSignature(
  message: string,
  signatureBase64: string,
  publicKey: string
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const signature = Buffer.from(signatureBase64, "base64");
    return keypair.verify(hashSep53Message(message), signature);
  } catch {
    return false;
  }
}

function buildChallengeMessage(challenge: Omit<SponsorshipChallenge, "message">): string {
  return [
    "AgenticGate sponsorship challenge",
    `challengeId:${challenge.challengeId}`,
    `wallet:${challenge.wallet}`,
    `network:${config.STELLAR_NETWORK}`,
    `expiresAt:${challenge.expiresAt}`
  ].join("\n");
}

export function createChallenge(wallet: string): SponsorshipChallenge {
  const challengeId = randomUUID();
  const expiresAt = new Date(
    Date.now() + config.SPONSORSHIP_CHALLENGE_TTL_SECONDS * 1000
  ).toISOString();

  const challenge: SponsorshipChallenge = {
    challengeId,
    wallet,
    message: "",
    expiresAt
  };

  challenge.message = buildChallengeMessage(challenge);
  challengeStore.set(challengeId, { challenge, consumed: false });
  return challenge;
}

export function verifyAndConsumeChallenge(input: {
  wallet: string;
  challengeId: string;
  signature: string;
}): { ok: true } | { ok: false; error: string } {
  const stored = challengeStore.get(input.challengeId);
  if (!stored || stored.consumed) {
    return { ok: false, error: "invalid_challenge" };
  }

  const { challenge } = stored;

  if (challenge.wallet !== input.wallet) {
    return { ok: false, error: "wrong_wallet" };
  }

  if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
    challengeStore.delete(input.challengeId);
    return { ok: false, error: "challenge_expired" };
  }

  if (!verifySep53MessageSignature(challenge.message, input.signature, input.wallet)) {
    return { ok: false, error: "invalid_signature" };
  }

  stored.consumed = true;
  challengeStore.delete(input.challengeId);
  return { ok: true };
}
