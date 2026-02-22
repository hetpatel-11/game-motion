import { MCPServer, text } from "mcp-use/server";
import { z } from "zod";
import { RULE_INDEX } from "./rules/index.js";
import { RULE_REACT_CODE } from "./rules/react-code.js";
import { RULE_REMOTION_ANIMATIONS } from "./rules/remotion-animations.js";
import { RULE_REMOTION_TIMING } from "./rules/remotion-timing.js";
import { RULE_REMOTION_SEQUENCING } from "./rules/remotion-sequencing.js";
import { RULE_REMOTION_TRANSITIONS } from "./rules/remotion-transitions.js";
import { RULE_REMOTION_TEXT_ANIMATIONS } from "./rules/remotion-text-animations.js";
import { RULE_REMOTION_TRIMMING } from "./rules/remotion-trimming.js";
import { RULE_REMOTION_DIAGRAMS } from "./rules/remotion-diagrams.js";
import {
  DEFAULT_META,
  compileAndRespondWithProject,
  failProject,
  formatZodIssues,
  getSessionProject,
} from "./utils.js";

// ---------------------------------------------------------------------------
// URL scraper + theme detector
// ---------------------------------------------------------------------------

type ThemeInfo = {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontStyle: string;
  mood: string;
  keywords: string[];
};

