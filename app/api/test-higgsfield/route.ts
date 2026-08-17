import { HiggsfieldClient } from "@higgsfield/client";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      error: "Missing HIGGSFIELD_API_KEY or HIGGSFIELD_API_SECRET",
      hasKey: !!apiKey,
      hasSecret: !!apiSecret,
    });
  }

  try {
    const client = new HiggsfieldClient({
      apiKey,
      apiSecret,
      pollInterval: 3000,
      maxPollTime: 60000,
    });

    // Try a simple generation
    const jobSet = await client.generate(
      "soul/standard",
      {
        prompt: "A titanium cooking pan on a white background, product photography",
        aspect_ratio: "1:1",
        num_images: 1,
      },
      { withPolling: true }
    );

    const jobs = jobSet.jobs.map((j) => ({
      id: j.id,
      status: j.status,
      results: j.results,
    }));

    client.close();

    return NextResponse.json({
      success: true,
      jobSetId: jobSet.id,
      jobs,
    });
  } catch (err: unknown) {
    const error = err as Error & { response?: { status?: number; data?: unknown } };
    return NextResponse.json({
      error: error.message,
      name: error.name,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack?.split("\n").slice(0, 5),
    });
  }
}
