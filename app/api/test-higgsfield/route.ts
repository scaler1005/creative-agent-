import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  const apiSecret = process.env.HIGGSFIELD_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing keys" });
  }

  try {
    // Step 1: Submit job with v2 auth + v1 body format
    const submitRes = await fetch("https://platform.higgsfield.ai/v1/text2image/soul", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}:${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        params: {
          prompt: "A titanium cooking pan on a white background, product photography",
          width_and_height: "1536x1536",
          quality: "1080p",
          batch_size: 1,
        },
      }),
    });

    const submitData = await submitRes.json();
    if (!submitRes.ok) {
      return NextResponse.json({ error: "Submit failed", status: submitRes.status, data: submitData });
    }

    const requestId = submitData.request_id || submitData.id;

    // Step 2: Poll for completion
    const start = Date.now();
    while (Date.now() - start < 60000) {
      const pollRes = await fetch(
        `https://platform.higgsfield.ai/requests/${requestId}/status`,
        { headers: { Authorization: `Key ${apiKey}:${apiSecret}` } }
      );
      if (pollRes.ok) {
        const pollData = await pollRes.json();
        if (pollData.status === "completed" || pollData.status === "failed" || pollData.status === "nsfw") {
          return NextResponse.json({ success: true, result: pollData });
        }
      }
      await new Promise((r) => setTimeout(r, 3000));
    }

    return NextResponse.json({ error: "Timeout waiting for result" });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, name: error.name });
  }
}
