import { ProviderResultItem } from "@agenticgate/shared";
import { ProviderAdapter } from "./core.js";
import { fetchGroqItems } from "../lib/groq.js";

function buildSearchItems(query: string): ProviderResultItem[] {
  const now = new Date().toISOString().slice(0, 10);
  return [
    {
      title: `Stellar x402 update digest (${now})`,
      url: "https://developers.stellar.org",
      snippet: `Top ecosystem updates for: ${query}`,
      score: 0.92
    },
    {
      title: "x402 protocol foundation docs",
      url: "https://github.com/x402-foundation/x402",
      snippet: "Core protocol references, client/server patterns, and examples.",
      score: 0.89
    },
    {
      title: "Agent payments and usage-based API access",
      url: "https://stellar.org/blog",
      snippet: "How micropayments unlock per-request access for AI agents.",
      score: 0.83
    }
  ];
}

export class SearchAdapter implements ProviderAdapter {
  constructor(public id: string) {}

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async execute(query: string): Promise<ProviderResultItem[]> {
    const groqItems = await fetchGroqItems("search", query);
    if (!groqItems || groqItems.length === 0) {
      throw new Error("No items returned from search provider");
    }
    return groqItems;
  }

  getFallback(query: string): ProviderResultItem[] {
    return buildSearchItems(query);
  }
}
