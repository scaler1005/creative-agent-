import { scrapeProductPage } from "@/lib/scraper";
import { writeJob, writeJobStatus } from "@/lib/job-data";
import { getAllStores } from "@/lib/store-data";
import { generateCreativeConcepts } from "@/lib/ai-prompts";
import { generateImages, isImageGenConfigured } from "@/lib/image-gen";

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify({ event, data })}\n\n`)
  );
}

export async function POST(req: Request) {
  const { productUrl, adLibraryUrl, funnelStage, creativeType, format, context } =
    await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const events: Array<{ event: string; data: unknown }> = [];
      const jobId = Date.now().toString();

      try {
        // Step 1: Scrape products
        sendEvent(controller, "status", "Producten ophalen van de store...");
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
        await writeJob(jobId, {
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
        });

        // Step 2: Load store learnings
        sendEvent(controller, "status", "Store learnings laden...");
        let storeLearnings: { winningPatterns: string[]; angles: string[]; offers: string[] } | undefined;
        try {
          const stores = await getAllStores();
          const matchedStore = stores.find(
            (s) =>
              (s.name as string)?.toLowerCase().includes(storeName.toLowerCase().split(" ")[0]) ||
              (s.url as string)?.includes(new URL(productUrl).hostname)
          );
          if (matchedStore?.learnings) {
            const l = matchedStore.learnings as { winningPatterns?: string[]; angles?: string[]; offers?: string[] };
            storeLearnings = {
              winningPatterns: l.winningPatterns || [],
              angles: l.angles || [],
              offers: l.offers || [],
            };
            if (storeLearnings.winningPatterns.length > 0 || storeLearnings.angles.length > 0) {
              sendEvent(controller, "status", `${storeLearnings.winningPatterns.length} patronen + ${storeLearnings.angles.length} angles gevonden`);
            }
          }
        } catch {}

        // Step 3: Generate creative concepts with AI
        sendEvent(controller, "status", "Creative concepts genereren met AI...");
        const concepts = await generateCreativeConcepts(
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
        sendEvent(controller, "status", `${concepts.length} concepts gegenereerd`);

        // Step 4: Generate images with Higgsfield
        let imageUrls: string[] = [];

        if (isImageGenConfigured()) {
          sendEvent(controller, "status", "Images genereren met Higgsfield AI...");

          const prompts = concepts.map((c, i) => ({
            prompt: c.prompt,
            conceptIndex: i,
          }));

          const generated = await generateImages(prompts, format || "1:1", (completed, total) => {
            sendEvent(controller, "status", `Images genereren: ${completed}/${total}...`);
          });

          imageUrls = generated.map((g) => g.url);

          if (imageUrls.length > 0) {
            sendEvent(controller, "images", imageUrls);
            events.push({ event: "images", data: imageUrls });
          } else {
            sendEvent(controller, "status", "Higgsfield images konden niet gegenereerd worden — product images als fallback");
            imageUrls = selectedProducts.map((p) => p.imageUrl).filter(Boolean);
            if (imageUrls.length > 0) {
              sendEvent(controller, "images", imageUrls);
              events.push({ event: "images", data: imageUrls });
            }
          }
        } else {
          // No Higgsfield configured — use product images
          sendEvent(controller, "status", "⚠ Higgsfield niet geconfigureerd — product images als placeholder");
          imageUrls = selectedProducts.map((p) => p.imageUrl).filter(Boolean);
          if (imageUrls.length > 0) {
            sendEvent(controller, "images", imageUrls);
            events.push({ event: "images", data: imageUrls });
          }
        }

        // Step 5: Done
        const missingKeys: string[] = [];
        if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-ant-...") {
          missingKeys.push("ANTHROPIC_API_KEY");
        }
        if (!isImageGenConfigured()) {
          missingKeys.push("HIGGSFIELD_API_KEY + HIGGSFIELD_API_SECRET");
        }

        const note = missingKeys.length > 0
          ? `${concepts.length} concepts + ${imageUrls.length} images. ⚠ Ontbrekende API keys: ${missingKeys.join(", ")}. Voeg deze toe in Vercel → Settings → Environment Variables voor volledige automation.`
          : `${concepts.length} concepts + ${imageUrls.length} AI-generated images.`;

        const doneData = {
          imageCount: imageUrls.length,
          storeName,
          note,
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
