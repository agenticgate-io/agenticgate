import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OTHER_WALLET,
  TEST_WALLET,
  applySponsorshipTestEnv,
  createSignedGrant,
  resetSponsorshipStore
} from "../../test/sponsorship-test-helpers.js";

describe("authorizeSponsoredRun", () => {
  let dbPath: string;

  afterEach(async () => {
    await resetSponsorshipStore(dbPath);
  });

  it("allows a valid grant and request", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant();

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.decision).toBe("allowed");
    expect(result.quotedPriceUsd).toBe(0.01);
  });

  it("rejects expired grants with 403", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant({
      expiresAt: new Date(Date.now() - 60_000).toISOString()
    });

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.decision).toBe("denied_expired");
  });

  it("rejects wrong wallet with 403", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant({ wallet: TEST_WALLET });

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: OTHER_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.decision).toBe("denied_wrong_wallet");
  });

  it("rejects wrong network with 403", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant({ network: "stellar:pubnet" });

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.decision).toBe("denied_wrong_network");
  });

  it("rejects wrong provider with 403", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant({ mode: "news" });

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.decision).toBe("denied_wrong_provider");
  });

  it("rejects when quoted price exceeds grant maxAmountUsd", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant({ maxAmountUsd: 0.005 });

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.decision).toBe("denied_price_exceeded");
  });

  it("rejects reused nonce with 409 at reservation time", async () => {
    dbPath = applySponsorshipTestEnv();
    const { authorizeSponsoredRun } = await import("./policy.js");
    const { checkAndReserveBudget, SponsorshipNonceReplayError } = await import("./budget.js");
    const signedGrant = await createSignedGrant();

    checkAndReserveBudget({
      wallet: TEST_WALLET,
      amountUsd: 0.01,
      nonce: signedGrant.grant.nonce,
      grantId: signedGrant.grant.grantId
    });

    const authorized = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });
    expect(authorized.allowed).toBe(true);

    expect(() =>
      checkAndReserveBudget({
        wallet: TEST_WALLET,
        amountUsd: 0.01,
        nonce: signedGrant.grant.nonce,
        grantId: signedGrant.grant.grantId
      })
    ).toThrow(SponsorshipNonceReplayError);
  });

  it("rejects per-wallet budget exceeded with 429", async () => {
    dbPath = applySponsorshipTestEnv({
      SPONSORSHIP_PER_WALLET_DAILY_BUDGET_USD: "0.01"
    });
    const { authorizeSponsoredRun } = await import("./policy.js");
    const { checkAndReserveBudget } = await import("./budget.js");

    checkAndReserveBudget({
      wallet: TEST_WALLET,
      amountUsd: 0.01,
      nonce: (await createSignedGrant()).grant.nonce,
      grantId: "grant-spent"
    });

    const signedGrant = await createSignedGrant();
    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(result.decision).toBe("denied_budget_exceeded");
    expect(result.error).toBe("wallet_budget_exceeded");
  });

  it("rejects global budget exceeded with 429", async () => {
    dbPath = applySponsorshipTestEnv({
      SPONSORSHIP_GLOBAL_DAILY_BUDGET_USD: "0.01",
      SPONSORSHIP_PER_WALLET_DAILY_BUDGET_USD: "1"
    });
    const { authorizeSponsoredRun } = await import("./policy.js");
    const { checkAndReserveBudget } = await import("./budget.js");

    checkAndReserveBudget({
      wallet: TEST_WALLET,
      amountUsd: 0.01,
      nonce: (await createSignedGrant()).grant.nonce,
      grantId: "grant-global-spent"
    });

    const signedGrant = await createSignedGrant({ wallet: OTHER_WALLET });
    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: OTHER_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(result.decision).toBe("denied_budget_exceeded");
    expect(result.error).toBe("global_budget_exceeded");
  });

  it("returns 503 when sponsorship is disabled", async () => {
    dbPath = applySponsorshipTestEnv({ SPONSORSHIP_ENABLED: "false" });
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant();

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.decision).toBe("denied_sponsorship_disabled");
  });

  it("returns 503 when storage is unavailable", async () => {
    dbPath = applySponsorshipTestEnv();
    const store = await import("./store.js");
    vi.spyOn(store, "isSponsorshipStorageAvailable").mockReturnValue(false);
    const { authorizeSponsoredRun } = await import("./policy.js");
    const signedGrant = await createSignedGrant();

    const result = authorizeSponsoredRun({
      signedGrant,
      wallet: TEST_WALLET,
      mode: "search",
      provider: "search.basic"
    });

    expect(result.allowed).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.decision).toBe("denied_storage_unavailable");
  });
});
