import { NextResponse } from "next/server";
import { list, get, head } from "@vercel/blob";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "stores/" });

    const tests: Record<string, unknown> = {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobStoreId: !!process.env.BLOB_STORE_ID,
      hasVercel: !!process.env.VERCEL,
      blobCount: blobs.length,
    };

    if (blobs.length > 0) {
      const testBlob = blobs[0];

      // Test head()
      try {
        const h = await head(testBlob.url);
        tests.headOk = true;
        tests.downloadUrl = h.downloadUrl?.substring(0, 80);
      } catch (e) {
        tests.headError = e instanceof Error ? e.message : String(e);
      }

      // Test get() with URL
      try {
        const g = await get(testBlob.url, { access: "private" });
        if (g && g.stream) {
          const reader = g.stream.getReader();
          const { value } = await reader.read();
          reader.releaseLock();
          tests.getUrlOk = true;
          tests.getUrlPreview = value ? new TextDecoder().decode(value).substring(0, 50) : "empty";
        } else {
          tests.getUrlResult = "null or no stream";
        }
      } catch (e) {
        tests.getUrlError = e instanceof Error ? e.message : String(e);
      }

      // Test get() with pathname
      try {
        const g = await get(testBlob.pathname, { access: "private" });
        if (g && g.stream) {
          const reader = g.stream.getReader();
          const { value } = await reader.read();
          reader.releaseLock();
          tests.getPathnameOk = true;
          tests.getPathnamePreview = value ? new TextDecoder().decode(value).substring(0, 50) : "empty";
        } else {
          tests.getPathnameResult = "null or no stream";
        }
      } catch (e) {
        tests.getPathnameError = e instanceof Error ? e.message : String(e);
      }

      // Test head() downloadUrl fetch
      try {
        const h = await head(testBlob.url);
        const res = await fetch(h.downloadUrl);
        tests.headFetchStatus = res.status;
        if (res.ok) {
          const text = await res.text();
          tests.headFetchPreview = text.substring(0, 50);
        } else {
          tests.headFetchBody = await res.text();
        }
      } catch (e) {
        tests.headFetchError = e instanceof Error ? e.message : String(e);
      }
    }

    return NextResponse.json(tests);
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
