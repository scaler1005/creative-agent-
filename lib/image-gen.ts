interface GeneratedImage {
  url: string;
  prompt: string;
  conceptIndex: number;
}

const ASPECT_MAP: Record<string, string> = {
  "1:1": "1536x1536",
  "9:16": "1152x2048",
};

async function higgsfieldRequest(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
  apiSecret: string
) {
  const res = await fetch(`https://platform.higgsfield.ai${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}:${apiSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Higgsfield ${res.status}: ${text}`);
  }
  return res.json();
}

async function pollStatus(requestId: string, apiKey: string, apiSecret: string, maxTime = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxTime) {
    const res = await fetch(
      `https://platform.higgsfield.ai/requests/${requestId}/status`,
      {
        headers: {
          Authorization: `Key ${apiKey}:${apiSecret}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.status === "completed" || data.status === "failed" || data.status === "nsfw") {
        return data;
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
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

  const widthAndHeight = ASPECT_MAP[format] || "1536x1536";
  const results: GeneratedImage[] = [];

  const batchSize = 3;
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ prompt, conceptIndex }) => {
        const jobData = await higgsfieldRequest(
          "/v1/text2image/soul",
          {
            params: {
              prompt,
              width_and_height: widthAndHeight,
              quality: "1080p",
              batch_size: 1,
            },
          },
          apiKey,
          apiSecret
        );

        const requestId = jobData.request_id || jobData.id;
        if (!requestId) return null;

        const result = await pollStatus(requestId, apiKey, apiSecret);
        if (result?.status === "completed") {
          const imageUrl =
            result.images?.[0]?.url ||
            result.jobs?.[0]?.results?.raw?.url;
          if (imageUrl) {
            return { url: imageUrl, prompt, conceptIndex };
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

  return results;
}

export function isImageGenConfigured(): boolean {
  return !!process.env.HIGGSFIELD_API_KEY && !!process.env.HIGGSFIELD_API_SECRET;
}
