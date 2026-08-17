import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    hasVercel: !!process.env.VERCEL,
    nodeEnv: process.env.NODE_ENV,
  });
}
