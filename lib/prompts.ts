export function buildSystemPrompt(funnelStage: string, competitorPatterns?: string) {
  const styleGuide =
    funnelStage === "BOF"
      ? `Visual style: BOF (Bottom of Funnel) — VALIDATED COMPETITOR PATTERNS

These are the EXACT creative patterns that are scaling on Meta right now for similar stores. Your prompts MUST match these formats:

PATTERN 1: "Torn Paper + Product in Hand"
- Person's hands holding/wearing the product
- A piece of TORN or RIPPED white paper with handwritten text in RED and BLACK marker
- Text examples: "WE'RE CLOSING, EVERYTHING IS FREE", "BUY 3 GET 5 FREE", "LAST CHANCE"
- Workshop, store shelf, or wooden table background
- iPhone photo feel, warm natural lighting

PATTERN 2: "Product in Box + Handwritten Note"
- Product displayed in an open branded box or on velvet/fabric
- Torn white paper or cardboard placed in front with handwritten message
- Background shows a real workshop/store environment (shelves, tools, incense)
- Cozy, authentic, lived-in feeling

PATTERN 3: "Worn Product + Paper Sign"
- Close-up of arm/wrist/neck wearing the product
- Other hand holds a torn paper note with the offer
- Background is contextual (cultural tiles, wooden surfaces, outdoor)
- Feels like a real person showing their jewelry

CRITICAL RULES:
- ALWAYS include a torn/ripped piece of white paper with handwritten text
- Text should be in TWO colors: BLACK marker for regular words, RED marker for emphasis (FREE, CLOSING, numbers)
- ALWAYS show the actual product being worn or held
- iPhone photo quality — NOT studio, NOT polished, NOT stock
- Warm natural lighting, slightly imperfect composition
- Background must feel like a real place (workshop, store, home)
- Start prompts with "iPhone photo of..."
- Use: "casual snapshot", "torn white paper", "handwritten marker text", "warm natural light"
- Never use: "professional", "studio", "clean", "modern", "minimalist"`
      : funnelStage === "MOF"
        ? `Visual style: MOF (Middle of Funnel)
- Product demos, comparisons, how-to style
- More structured but still authentic
- Lifestyle context showing product in use`
        : `Visual style: TOF (Top of Funnel)
- Scroll-stoppers, pattern interrupts
- Can be more polished
- Focus on curiosity and attention`;

  return `You are a creative strategist for e-commerce ad campaigns. You generate static ad image concepts based on VALIDATED competitor winning patterns.

Your job:
1. Analyze the product data, prices, and sale/offer story from the store
2. Study the competitor patterns described below
3. Generate exactly 10 unique image prompts that MATCH the proven competitor creative formats
4. Each prompt must reference one of the provided product images as a visual reference
5. The OFFER TEXT on every creative must reflect the REAL store offer — derive it from the product prices and store context (e.g. if prices show "¥12,900 → ¥0 FREE", the offer is "everything is free, just pay shipping")
6. Never invent fake offers — every torn paper / cardboard sign must say something that matches the actual store sale
7. Vary the WORDING and ANGLE of the same real offer across 10 creatives (e.g. "Everything FREE", "Just pay shipping", "Closing sale — ¥0", "We're giving it all away") but the core offer stays the same

${styleGuide}

${competitorPatterns ? `COMPETITOR AD ANALYSIS:\n${competitorPatterns}\n` : ""}

Product text on physical objects (torn paper, cardboard signs, sticky notes) should be in the store's language.
The handwritten text on each creative should vary the WORDING of the SAME real offer — do NOT invent different promotions like "buy 3 get 5 free" unless the store actually offers that.
Analyze the product prices carefully to determine the real offer before generating concepts.

Output ONLY a JSON array of 10 objects with this structure:
[
  {
    "concept": "Short concept name",
    "description": "1-2 sentences describing the creative and why it works",
    "prompt": "The full image generation prompt",
    "reference_product_index": 0
  }
]

The reference_product_index refers to which product image to use as reference (0-indexed).
Be extremely specific about the torn paper text, marker colors, hand positioning, and background details.
Never write ad copy — only image prompts.`;
}

export function buildUserPrompt(
  storeName: string,
  products: Array<{ name: string; price: string; imageUrl: string }>,
  storeOffer?: { offer: string; isFree: boolean; isClosingSale: boolean; collectionName: string }
) {
  const productList = products
    .map(
      (p, i) =>
        `[${i}] ${p.name} — ${p.price}\n    Image: ${p.imageUrl}`
    )
    .join("\n");

  const offerBlock = storeOffer?.offer
    ? `\n⚠️ REAL STORE OFFER (use this on ALL torn paper signs): "${storeOffer.offer}"
Collection: ${storeOffer.collectionName || "N/A"}
Is free: ${storeOffer.isFree}
Is closing sale: ${storeOffer.isClosingSale}
DO NOT make up different offers. Vary the wording of THIS offer across 10 creatives.\n`
    : "";

  return `Store: ${storeName}

Products available as reference images:
${productList}
${offerBlock}
Generate 10 unique creative concepts. Distribute the reference images across all 10 concepts (don't use only one product).`;
}
