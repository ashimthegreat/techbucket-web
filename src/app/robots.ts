import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRIVATE = ["/admin", "/api/"];

// Bots that fetch pages so AI assistants can answer and cite them. Always allowed:
// blocking these removes the site from ChatGPT, Claude, Perplexity and Copilot answers.
const AI_SEARCH_BOTS = [
  "OAI-SearchBot", // ChatGPT search
  "ChatGPT-User", // ChatGPT fetching a page a user asked about
  "Claude-SearchBot", // Claude search
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "bingbot", // Bing, Copilot and many AI tools built on Bing
  "Googlebot", // Google Search, AI Overviews and AI Mode
  "Applebot", // Siri / Spotlight / Apple Intelligence answers
  "DuckAssistBot",
];

// Bots that collect pages to train AI models. Allowing them helps AI models know
// Tech Bucket by name; switch off under Admin → Site settings to opt out.
const AI_TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "meta-externalagent"];

export default async function robots(): Promise<MetadataRoute.Robots> {
  let allowTraining = true;
  try {
    allowTraining = (await getSettings()).allowAiTraining;
  } catch {
    // No database yet: fall back to allowing, the default.
  }
  return {
    rules: [
      { userAgent: AI_SEARCH_BOTS, allow: "/", disallow: PRIVATE },
      allowTraining
        ? { userAgent: AI_TRAINING_BOTS, allow: "/", disallow: PRIVATE }
        : { userAgent: AI_TRAINING_BOTS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: PRIVATE },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
