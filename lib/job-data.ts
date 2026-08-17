import { list, put, del, get } from "@vercel/blob";
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const JOBS_DIR = join(process.cwd(), "jobs");
const BLOB_PREFIX = "jobs/";

function isVercel(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.BLOB_STORE_ID;
}

function ensureJobsDir() {
  if (!existsSync(JOBS_DIR)) mkdirSync(JOBS_DIR, { recursive: true });
}

export async function writeJob(jobId: string, data: Record<string, unknown>): Promise<void> {
  if (!isVercel()) {
    ensureJobsDir();
    writeFileSync(join(JOBS_DIR, `${jobId}.json`), JSON.stringify(data, null, 2));
    return;
  }
  await put(`${BLOB_PREFIX}${jobId}.json`, JSON.stringify(data, null, 2), {
    access: "private",
    contentType: "application/json",
  });
}

export async function writeJobStatus(jobId: string, status: Record<string, unknown>): Promise<void> {
  if (!isVercel()) {
    ensureJobsDir();
    writeFileSync(join(JOBS_DIR, `${jobId}-status.json`), JSON.stringify(status));
    return;
  }
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${jobId}-status.json` });
  for (const blob of blobs) await del(blob.url);
  await put(`${BLOB_PREFIX}${jobId}-status.json`, JSON.stringify(status), {
    access: "private",
    contentType: "application/json",
  });
}

export async function readJobStatus(jobId: string): Promise<Record<string, unknown> | null> {
  if (!isVercel()) {
    const path = join(JOBS_DIR, `${jobId}-status.json`);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      return null;
    }
  }
  const { blobs } = await list({ prefix: `${BLOB_PREFIX}${jobId}-status.json` });
  if (blobs.length === 0) return null;
  const result = await get(blobs[0].url);
  const text = await result.text();
  return JSON.parse(text);
}

export async function getAllJobs(): Promise<Array<{ jobId: string; status: string; storeName?: string; events: Array<{ event: string; data: unknown }> }>> {
  if (!isVercel()) {
    ensureJobsDir();
    try {
      const files = readdirSync(JOBS_DIR)
        .filter((f) => f.endsWith("-status.json"))
        .sort()
        .reverse();

      return files.map((statusFile) => {
        const jobId = statusFile.replace("-status.json", "");
        const status = JSON.parse(readFileSync(join(JOBS_DIR, statusFile), "utf-8"));
        let job = null;
        try {
          job = JSON.parse(readFileSync(join(JOBS_DIR, `${jobId}.json`), "utf-8"));
        } catch {}
        return { jobId, status: status.status, storeName: job?.storeName, events: status.events || [] };
      });
    } catch {
      return [];
    }
  }

  const { blobs } = await list({ prefix: BLOB_PREFIX });
  const statusBlobs = blobs.filter((b) => b.pathname.endsWith("-status.json"));

  const jobs = await Promise.all(
    statusBlobs.map(async (blob) => {
      const jobId = blob.pathname.replace(BLOB_PREFIX, "").replace("-status.json", "");
      const statusResult = await get(blob.url);
      const statusText = await statusResult.text();
      const status = JSON.parse(statusText);

      let storeName: string | undefined;
      const jobBlob = blobs.find((b) => b.pathname === `${BLOB_PREFIX}${jobId}.json`);
      if (jobBlob) {
        try {
          const jobResult = await get(jobBlob.url);
          const jobText = await jobResult.text();
          const job = JSON.parse(jobText);
          storeName = job.storeName;
        } catch {}
      }

      return { jobId, status: status.status, storeName, events: status.events || [] };
    })
  );

  return jobs.sort((a, b) => b.jobId.localeCompare(a.jobId));
}
