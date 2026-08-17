import { HiggsfieldClient } from "@higgsfield/client";
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
  const mode = searchParams.get("mode") || "styles";

  try {
    const client = new HiggsfieldClient({
      apiKey,
      apiSecret,
      pollInterval: 3000,
      maxPollTime: 60000,
    });

    if (mode === "styles") {
      const styles = await client.getSoulStyles();
      client.close();
      return NextResponse.json({ success: true, styles });
    }

    if (mode === "generate") {
      const jobSet = await client.generate(
        "/v1/text2image",
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
      return NextResponse.json({ success: true, jobSetId: jobSet.id, jobs });
    }

    client.close();
    return NextResponse.json({ error: "Use ?mode=styles or ?mode=generate" });
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
