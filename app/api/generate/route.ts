import { scrapeProductPage } from "@/lib/scraper";
import { writeJob, writeJobStatus, readJobStatus } from "@/lib/job-data";

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
  const { productUrl, adLibraryUrl, funnelStage, creativeType, format } =
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

        const jobId = Date.now().toString();

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
        await writeJobStatus(jobId, { status: "pending", events: [] });

        sendEvent(controller, "status", "Job aangemaakt — wachten op verwerking...");
        sendEvent(controller, "job", { jobId });

        let lastEventCount = 0;
        const maxWait = 300000;
        const start = Date.now();

        while (Date.now() - start < maxWait) {
          await new Promise((r) => setTimeout(r, 3000));

          const status = await readJobStatus(jobId);
          if (!status) continue;

          const events = (status.events as Array<{ event: string; data: unknown }>) || [];
          if (events.length > lastEventCount) {
            for (let i = lastEventCount; i < events.length; i++) {
              sendEvent(controller, events[i].event, events[i].data);
            }
            lastEventCount = events.length;
          }

          if (status.status === "done" || status.status === "error") {
            break;
          }
        }

        if (Date.now() - start >= maxWait) {
          sendEvent(controller, "error", "Timeout: verwerking duurde te lang");
        }
      } catch (err) {
        sendEvent(
          controller,
          "error",
          err instanceof Error ? err.message : "Onbekende fout"
        );
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
