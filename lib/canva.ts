const BASE = "https://api.canva.com/rest/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.CANVA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function uploadAsset(
  url: string,
  name: string
): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/asset-uploads`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name,
      url,
    }),
  });
  const data = await res.json();
  return { id: data.asset?.id ?? data.job?.asset?.id ?? "" };
}

export async function createDesign(
  title: string,
  assetIds: string[]
): Promise<{ designId: string; editUrl: string }> {
  const res = await fetch(`${BASE}/designs`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      design_type: { type: "custom", width: 1080, height: 1080 },
      title,
      asset_ids: assetIds,
    }),
  });
  const data = await res.json();
  return {
    designId: data.design?.id ?? "",
    editUrl: data.design?.urls?.edit_url ?? "",
  };
}
