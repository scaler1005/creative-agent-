import { createHiggsfieldClient } from "@higgsfield/client/v2";

interface GeneratedImage {
  url: string;
  prompt: string;
  conceptIndex: number;
}

const SIZE_MAP: Record<string, string> = {
  "1:1": "1:1",
  "9:16": "9:16",
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

  const client = createHiggsfieldClient({
    credentials: `${apiKey}:${apiSecret}`,
    pollInterval: 3000,
    maxPollTime: 120000,
  });

  const aspectRatio = SIZE_MAP[format] || "1:1";
  const results: GeneratedImage[] = [];

  const batchSize = 3;
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ prompt, conceptIndex }) => {
        const response = await client.subscribe(
          "flux-pro/kontext/max/text-to-image",
          {
            input: {
              prompt,
              aspect_ratio: aspectRatio,
              safety_tolerance: 2,
            },
            withPolling: true,
          }
        );

        if (response.status === "completed" && response.images?.[0]?.url) {
          return {
            url: response.images[0].url,
            prompt,
            conceptIndex,
          };
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

  return results;
}

export function isImageGenConfigured(): boolean {
  return !!process.env.HIGGSFIELD_API_KEY && !!process.env.HIGGSFIELD_API_SECRET;
}
