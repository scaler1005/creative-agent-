import { createHiggsfieldClient } from "@higgsfield/client/v2";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      error: "Missing HIGGSFIELD_API_KEY or HIGGSFIELD_API_SECRET",
      hasKey: !!apiKey,
      hasSecret: !!apiSecret,
    });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "generate";

  try {
    const client = createHiggsfieldClient({
      credentials: `${apiKey}:${apiSecret}`,
      pollInterval: 3000,
      maxPollTime: 60000,
    });

    const endpoint = searchParams.get("endpoint") || "flux-pro/kontext/max/text-to-image";

    if (mode === "generate") {
      const response = await client.subscribe(
        endpoint,
        {
          input: {
            prompt: "A titanium cooking pan on a white background, product photography",
            aspect_ratio: "1:1",
            safety_tolerance: 2,
          },
          withPolling: true,
        }
      );

      return NextResponse.json({
        success: true,
        status: response.status,
        requestId: response.request_id,
        images: response.images,
      });
    }

    return NextResponse.json({ error: "Use ?mode=generate" });
  } catch (err: unknown) {
    const error = err as Error & { response?: { status?: number; data?: unknown } };
    return NextResponse.json({
      error: error.message,
      name: error.name,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });
  }
}
