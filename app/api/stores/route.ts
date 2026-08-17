import { NextResponse } from "next/server";
import { getAllStores } from "@/lib/store-data";

export async function GET() {
  try {
    const stores = await getAllStores();
    return NextResponse.json(stores);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
