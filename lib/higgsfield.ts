const BASE = "https://api.higgsfield.ai/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function importMedia(url: string): Promise<string> {
  const res = await fetch(`${BASE}/media/import`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url, type: "image" }),
  });
  const data = await res.json();
  return data.media_id;
}

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  aspect_ratio?: string;
  reference_media_id?: string;
}

export async function generateImageBatch(
  requests: GenerateImageParams[]
): Promise<Array<{ index: number; job_id: string }>> {
  const body = {
    requests: requests.map((r, i) => ({
      index: i,
      params: {
        model: r.model ?? "nano_banana_pro",
        aspect_ratio: r.aspect_ratio ?? "1:1",
        prompt: r.prompt,
        ...(r.reference_media_id
          ? { medias: [{ value: r.reference_media_id, role: "image" }] }
          : {}),
      },
    })),
  };

  const res = await fetch(`${BASE}/images/batch`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.jobs;
}

export async function waitForJobs(
  jobs: Array<{ index: number; job_id: string }>
): Promise<Array<{ index: number; job_id: string; status: string; result_url?: string }>> {
  const pending = new Map(jobs.map((j) => [j.job_id, j]));
  const results: Array<{ index: number; job_id: string; status: string; result_url?: string }> = [];

  while (pending.size > 0) {
    const batch = Array.from(pending.values()).slice(0, 12);
    const res = await fetch(`${BASE}/jobs/wait`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        jobs: batch.map((j) => ({ index: j.index, job_id: j.job_id })),
        timeout_seconds: 15,
      }),
    });
    const data = await res.json();

    for (const job of data.jobs) {
      if (job.status === "completed" || job.status === "failed") {
        pending.delete(job.job_id);
        results.push(job);
      }
    }

    if (pending.size > 0) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return results.sort((a, b) => a.index - b.index);
}
