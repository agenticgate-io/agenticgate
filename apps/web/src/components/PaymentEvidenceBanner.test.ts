import { test, describe } from "node:test";
import assert from "node:assert";
import { getPaymentEvidenceInfo } from "./PaymentEvidenceBanner.js";
import type { PaidQueryResponse } from "../types.js";

describe("PaymentEvidenceBanner - getPaymentEvidenceInfo helper", () => {
  test("handles missing (undefined) payment evidence", () => {
    const info = getPaymentEvidenceInfo(undefined, "stellar:testnet");

    assert.strictEqual(info.status, "missing");
    assert.match(info.title, /Missing Payment Evidence/i);
    assert.match(info.className, /--missing/);
    assert.strictEqual(info.explorerUrl, undefined);
  });

  test("handles demo-mode payment evidence", () => {
    const evidence: PaidQueryResponse["payment"]["evidence"] = {
      kind: "demo",
      status: "demo-paid",
      network: "stellar:testnet",
      payTo: "GBX...",
      facilitatorUrl: "http://localhost:3001",
      payer: "demo-agent"
    };

    const info = getPaymentEvidenceInfo(evidence, "stellar:testnet");

    assert.strictEqual(info.status, "demo");
    assert.match(info.title, /Demo Mode Payment/i);
    assert.match(info.className, /--demo/);
    assert.match(info.description, /demo-agent/);
    assert.strictEqual(info.explorerUrl, undefined);
  });

  test("handles failed payment evidence", () => {
    const evidence: PaidQueryResponse["payment"]["evidence"] = {
      kind: "failed",
      status: "failed",
      network: "stellar:testnet",
      payTo: "GBX...",
      facilitatorUrl: "http://localhost:3001",
      payer: "demo-agent",
      error: "insufficient funds"
    };

    const info = getPaymentEvidenceInfo(evidence, "stellar:testnet");

    assert.strictEqual(info.status, "failed");
    assert.match(info.title, /Payment Verification Failed/i);
    assert.match(info.className, /--failed/);
    assert.match(info.description, /insufficient funds/);
    assert.strictEqual(info.explorerUrl, undefined);
  });

  test("handles verified (challenge authorized, settlement pending) evidence on testnet", () => {
    const evidence: PaidQueryResponse["payment"]["evidence"] = {
      kind: "verified",
      status: "verified",
      network: "Test SDF Network ; September 2015",
      payTo: "GBX...",
      facilitatorUrl: "http://localhost:3001",
      payer: "G_SPONSOR",
      amount: "0.01",
      asset: "USDC"
    };

    const info = getPaymentEvidenceInfo(evidence);

    assert.strictEqual(info.status, "verified");
    assert.match(info.title, /Payment Verified/i);
    assert.match(info.className, /--verified/);
    assert.match(info.description, /G_SPONSOR/);
    assert.match(info.description, /USDC/);
    assert.strictEqual(info.explorerUrl, undefined); // No Tx hash yet
  });

  test("handles settled payment evidence with explorer link on testnet", () => {
    const evidence: PaidQueryResponse["payment"]["evidence"] = {
      kind: "settled",
      status: "settled",
      network: "stellar:testnet",
      payTo: "GBX...",
      facilitatorUrl: "http://localhost:3001",
      payer: "G_PAYER",
      amount: "0.02",
      asset: "USDC",
      transactionHash: "abcd1234hash"
    };

    const info = getPaymentEvidenceInfo(evidence);

    assert.strictEqual(info.status, "verified");
    assert.match(info.title, /Payment Settled/i);
    assert.match(info.className, /--verified/);
    assert.match(info.description, /0.02 USDC/);
    assert.strictEqual(info.explorerUrl, "https://stellar.expert/explorer/testnet/tx/abcd1234hash");
  });

  test("handles settled payment evidence with explorer link on mainnet", () => {
    const evidence: PaidQueryResponse["payment"]["evidence"] = {
      kind: "settled",
      status: "settled",
      network: "stellar:pubnet",
      payTo: "GBX...",
      facilitatorUrl: "http://localhost:3001",
      payer: "G_PAYER",
      amount: "0.02",
      asset: "USDC",
      transactionHash: "abcd5678hash"
    };

    const info = getPaymentEvidenceInfo(evidence);

    assert.strictEqual(info.status, "verified");
    assert.strictEqual(info.explorerUrl, "https://stellar.expert/explorer/public/tx/abcd5678hash");
  });
});
