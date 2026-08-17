import { scrapeProductPage, ProductInfo, StoreOffer } from "@/lib/scraper";
import { getAllStores } from "@/lib/store-data";

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify({ event, data })}\n\n`)
  );
}

interface Concept {
  concept: string;
  description: string;
  prompt: string;
  reference_product_index: number;
}

function generateConcepts(
  products: ProductInfo[],
  storeOffer: StoreOffer,
  funnelStage: string,
  creativeType: string[],
  format: string,
  storeLearnings?: { winningPatterns: string[]; angles: string[]; offers: string[] },
  context?: string
): Concept[] {
  const concepts: Concept[] = [];
  const isRaw = creativeType.includes("raw");
  const formatLabel = format === "9:16" ? "vertical (story)" : "square (feed)";

  const angles: string[] = [];

  if (funnelStage === "BOF") {
    angles.push("direct response", "urgency", "social proof", "price anchor");
  } else if (funnelStage === "MOF") {
    angles.push("benefits", "comparison", "lifestyle", "trust");
  } else {
    angles.push("problem-solution", "curiosity", "education", "brand story");
  }

  if (storeOffer.isFree) {
    angles.unshift("free offer");
  } else if (storeOffer.isClosingSale) {
    angles.unshift("closing sale urgency");
  }

  if (storeLearnings?.angles?.length) {
    angles.unshift(...storeLearnings.angles.slice(0, 3));
  }

  const usedAngles = angles.slice(0, 10);

  for (let i = 0; i < Math.min(10, products.length * usedAngles.length); i++) {
    const productIdx = i % products.length;
    const angleIdx = i % usedAngles.length;
    const product = products[productIdx];
    const angle = usedAngles[angleIdx];

    let description = "";
    let prompt = "";

    if (isRaw) {
      description = `${formatLabel} raw-style foto van ${product.name}. Angle: ${angle}.`;
      prompt = `iPhone-kwaliteit foto, ${product.name}, ${angle} angle, natuurlijk licht, geen tekst overlay, authentiek gevoel, ${format} formaat`;
    } else {
      description = `${formatLabel} text creative voor ${product.name}. Angle: ${angle}.`;
      prompt = `Tekst-overlay creative, ${product.name}${product.price ? ` (${product.price})` : ""}, ${angle}, ${storeOffer.offer || "shop now"}, bold typografie, ${format} formaat`;
    }

    if (storeOffer.offer) {
      description += ` Offer: ${storeOffer.offer}`;
    }

    if (context) {
      description += ` Context: ${context}`;
      prompt += `, ${context}`;
    }

    if (storeLearnings?.winningPatterns?.length) {
      prompt += `. Bewezen patronen: ${storeLearnings.winningPatterns.slice(0, 2).join(", ")}`;
    }

    concepts.push({
      concept: `${angle.charAt(0).toUpperCase() + angle.slice(1)} — ${product.name}`,
      description,
      prompt,
      reference_product_index: productIdx,
    });

    if (concepts.length >= 10) break;
  }

  return concepts;
}

export async function POST(req: Request) {
  const { productUrl, funnelStage, creativeType, format, context } =
    await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, "status", "Producten ophalen...");

        const { products, storeName, storeOffer } = await scrapeProductPage(productUrl);

        if (products.length === 0) {
          sendEvent(controller, "error", "Geen producten gevonden op deze pagina");
          controller.close();
          return;
        }

        const selectedProducts = products.slice(0, 5);
        sendEvent(controller, "products", {
          storeName,
          count: selectedProducts.length,
          products: selectedProducts.map((p) => ({
            name: p.name,
            price: p.price,
            imageUrl: p.imageUrl,
          })),
        });

        sendEvent(controller, "status", "Store data laden...");
        let storeLearnings: { winningPatterns: string[]; angles: string[]; offers: string[] } | undefined;
        try {
          const stores = await getAllStores();
          const matchedStore = stores.find(
            (s) => (s.name as string)?.toLowerCase().includes(storeName.toLowerCase().split(" ")[0])
              || (s.url as string)?.includes(new URL(productUrl).hostname)
          );
          if (matchedStore?.learnings) {
            const l = matchedStore.learnings as { winningPatterns?: string[]; angles?: string[]; offers?: string[] };
            storeLearnings = {
              winningPatterns: l.winningPatterns || [],
              angles: l.angles || [],
              offers: l.offers || [],
            };
          }
        } catch {}

        sendEvent(controller, "status", "Creative concepts genereren...");
        const concepts = generateConcepts(
          selectedProducts,
          storeOffer,
          funnelStage || "BOF",
          creativeType || ["raw"],
          format || "1:1",
          storeLearnings,
          context
        );

        sendEvent(controller, "concepts", concepts);

        sendEvent(controller, "done", {
          storeName,
          conceptCount: concepts.length,
          note: `${concepts.length} prompts klaar. Geef ze aan Claude Code om via Higgsfield MCP te genereren en naar Canva te uploaden.`,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Onbekende fout";
        sendEvent(controller, "error", errorMsg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
