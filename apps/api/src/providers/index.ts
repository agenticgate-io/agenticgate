import { registry } from "./registry.js";
import { SearchAdapter } from "./search.js";
import { NewsAdapter } from "./news.js";
import { ScrapeAdapter } from "./scrape.js";

// Register search adapters
registry.register(new SearchAdapter("search.live"));
registry.register(new SearchAdapter("search.basic"));
registry.register(new SearchAdapter("search.pro"));

// Register news adapters
registry.register(new NewsAdapter("news.fast"));
registry.register(new NewsAdapter("news.deep"));

// Register scrape adapters
registry.register(new ScrapeAdapter("scrape.page"));
registry.register(new ScrapeAdapter("scrape.extract"));

export { registry };
