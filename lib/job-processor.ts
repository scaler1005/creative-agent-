// Job processor instructions for Claude Code
//
// When a new job appears in ./jobs/{id}.json with a matching
// ./jobs/{id}-status.json that has status "pending":
//
// 1. Read the job file to get store info, products, funnel stage, format
// 2. Update status to "processing"
// 3. If adLibraryUrl provided, analyze competitor ads via Foreplay MCP
// 4. Browse the store URL to determine the REAL offer (prices, sale banners)
// 5. Generate 10 creative concepts using the real store offer
// 6. Generate images via Higgsfield MCP (generate_image_batch)
// 7. Wait for jobs to complete (jobs_wait)
// 8. Upload to Canva MCP if requested
// 9. Update status file with all events and set status to "done"
//
// The status file events array should contain:
// - { event: "status", data: "message" }
// - { event: "concepts", data: [...concepts] }
// - { event: "images", data: [...urls] }
// - { event: "done", data: { imageCount, storeName, canvaUrl?, note? } }
