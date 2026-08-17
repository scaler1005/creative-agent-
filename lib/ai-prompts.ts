import Anthropic from "@anthropic-ai/sdk";
import type { ProductInfo, StoreOffer } from "./scraper";

interface CreativeConcept {
  concept: string;
  description: string;
  prompt: string;
  reference_product_index: number;
}

interface StoreLearnings {
  winningPatterns: string[];
  angles: string[];
  offers: string[];
}

export async function generateCreativeConcepts(
  products: ProductInfo[],
  storeOffer: StoreOffer,
  funnelStage: string,
  creativeType: string[],
  format: string,
  storeLearnings?: StoreLearnings,
  context?: string
): Promise<CreativeConcept[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-...") {
    return fallbackConcepts(products, storeOffer, funnelStage, creativeType, format, storeLearnings, context);
  }

  const client = new Anthropic({ apiKey });

  const isRaw = creativeType.includes("raw");
  const formatLabel = format === "9:16" ? "9:16 vertical (story/reel)" : "1:1 square (feed)";

  const productList = products
    .map((p, i) => `${i}. ${p.name} — ${p.price || "no price"}${p.originalPrice ? ` (was ${p.originalPrice})` : ""}`)
    .join("\n");

  const learningsBlock = storeLearnings
    ? `
STORE LEARNINGS (use these — they're proven winners):
- Winning patterns: ${storeLearnings.winningPatterns.join("; ") || "none yet"}
- Angles that work: ${storeLearnings.angles.join("; ") || "none yet"}
- Offers: ${storeLearnings.offers.join("; ") || "none yet"}`
    : "";

  const systemPrompt = `You are a performance creative strategist for e-commerce Meta Ads. You create ad creative concepts that convert.

Rules:
- Every concept must be based on a REAL product from the list
- ${isRaw ? "RAW iPhone-quality product photography style — no text overlays, no design elements, authentic feel" : "Text-overlay creatives with bold typography"}
- Format: ${formatLabel}
- Funnel stage: ${funnelStage} (BOF = direct response/urgency/social proof, MOF = benefits/comparison/trust, TOF = problem-solution/curiosity/education)
- Prompts must be detailed enough for an AI image generator to create the exact shot
- Focus on what CONVERTS, not what looks pretty`;

  const userPrompt = `Generate exactly 10 creative concepts for these products.

PRODUCTS:
${productList}

STORE OFFER: ${storeOffer.offer || "Standard pricing"}
${storeOffer.isClosingSale ? "⚠️ This is a CLOSING SALE — lean into urgency and scarcity" : ""}
${storeOffer.isFree ? "⚠️ Products are FREE (just pay shipping) — this is the main hook" : ""}
${learningsBlock}
${context ? `\nEXTRA CONTEXT FROM USER: ${context}` : ""}

Return ONLY a JSON array of exactly 10 objects with these fields:
- concept: short name (e.g. "Urgency close-up")
- description: what the creative shows and why it converts (1-2 sentences)
- prompt: detailed image generation prompt for Higgsfield AI (be specific about lighting, angle, composition, mood)
- reference_product_index: which product (0-${products.length - 1})

JSON only, no markdown fences.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.slice(0, 10);
  } catch {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]).slice(0, 10);
      } catch {}
    }
  }

  return fallbackConcepts(products, storeOffer, funnelStage, creativeType, format, storeLearnings, context);
}

function fallbackConcepts(
  products: ProductInfo[],
  storeOffer: StoreOffer,
  funnelStage: string,
  creativeType: string[],
  format: string,
  storeLearnings?: StoreLearnings,
  context?: string
): CreativeConcept[] {
  const isRaw = creativeType.includes("raw");
  const formatLabel = format === "9:16" ? "vertical" : "square";
  const concepts: CreativeConcept[] = [];

  const angles = funnelStage === "BOF"
    ? ["direct response", "urgency", "social proof", "price anchor", "scarcity"]
    : funnelStage === "MOF"
    ? ["benefits", "comparison", "lifestyle", "trust", "quality"]
    : ["problem-solution", "curiosity", "education", "brand story", "awareness"];

  if (storeLearnings?.angles?.length) {
    angles.unshift(...storeLearnings.angles.slice(0, 3));
  }

  for (let i = 0; i < Math.min(10, products.length * angles.length); i++) {
    const pIdx = i % products.length;
    const angle = angles[i % angles.length];
    const p = products[pIdx];

    concepts.push({
      concept: `${angle.charAt(0).toUpperCase() + angle.slice(1)} — ${p.name}`,
      description: `${formatLabel} ${isRaw ? "raw foto" : "text creative"} van ${p.name}. Angle: ${angle}.${storeOffer.offer ? ` Offer: ${storeOffer.offer}` : ""}`,
      prompt: `${isRaw ? "iPhone quality product photo" : "Bold text overlay ad"}, ${p.name}, ${angle}, natural lighting, ${format}, ${context || "clean background"}`,
      reference_product_index: pIdx,
    });

    if (concepts.length >= 10) break;
  }

  return concepts;
}
