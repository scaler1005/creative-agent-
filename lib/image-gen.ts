import { HiggsfieldClient } from "@higgsfield/client";

interface GeneratedImage {
  url: string;
  prompt: string;
  conceptIndex: number;
}

export async function generateImages(
  prompts: Array<{ prompt: string; conceptIndex: number }>,
  format: string,
  onProgress?: (completed: number, total: number) => void
): Promise<GeneratedImage[]> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;

  if (!apiKey || !apiSecret) {
    return [];
  }

  const client = new HiggsfieldClient({
    apiKey,
    apiSecret,
    pollInterval: 3000,
    maxPollTime: 120000,
  });

  const aspectRatio = format === "9:16" ? "9:16" : "1:1";
  const results: GeneratedImage[] = [];

  // Generate in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ prompt, conceptIndex }) => {
        try {
          const jobSet = await client.generate(
            "soul/standard",
            {
              prompt,
              aspect_ratio: aspectRatio,
              num_images: 1,
            },
            { withPolling: true }
          );

          for (const job of jobSet.jobs) {
            if (job.status === "completed" && job.results?.raw?.url) {
              return {
                url: job.results.raw.url,
                prompt,
                conceptIndex,
              };
            }
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }

    onProgress?.(Math.min(i + batchSize, prompts.length), prompts.length);
  }

  client.close();
  return results;
}

export function isImageGenConfigured(): boolean {
  return !!process.env.HIGGSFIELD_API_KEY && !!process.env.HIGGSFIELD_API_SECRET;
}
