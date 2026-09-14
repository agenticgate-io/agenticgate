import { ProviderResultItem } from "@agenticgate/shared";
import { ProviderAdapter } from "./core.js";
import { fetchGroqItems } from "../lib/groq.js";

function buildNewsItems(query: string): ProviderResultItem[] {
  return [
    {
      title: `Breaking: ${query} market impact analysis`,
      url: "https://news.example.com/stellar-market",
      snippet: "Market reaction and protocol activity from the last 24h.",
      score: 0.9
    },
    {
      title: "Stellar ecosystem funding and builder updates",
      url: "https://news.example.com/stellar-ecosystem",
      snippet: "New integrations, tooling releases, and community milestones.",
      score: 0.86
    },
    {
      title: "Micropayment APIs for AI agents",
      url: "https://news.example.com/agent-payments",
      snippet: "How pay-per-query infra changes agent product economics.",
      score: 0.82
    }
  ];
}

export class NewsAdapter implements ProviderAdapter {
  constructor(public id: string) {}

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async execute(query: string): Promise<ProviderResultItem[]> {
    const groqItems = await fetchGroqItems("news", query);
    if (!groqItems || groqItems.length === 0) {
      throw new Error("No items returned from news provider");
    }
    return groqItems;
  }

  getFallback(query: string): ProviderResultItem[] {
    return buildNewsItems(query);
  }
}
