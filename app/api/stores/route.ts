import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import path from "path";

const STORES_DIR = path.join(process.cwd(), "stores");

export async function GET() {
  try {
    const files = await readdir(STORES_DIR);
    const stores = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          const raw = await readFile(path.join(STORES_DIR, f), "utf-8");
          return JSON.parse(raw);
        })
    );
    return NextResponse.json(stores);
  } catch {
    return NextResponse.json([]);
  }
}
