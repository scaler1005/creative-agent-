import { NextResponse } from "next/server";
import { seedFromLocal } from "@/lib/store-data";

export async function POST() {
  try {
    const count = await seedFromLocal();
    return NextResponse.json({ success: true, seeded: count });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Seed mislukt" },
      { status: 500 }
    );
  }
}
