import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "stores/" });
    return NextResponse.json({
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobStoreId: !!process.env.BLOB_STORE_ID,
      hasVercel: !!process.env.VERCEL,
      blobCount: blobs.length,
      blobs: blobs.map((b) => ({ pathname: b.pathname, size: b.size, url: b.url?.substring(0, 60) })),
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobStoreId: !!process.env.BLOB_STORE_ID,
    });
  }
}
