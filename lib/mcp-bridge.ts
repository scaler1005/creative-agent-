// This file documents the MCP bridge flow.
// Claude Code processes jobs from ./jobs/ using MCP tools (Higgsfield + Canva).
//
// Job file: ./jobs/{id}.json
// Status file: ./jobs/{id}-status.json
//
// Status file format:
// {
//   "status": "pending" | "processing" | "done" | "error",
//   "events": [
//     { "event": "status", "data": "Concepten genereren..." },
//     { "event": "concepts", "data": [...] },
//     { "event": "images", "data": ["url1", "url2", ...] },
//     { "event": "done", "data": { "canvaUrl": "...", "imageCount": 10, "storeName": "..." } }
//   ]
// }
//
// Claude Code reads the job file, processes via MCP tools, and writes status updates.