const KNOWN_THEMES: Record<string, ThemeInfo> = {
  "paulgraham.com": {
    name: "Y Combinator / Paul Graham",
    description: "YC orange startup founder essay aesthetic — typewriter serif, raw intellectual energy, Silicon Valley founder culture",
    primaryColor: "#FF6600",
    secondaryColor: "#1a1a1a",
    accentColor: "#FF8C00",
    backgroundColor: "#FFF9F4",
    fontStyle: "Georgia serif, essay-style, monospace accents",
    mood: "intellectual, provocative, founder-mindset",
    keywords: ["startup", "founder", "YC", "essay", "entrepreneurship", "Silicon Valley", "hacker"],
  },
  "ycombinator.com": {
    name: "Y Combinator",
    description: "YC brand — bold orange, Hacker News feel, startup community",
    primaryColor: "#FF6600",
    secondaryColor: "#222222",
    accentColor: "#FF8C00",
    backgroundColor: "#F6F6EF",
    fontStyle: "Verdana, monospace, minimal",
    mood: "direct, technical, no-nonsense",
    keywords: ["YC", "startup", "batch", "demo day", "funding"],
  },
  "stripe.com": {
    name: "Stripe",
    description: "Stripe brand — deep purple gradient, fintech precision, elegant developer aesthetic",
    primaryColor: "#635BFF",
    secondaryColor: "#0A2540",
    accentColor: "#00D4FF",
    backgroundColor: "#FFFFFF",
    fontStyle: "Camphor, sans-serif, clean grid",
    mood: "polished, technical, premium fintech",
    keywords: ["payments", "fintech", "developer", "API", "infrastructure"],
  },
  "vercel.com": {
    name: "Vercel",
    description: "Vercel brand — pure black/white, geometric precision, developer-first",
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    accentColor: "#0070F3",
    backgroundColor: "#000000",
    fontStyle: "Geist, sans-serif, minimal",
    mood: "sharp, developer, modern tech",
    keywords: ["deployment", "Next.js", "developer", "cloud", "frontend"],
  },
  "openai.com": {
    name: "OpenAI",
    description: "OpenAI brand — dark, futuristic, AI lab aesthetic",
    primaryColor: "#10A37F",
    secondaryColor: "#202123",
    accentColor: "#FFFFFF",
    backgroundColor: "#202123",
    fontStyle: "Söhne, sans-serif, clean",
    mood: "futuristic, research, cutting-edge AI",
    keywords: ["AI", "GPT", "research", "machine learning", "AGI"],
  },
  "anthropic.com": {
    name: "Anthropic",
    description: "Anthropic brand — warm earth tones, trustworthy AI safety",
    primaryColor: "#CC785C",
    secondaryColor: "#1A1A1A",
    accentColor: "#E8D5C4",
    backgroundColor: "#FAF7F2",
    fontStyle: "Tiempos, serif, warm editorial",
    mood: "thoughtful, safe AI, research-focused",
    keywords: ["AI safety", "Claude", "constitutional AI", "research"],
  },
  "github.com": {
    name: "GitHub",
    description: "GitHub brand — dark mode, code-first, open source community",
    primaryColor: "#238636",
    secondaryColor: "#161B22",
    accentColor: "#58A6FF",
    backgroundColor: "#0D1117",
    fontStyle: "Mona Sans, monospace accents, developer",
    mood: "open source, collaborative, technical",
    keywords: ["code", "open source", "developer", "repository", "git"],
  },
  "medium.com": {
    name: "Medium",
    description: "Medium editorial — clean white, serif reading experience",
    primaryColor: "#1A1A1A",
    secondaryColor: "#6B6B6B",
    accentColor: "#1A8917",
    backgroundColor: "#FFFFFF",
    fontStyle: "Charter, Georgia, editorial serif",
    mood: "thoughtful, editorial, long-form reading",
    keywords: ["writing", "story", "editorial", "publication", "blog"],
  },
  "apple.com": {
    name: "Apple",
    description: "Apple brand — ultra-clean white, product photography, iconic minimalism",
    primaryColor: "#1D1D1F",
    secondaryColor: "#515154",
    accentColor: "#0071E3",
    backgroundColor: "#FFFFFF",
    fontStyle: "SF Pro, sans-serif, ultra-refined",
    mood: "premium, minimal, aspirational product",
    keywords: ["product", "design", "premium", "technology", "consumer"],
  },
  "notion.so": {
    name: "Notion",
    description: "Notion brand — soft cream, minimal blocks, calm productivity",
    primaryColor: "#191919",
    secondaryColor: "#37352F",
    accentColor: "#2EAADC",
    backgroundColor: "#FFFFFF",
    fontStyle: "Inter, ui-sans-serif, block-based",
    mood: "calm, structured, productivity-focused",
    keywords: ["productivity", "notes", "docs", "workspace", "team"],
  },
  "figma.com": {
    name: "Figma",
    description: "Figma brand — vibrant multicolor, design system energy",
    primaryColor: "#F24E1E",
    secondaryColor: "#0D0D0D",
    accentColor: "#A259FF",
    backgroundColor: "#1E1E1E",
    fontStyle: "Inter, sans-serif, design-tool precision",
    mood: "creative, collaborative, design-forward",
    keywords: ["design", "prototype", "UI", "collaborate", "vector"],
  },
  "netflix.com": {
    name: "Netflix",
    description: "Netflix brand — cinematic red on pure black, bold title cards",
    primaryColor: "#E50914",
    secondaryColor: "#141414",
    accentColor: "#FFFFFF",
    backgroundColor: "#141414",
    fontStyle: "Netflix Sans, bold display, cinematic",
    mood: "cinematic, bold, entertainment, dramatic",
    keywords: ["streaming", "film", "series", "entertainment", "cinema"],
  },
  "spotify.com": {
    name: "Spotify",
    description: "Spotify brand — electric green on dark, music energy",
    primaryColor: "#1DB954",
    secondaryColor: "#121212",
    accentColor: "#FFFFFF",
    backgroundColor: "#121212",
    fontStyle: "Circular, Gotham, bold display",
    mood: "energetic, music-driven, youthful, bold",
    keywords: ["music", "podcast", "streaming", "playlist", "audio"],
  },
  "twitter.com": {
    name: "X / Twitter",
    description: "X brand — stark black and white, real-time conversation energy",
    primaryColor: "#FFFFFF",
    secondaryColor: "#000000",
    accentColor: "#1D9BF0",
    backgroundColor: "#000000",
    fontStyle: "Chirp, sans-serif, feed-style",
    mood: "real-time, direct, bold, conversational",
    keywords: ["social", "tweet", "news", "conversation", "trending"],
  },
  "x.com": {
    name: "X / Twitter",
    description: "X brand — stark black and white, real-time conversation energy",
    primaryColor: "#FFFFFF",
    secondaryColor: "#000000",
    accentColor: "#1D9BF0",
    backgroundColor: "#000000",
    fontStyle: "Chirp, sans-serif, feed-style",
    mood: "real-time, direct, bold, conversational",
    keywords: ["social", "tweet", "news", "conversation", "trending"],
  },
  "linkedin.com": {
    name: "LinkedIn",
    description: "LinkedIn brand — professional blue, career and business network",
    primaryColor: "#0A66C2",
    secondaryColor: "#004182",
    accentColor: "#FFFFFF",
    backgroundColor: "#F3F2EF",
    fontStyle: "Inter, sans-serif, professional",
    mood: "professional, career-focused, business networking",
    keywords: ["career", "professional", "business", "network", "jobs"],
  },
  "amazon.com": {
    name: "Amazon",
    description: "Amazon brand — orange arrow, everything store energy",
    primaryColor: "#FF9900",
    secondaryColor: "#232F3E",
    accentColor: "#146EB4",
    backgroundColor: "#FFFFFF",
    fontStyle: "Ember, sans-serif, commerce-focused",
    mood: "convenient, massive scale, commerce-driven",
    keywords: ["ecommerce", "shopping", "delivery", "marketplace", "retail"],
  },
  "microsoft.com": {
    name: "Microsoft",
    description: "Microsoft brand — four-color squares, enterprise productivity",
    primaryColor: "#0078D4",
    secondaryColor: "#005A9E",
    accentColor: "#50E6FF",
    backgroundColor: "#FFFFFF",
    fontStyle: "Segoe UI, sans-serif, enterprise",
    mood: "enterprise, productive, accessible, modern",
    keywords: ["productivity", "enterprise", "cloud", "Windows", "Office"],
  },
  "tesla.com": {
    name: "Tesla",
    description: "Tesla brand — pure white/black, electric vehicle minimalism",
    primaryColor: "#CC0000",
    secondaryColor: "#000000",
    accentColor: "#FFFFFF",
    backgroundColor: "#000000",
    fontStyle: "Gotham, sans-serif, automotive minimal",
    mood: "electric, futuristic, premium automotive",
    keywords: ["electric", "vehicle", "energy", "autonomous", "sustainable"],
  },
  "hbr.org": {
    name: "Harvard Business Review",
    description: "HBR brand — deep red, authoritative business journalism",
    primaryColor: "#C8102E",
    secondaryColor: "#1A1A1A",
    accentColor: "#000000",
    backgroundColor: "#FFFFFF",
    fontStyle: "Mercury, Georgia, authoritative serif",
    mood: "authoritative, executive, research-backed, serious",
    keywords: ["business", "leadership", "management", "strategy", "executive"],
  },
  "nytimes.com": {
    name: "New York Times",
    description: "NYT brand — black masthead, newspaper of record gravitas",
    primaryColor: "#000000",
    secondaryColor: "#333333",
    accentColor: "#326891",
    backgroundColor: "#FFFFFF",
    fontStyle: "NYT Cheltenham, Georgia, newspaper serif",
    mood: "journalistic, authoritative, factual, editorial",
    keywords: ["news", "journalism", "reporting", "editorial", "global"],
  },
  "substack.com": {
    name: "Substack",
    description: "Substack brand — warm orange, independent writer energy",
    primaryColor: "#FF6719",
    secondaryColor: "#1A1A1A",
    accentColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    fontStyle: "Georgia, serif, newsletter editorial",
    mood: "independent, direct, writer-first, community",
    keywords: ["newsletter", "writing", "subscription", "independent", "publishing"],
  },
  "wired.com": {
    name: "Wired",
    description: "Wired brand — high contrast black/white, tech culture magazine",
    primaryColor: "#000000",
    secondaryColor: "#1A1A1A",
    accentColor: "#FF0000",
    backgroundColor: "#FFFFFF",
    fontStyle: "Wired-Sans, bold display, magazine editorial",
    mood: "provocative, tech-forward, cultural, bold",
    keywords: ["technology", "culture", "future", "digital", "innovation"],
  },
};

