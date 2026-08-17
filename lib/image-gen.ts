import { HiggsfieldClient } from "@higgsfield/client";

interface GeneratedImage {
  url: string;
  prompt: string;
  conceptIndex: number;
}

const SIZE_MAP: Record<string, string> = {
  "1:1": "1536x1536",
  "9:16": "1152x2048",
};

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

  const widthAndHeight = SIZE_MAP[format] || "1536x1536";
  const results: GeneratedImage[] = [];

  const batchSize = 3;
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ prompt, conceptIndex }) => {
        const jobSet = await client.generate(
          "/v1/text2image/soul",
          {
            prompt,
            width_and_height: widthAndHeight,
            quality: "1080p",
            batch_size: 1,
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
