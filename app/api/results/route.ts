import { getAllJobs } from "@/lib/job-data";

export async function GET() {
  try {
    const jobs = await getAllJobs();
    return Response.json({ jobs });
  } catch {
    return Response.json({ jobs: [] });
  }
}