// Score-based multi-signal theme detection
type ThemeSignal = { theme: ThemeInfo; score: number };

function detectThemeFromContent(text: string, title: string): ThemeInfo {
  const combined = (text + " " + title).toLowerCase();
  const has = (...words: string[]) => words.filter(w => combined.includes(w)).length;

  const candidates: ThemeSignal[] = [
    {
      score: has("startup", "founder", "ycombinator", "y combinator", "seed", "series a", "pitch", "demo day", "accelerator"),
      theme: KNOWN_THEMES["paulgraham.com"]!,
    },
    {
      score: has("machine learning", "large language model", "neural network", "deep learning", "transformer", "llm", "gpt", "fine-tuning", "embedding", "inference", "training data"),
      theme: {
        name: "AI / Machine Learning",
        description: "AI research aesthetic — dark, neural, technical precision",
        primaryColor: "#7C3AED",
        secondaryColor: "#1E1B4B",
        accentColor: "#06B6D4",
        backgroundColor: "#0F0F23",
        fontStyle: "Inter, monospace, technical",
        mood: "futuristic, research, data-driven",
        keywords: ["AI", "ML", "model", "neural", "research"],
      },
    },
    {
      score: has("javascript", "typescript", "python", "react", "node", "api", "github", "open source", "developer", "code", "programming", "software", "framework", "library", "backend", "frontend"),
      theme: {
        name: "Developer / Engineering",
        description: "Dark code editor aesthetic — terminal green, monospace, hacker energy",
        primaryColor: "#22C55E",
        secondaryColor: "#0D1117",
        accentColor: "#58A6FF",
        backgroundColor: "#0D1117",
        fontStyle: "JetBrains Mono, Fira Code, monospace",
        mood: "technical, open source, builder energy",
        keywords: ["code", "dev", "engineering", "open source", "build"],
      },
    },
    {
      score: has("finance", "investment", "investor", "revenue", "stock", "market", "portfolio", "hedge fund", "vc", "venture capital", "valuation", "equity", "dividend", "trading", "asset"),
      theme: {
        name: "Finance / Investing",
        description: "Professional finance — navy authority, green gains, Bloomberg terminal vibes",
        primaryColor: "#1E3A5F",
        secondaryColor: "#0F2137",
        accentColor: "#00C896",
        backgroundColor: "#F8FAFC",
        fontStyle: "Inter, sans-serif, data precision",
        mood: "authoritative, data-driven, professional",
        keywords: ["finance", "investment", "market", "revenue", "growth"],
      },
    },
    {
      score: has("design", "ux", "user experience", "ui", "figma", "typography", "brand", "visual", "creative", "illustration", "motion design", "aesthetic", "color palette"),
      theme: {
        name: "Design / Creative",
        description: "Creative studio — vibrant, expressive, portfolio energy",
        primaryColor: "#F72585",
        secondaryColor: "#3A0CA3",
        accentColor: "#4CC9F0",
        backgroundColor: "#0F0F0F",
        fontStyle: "variable font, expressive display, editorial",
        mood: "creative, expressive, visually bold",
        keywords: ["design", "creative", "visual", "brand", "aesthetic"],
      },
    },
    {
      score: has("health", "medical", "clinical", "patient", "doctor", "hospital", "drug", "treatment", "therapy", "biotech", "pharma", "wellness", "mental health", "diagnosis"),
      theme: {
        name: "Health / Medical",
        description: "Medical precision — clean white, trustworthy blue, clinical calm",
        primaryColor: "#0EA5E9",
        secondaryColor: "#0C4A6E",
        accentColor: "#10B981",
        backgroundColor: "#F0F9FF",
        fontStyle: "Inter, clean sans-serif, readable",
        mood: "trustworthy, clean, calm authority",
        keywords: ["health", "medical", "clinical", "wellness", "care"],
      },
    },
    {
      score: has("climate", "sustainability", "renewable", "solar", "carbon", "green energy", "environment", "net zero", "emissions", "biodiversity", "ecology", "clean energy"),
      theme: {
        name: "Climate / Sustainability",
        description: "Earth-toned green energy — organic, hopeful, planetary scale",
        primaryColor: "#16A34A",
        secondaryColor: "#14532D",
        accentColor: "#FCD34D",
        backgroundColor: "#F0FDF4",
        fontStyle: "Inter, organic sans-serif, earthy",
        mood: "hopeful, urgent, planetary, nature-forward",
        keywords: ["climate", "green", "sustainability", "planet", "energy"],
      },
    },
    {
      score: has("crypto", "blockchain", "bitcoin", "ethereum", "defi", "nft", "web3", "smart contract", "dao", "token", "wallet", "protocol"),
      theme: {
        name: "Crypto / Web3",
        description: "Web3 dark mode — neon gradients, decentralized energy",
        primaryColor: "#F7931A",
        secondaryColor: "#1A1A2E",
        accentColor: "#627EEA",
        backgroundColor: "#0A0A1A",
        fontStyle: "Inter, Syne, bold display",
        mood: "decentralized, bold, community-driven",
        keywords: ["crypto", "blockchain", "web3", "DeFi", "protocol"],
      },
    },
    {
      score: has("science", "research", "physics", "biology", "chemistry", "experiment", "hypothesis", "data", "study", "journal", "peer review", "discovery"),
      theme: {
        name: "Science / Research",
        description: "Academic precision — deep navy, clean charts, journal aesthetic",
        primaryColor: "#3B82F6",
        secondaryColor: "#1E3A5F",
        accentColor: "#F59E0B",
        backgroundColor: "#F8FAFC",
        fontStyle: "Merriweather, Charter, academic serif",
        mood: "rigorous, curious, evidence-based",
        keywords: ["science", "research", "data", "discovery", "study"],
      },
    },
    {
      score: has("education", "learning", "school", "university", "course", "teach", "student", "curriculum", "lesson", "knowledge", "skills", "training"),
      theme: {
        name: "Education / Learning",
        description: "Bright learning — bold primaries, clear hierarchy, classroom energy",
        primaryColor: "#8B5CF6",
        secondaryColor: "#1E1B4B",
        accentColor: "#F59E0B",
        backgroundColor: "#FAFAFA",
        fontStyle: "Inter, Nunito, friendly rounded",
        mood: "clear, engaging, accessible, motivating",
        keywords: ["education", "learning", "teach", "course", "knowledge"],
      },
    },
    {
      score: has("marketing", "growth", "seo", "ads", "campaign", "conversion", "funnel", "brand awareness", "social media", "content marketing", "analytics"),
      theme: {
        name: "Marketing / Growth",
        description: "High-energy marketing — bold orange-red, conversion-optimized, punchy",
        primaryColor: "#EF4444",
        secondaryColor: "#7F1D1D",
        accentColor: "#FBBF24",
        backgroundColor: "#0A0A0A",
        fontStyle: "Inter, bold condensed, high-impact",
        mood: "high-energy, persuasive, results-focused",
        keywords: ["marketing", "growth", "conversion", "brand", "campaign"],
      },
    },
    {
      score: has("food", "recipe", "cooking", "restaurant", "chef", "cuisine", "ingredient", "meal", "flavor", "taste", "kitchen"),
      theme: {
        name: "Food / Culinary",
        description: "Warm culinary — rich ochre and terracotta, appetizing and warm",
        primaryColor: "#D97706",
        secondaryColor: "#78350F",
        accentColor: "#EF4444",
        backgroundColor: "#FFFBEB",
        fontStyle: "Playfair Display, Lora, editorial serif",
        mood: "warm, appetizing, artisanal, inviting",
        keywords: ["food", "recipe", "cooking", "flavor", "culinary"],
      },
    },
    {
      score: has("music", "album", "artist", "track", "song", "genre", "playlist", "concert", "band", "producer", "recording"),
      theme: {
        name: "Music",
        description: "Dark stage aesthetic — moody blacks, electric purple, concert energy",
        primaryColor: "#A855F7",
        secondaryColor: "#1A0030",
        accentColor: "#EC4899",
        backgroundColor: "#0A0010",
        fontStyle: "Syne, bold display, expressive",
        mood: "electric, moody, rhythmic, bold",
        keywords: ["music", "audio", "sound", "artist", "performance"],
      },
    },
    {
      score: has("travel", "destination", "adventure", "explore", "country", "city", "tourism", "journey", "itinerary", "culture", "landscape"),
      theme: {
        name: "Travel / Adventure",
        description: "Wanderlust — golden hour tones, world map energy, adventurous",
        primaryColor: "#F59E0B",
        secondaryColor: "#1C1917",
        accentColor: "#06B6D4",
        backgroundColor: "#0C0A09",
        fontStyle: "Playfair Display, serif, adventurous",
        mood: "adventurous, wanderlust, inspiring, global",
        keywords: ["travel", "explore", "destination", "adventure", "culture"],
      },
    },
    {
      score: has("politics", "government", "policy", "election", "democracy", "law", "legislation", "president", "senate", "congress", "vote"),
      theme: {
        name: "Politics / Policy",
        description: "Civic authority — deep red/blue contrast, newspaper gravitas",
        primaryColor: "#1D4ED8",
        secondaryColor: "#1E3A5F",
        accentColor: "#DC2626",
        backgroundColor: "#F8FAFC",
        fontStyle: "Times New Roman, Georgia, newspaper serif",
        mood: "authoritative, serious, civic, newsworthy",
        keywords: ["politics", "policy", "democracy", "government", "civic"],
      },
    },
  ];

  // Pick highest scoring theme (minimum score of 1 to qualify)
  const best = candidates
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (best) return best.theme;

  // Default: clean editorial
  return {
    name: "Editorial",
    description: "Clean editorial aesthetic — readable, professional content video",
    primaryColor: "#1A1A2E",
    secondaryColor: "#16213E",
    accentColor: "#E94560",
    backgroundColor: "#F8F9FA",
    fontStyle: "Inter, sans-serif, editorial",
    mood: "clean, professional, readable",
    keywords: ["content", "article", "editorial"],
  };
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractMetaContent(html: string, name: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"));
  return m?.[1]?.trim() ?? "";
}

function extractTitle(html: string): string {
  const og = extractMetaContent(html, "og:title");
  if (og) return og;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match?.[1]) return stripHtmlTags(h1Match[1]).trim();
  return "";
}

