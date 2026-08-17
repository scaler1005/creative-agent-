import { scrapeProductPage, ProductInfo, StoreOffer } from "@/lib/scraper";
import { writeJob, writeJobStatus } from "@/lib/job-data";
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
  const { productUrl, adLibraryUrl, funnelStage, creativeType, format, context } =
    await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const events: Array<{ event: string; data: unknown }> = [];
      const jobId = Date.now().toString();

      try {
        sendEvent(controller, "status", "Producten ophalen...");

        const { products, storeName, storeOffer } = await scrapeProductPage(productUrl);

        if (products.length === 0) {
          sendEvent(controller, "error", "Geen producten gevonden op deze pagina");
          controller.close();
          return;
        }

        const selectedProducts = products.slice(0, 5);
        const productsData = {
          storeName,
          count: selectedProducts.length,
          products: selectedProducts.map((p) => ({
            name: p.name,
            price: p.price,
            imageUrl: p.imageUrl,
          })),
        };
        sendEvent(controller, "products", productsData);
        events.push({ event: "products", data: productsData });

        // Save job
        const job = {
          id: jobId,
          storeName,
          productUrl,
          adLibraryUrl,
          funnelStage,
          creativeType,
          format,
          storeOffer,
          products: selectedProducts,
          createdAt: new Date().toISOString(),
        };
        await writeJob(jobId, job);

        // Load store learnings
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

        // Generate concepts
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
        events.push({ event: "concepts", data: concepts });

        // Collect product images as creatives
        sendEvent(controller, "status", "Product images verzamelen...");
        const imageUrls = selectedProducts
          .map((p) => p.imageUrl)
          .filter(Boolean);

        if (imageUrls.length > 0) {
          sendEvent(controller, "images", imageUrls);
          events.push({ event: "images", data: imageUrls });
        }

        // Done
        const doneData = {
          imageCount: imageUrls.length,
          storeName,
          note: `${concepts.length} concepts + ${imageUrls.length} product images. Gebruik de concepts als briefing voor je Canva designs.`,
        };
        sendEvent(controller, "done", doneData);
        events.push({ event: "done", data: doneData });

        await writeJobStatus(jobId, { status: "done", events });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Onbekende fout";
        sendEvent(controller, "error", errorMsg);
        events.push({ event: "error", data: errorMsg });
        await writeJobStatus(jobId, { status: "error", events }).catch(() => {});
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
