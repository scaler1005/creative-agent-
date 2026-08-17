import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const JOBS_DIR = join(process.cwd(), "jobs");

export async function GET() {
  try {
    const files = readdirSync(JOBS_DIR)
      .filter((f) => f.endsWith("-status.json"))
      .sort()
      .reverse();

    const jobs = files.map((statusFile) => {
      const jobId = statusFile.replace("-status.json", "");
      const status = JSON.parse(readFileSync(join(JOBS_DIR, statusFile), "utf-8"));
      let job = null;
      try {
        job = JSON.parse(readFileSync(join(JOBS_DIR, `${jobId}.json`), "utf-8"));
      } catch {}
      return { jobId, status: status.status, storeName: job?.storeName, events: status.events };
    });

    return Response.json({ jobs });
  } catch {
    return Response.json({ jobs: [] });
  }
}