function extractAuthor(html: string, domain: string): string {
  const authorMeta = extractMetaContent(html, "author") || extractMetaContent(html, "article:author");
  if (authorMeta) return authorMeta;
  if (domain.includes("paulgraham.com")) return "Paul Graham";
  return "";
}

function extractKeyParagraphs(html: string, maxChars = 4000): string {
  // Extract paragraph text from HTML body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch?.[1] ?? html;
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  let totalChars = 0;
  while ((match = pRegex.exec(body)) !== null) {
    const text = stripHtmlTags(match[1]).trim();
    if (text.length > 40) {
      paragraphs.push(text);
      totalChars += text.length;
      if (totalChars >= maxChars) break;
    }
  }
  if (paragraphs.length === 0) {
    return stripHtmlTags(body).slice(0, maxChars);
  }
  return paragraphs.join("\n\n");
}

function extractKeyPoints(fullText: string): string[] {
  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 60 && s.length < 300);
  // Pick up to 6 impactful sentences (ones with strong verbs / short punchy structure)
  return sentences.slice(0, 6);
}

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new MCPServer({
  name: "remotion-mcp",
  title: "Remotion Video Creator",
  version: "2.0.0",
  description:
    "Create Remotion videos from multi-file React projects with props-first composition design.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// --- Rule tools ---

server.tool(
  { name: "read_me", description: "IMPORTANT: Call this FIRST. Returns the guide overview and lists all available rule tools." },
  async () => text(RULE_INDEX)
);

server.tool(
  { name: "rule_react_code", description: "Project code reference: file structure, supported imports, component/props patterns" },
  async () => text(RULE_REACT_CODE)
);

server.tool(
  { name: "rule_remotion_animations", description: "Remotion animations: useCurrentFrame, frame-driven animation fundamentals" },
  async () => text(RULE_REMOTION_ANIMATIONS)
);

server.tool(
  { name: "rule_remotion_timing", description: "Remotion timing: interpolate, spring, Easing, spring configs, delay, duration" },
  async () => text(RULE_REMOTION_TIMING)
);

server.tool(
  { name: "rule_remotion_sequencing", description: "Remotion sequencing: Sequence, delay, nested timing, local frames" },
  async () => text(RULE_REMOTION_SEQUENCING)
);

server.tool(
  { name: "rule_remotion_transitions", description: "Remotion transitions: TransitionSeries, fade, slide, wipe, flip, duration calculation" },
  async () => text(RULE_REMOTION_TRANSITIONS)
);

server.tool(
  { name: "rule_remotion_text_animations", description: "Remotion text: typewriter effect, word highlighting, string slicing" },
  async () => text(RULE_REMOTION_TEXT_ANIMATIONS)
);

server.tool(
  { name: "rule_remotion_trimming", description: "Remotion trimming: cut start/end of animations with negative Sequence from" },
  async () => text(RULE_REMOTION_TRIMMING)
);

server.tool(
  { name: "rule_remotion_diagrams", description: "Animated diagrams: flowcharts, node graphs, bar charts, donuts, timelines, split text+diagram explainer layouts, animated code blocks" },
  async () => text(RULE_REMOTION_DIAGRAMS)
);

// --- Scrape tool ---

server.tool(
  {
    name: "scrape_url",
    description:
      "Fetch a URL and extract its content + intelligently detect the source's theme (colors, typography, mood). " +
      "Use this BEFORE create_video when the user wants to make a video about web content. " +
      "Returns title, author, key content, and a full theme palette (colors, fonts, mood, keywords) so you can create a visually on-brand video.",
    schema: z.object({
      url: z.string().describe("The URL to scrape"),
    }),
  },
  async ({ url }: { url: string }) => {
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RemotionMCP/1.0; +https://remotion.dev)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        return text(`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`);
      }
      html = await response.text();
    } catch (err) {
      return text(`Failed to fetch URL: ${(err as Error).message}`);
    }

    const domain = (() => {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
    })();

    const title = extractTitle(html);
    const author = extractAuthor(html, domain);
    const description = extractMetaContent(html, "og:description") || extractMetaContent(html, "description");
    const fullText = extractKeyParagraphs(html, 5000);
    const keyPoints = extractKeyPoints(fullText);
    const theme = KNOWN_THEMES[domain] ?? detectThemeFromContent(fullText, title);

    const result = {
      url,
      domain,
      title,
      author,
      description,
      theme,
      content: {
        fullText: fullText.slice(0, 3000),
        keyPoints,
        wordCount: fullText.split(/\s+/).length,
      },
      videoGuidance: {
        suggestedTitle: title || "Video",
        colorPalette: `Primary: ${theme.primaryColor}, Secondary: ${theme.secondaryColor}, Accent: ${theme.accentColor}, Background: ${theme.backgroundColor}`,
        typography: theme.fontStyle,
        mood: theme.mood,
        styleNote: `This content is from "${theme.name}". Use the theme: ${theme.description}. ` +
          `Build the video with these exact brand colors. Key visual keywords: ${theme.keywords.join(", ")}.`,
      },
    };

    return text(JSON.stringify(result, null, 2));
  }
);

