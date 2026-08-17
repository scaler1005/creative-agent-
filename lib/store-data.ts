import { list, put, del, get } from "@vercel/blob";
import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";

const STORES_DIR = path.join(process.cwd(), "stores");
const BLOB_PREFIX = "stores/";

function isVercel(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.BLOB_STORE_ID;
}

async function readBlob(url: string): Promise<Record<string, unknown>> {
  const result = await get(url, { access: "private" });
  if (!result || !result.stream) throw new Error(`Blob not found: ${url}`);
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const r = await reader.read();
    if (r.value) chunks.push(r.value);
    done = r.done;
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  return JSON.parse(text);
}

export async function getAllStores(): Promise<Record<string, unknown>[]> {
  if (!isVercel()) {
    const files = await readdir(STORES_DIR);
    return Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => JSON.parse(await readFile(path.join(STORES_DIR, f), "utf-8")))
    );
  }

  const { blobs } = await list({ prefix: BLOB_PREFIX });
  if (blobs.length === 0) return [];

  const stores = await Promise.all(
    blobs.map(async (blob) => readBlob(blob.url))
  );
  return stores;
}

export async function getStore(storeId: string): Promise<Record<string, unknown> | null> {
  if (!isVercel()) {
    try {
      const raw = await readFile(path.join(STORES_DIR, `${storeId}.json`), "utf-8");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${storeId}.json` });
  if (blobs.length === 0) return null;

  return readBlob(blobs[0].url);
}

export async function saveStore(storeId: string, data: Record<string, unknown>): Promise<void> {
  if (!isVercel()) {
    await writeFile(path.join(STORES_DIR, `${storeId}.json`), JSON.stringify(data, null, 2));
    return;
  }

  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${storeId}.json` });
  for (const blob of blobs) {
    await del(blob.url);
  }

  await put(`${BLOB_PREFIX}${storeId}.json`, JSON.stringify(data, null, 2), {
    access: "private",
    contentType: "application/json",
  });
}

export async function seedFromLocal(): Promise<number> {
  const files = await readdir(STORES_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  for (const f of jsonFiles) {
    const raw = await readFile(path.join(STORES_DIR, f), "utf-8");

    const { blobs } = await list({ prefix: `${BLOB_PREFIX}${f}` });
    for (const blob of blobs) {
      await del(blob.url);
    }

    await put(`${BLOB_PREFIX}${f}`, raw, {
      access: "private",
      contentType: "application/json",
    });
  }

  return jsonFiles.length;
}
