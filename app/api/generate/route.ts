import { scrapeProductPage } from "@/lib/scraper";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const JOBS_DIR = join(process.cwd(), "jobs");

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
        // Step 1: Scrape products
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

        // Step 2: Write job file for Claude Code MCP processing
        const jobId = Date.now().toString();
        const jobFile = join(JOBS_DIR, `${jobId}.json`);
        const statusFile = join(JOBS_DIR, `${jobId}-status.json`);

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

        writeFileSync(jobFile, JSON.stringify(job, null, 2));
        writeFileSync(
          statusFile,
          JSON.stringify({ status: "pending", events: [] })
        );

        sendEvent(controller, "status", "Wachten op MCP verwerking...");
        sendEvent(controller, "job", { jobId });

        // Poll for status updates from Claude Code MCP processing
        let lastEventCount = 0;
        const maxWait = 300000; // 5 minutes
        const start = Date.now();

        while (Date.now() - start < maxWait) {
          await new Promise((r) => setTimeout(r, 2000));

          if (!existsSync(statusFile)) continue;

          try {
            const raw = readFileSync(statusFile, "utf-8");
            const status = JSON.parse(raw);

            // Send any new events
            if (status.events && status.events.length > lastEventCount) {
              for (let i = lastEventCount; i < status.events.length; i++) {
                const evt = status.events[i];
                sendEvent(controller, evt.event, evt.data);
              }
              lastEventCount = status.events.length;
            }

            if (status.status === "done" || status.status === "error") {
              break;
            }
          } catch {
            // file being written, retry
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