// --- Video tool ---

const projectVideoSchema = z.object({
  title: z.string().optional().default(DEFAULT_META.title),
  compositionId: z.string().optional().default(DEFAULT_META.compositionId),
  width: z.number().optional().default(DEFAULT_META.width),
  height: z.number().optional().default(DEFAULT_META.height),
  fps: z.number().optional().default(DEFAULT_META.fps),
  durationInFrames: z.number().optional().default(DEFAULT_META.durationInFrames),
  entryFile: z.string().optional().default("/src/Video.tsx"),
  files: z.record(z.string(), z.string()),
  defaultProps: z.record(z.string(), z.unknown()).optional().default({}),
  inputProps: z.record(z.string(), z.unknown()).optional().default({}),
});

const createVideoSchema = z.object({
  files: z.string().describe(
    'REQUIRED. A JSON string of {path: code} mapping file paths to source code. Example: \'{"\/src\/Video.tsx":"import {AbsoluteFill} from \\"remotion\\";\\nexport default function Video(){return <AbsoluteFill\/>;}"}\'. For edits, only include changed files — unchanged files are kept from the previous call.'
  ),
  entryFile: z.string().optional().describe('Entry file path (default: "/src/Video.tsx"). Must match a key in files.'),
  title: z.string().optional().describe("Title shown in the video player"),
  durationInFrames: z.number().optional().describe("Total duration in frames (default: 150)"),
  fps: z.number().optional().describe("Frames per second (default: 30)"),
  width: z.number().optional().describe("Width in pixels (default: 1920)"),
  height: z.number().optional().describe("Height in pixels (default: 1080)"),
});

server.tool(
  {
    name: "create_video",
    description:
      "Create or update a video. The `files` param is a JSON string (not an object) mapping file paths to source code. " +
      'Pass it as: files: JSON.stringify({"/src/Video.tsx": "...your code..."}). ' +
      "For edits, only include changed files — previous files are preserved automatically.",
    schema: createVideoSchema as any,
    widget: {
      name: "remotion-player",
      invoking: "Compiling project...",
      invoked: "Video ready",
    },
  },
  async (rawParams: z.infer<typeof createVideoSchema>, ctx) => {
    const sessionId = ctx.session?.sessionId ?? "default";

    // Parse files from JSON string
    let files: Record<string, string>;
    try {
      const parsed = JSON.parse(rawParams.files);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return failProject('files must be a JSON object like {"\/src\/Video.tsx": "...code..."}');
      }
      files = parsed as Record<string, string>;
    } catch {
      return failProject('files must be a valid JSON string, e.g. \'{"\/src\/Video.tsx":"...code..."}\'');
    }

    if (Object.keys(files).length === 0) {
      return failProject('files must contain at least one file entry.');
    }

    // Merge with previous session state (if any)
    const previous = getSessionProject(sessionId);
    const mergedFiles = previous
      ? { ...previous.files, ...files }
      : files;

    const project = {
      title: rawParams.title ?? previous?.title,
      compositionId: previous?.compositionId,
      width: rawParams.width ?? previous?.width,
      height: rawParams.height ?? previous?.height,
      fps: rawParams.fps ?? previous?.fps,
      durationInFrames: rawParams.durationInFrames ?? previous?.durationInFrames,
      entryFile: rawParams.entryFile ?? previous?.entryFile,
      files: mergedFiles,
      defaultProps: previous?.defaultProps,
      inputProps: previous?.inputProps,
    };

    const parseResult = projectVideoSchema.safeParse(project);
    if (!parseResult.success) {
      return failProject(`Invalid input: ${formatZodIssues(parseResult.error)}`);
    }

    const statusLines: string[] = [];
    if (previous) {
      statusLines.push("Merged with previous project.");
    }

    return compileAndRespondWithProject(parseResult.data, sessionId, statusLines, "create_video");
  }
);

server.get("/.well-known/openai-apps-challenge", (c) => {
  return c.text("gP0NHv0ywqzsT3-iJ5is_xR6HysaW9Gbls7TeneGl8M");
});

await server.listen(port);
