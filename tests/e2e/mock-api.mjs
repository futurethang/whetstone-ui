// Minimal stand-in for the data API (futurethang/whetstone /api/v1), used by the Playwright tests.
import { createServer } from "node:http";

const TOKEN = process.env.MOCK_API_TOKEN ?? "test-api-token";
const PORT = Number(process.env.MOCK_API_PORT ?? 4010);
const now = () => new Date().toISOString();

const topic = (id, entries, stale = 0) => ({
  id,
  parent: id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : null,
  review_interval: "1 year",
  review_interval_days: 365,
  entries,
  by_status: { emerging: 0, contested: 0, established: entries, deprecated: 0 },
  stale,
});

const routes = {
  "/api/v1/topics": () => ({
    schema: 1,
    topics: [topic("accessibility", 1), topic("css", 2, 1), topic("css/layout", 1), topic("css/cascade", 1), topic("web-apis", 1)],
    precedence_notice: "Team standards in the consuming repository take precedence over Whetstone entries.",
    generated_at: now(),
  }),
};

createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  if (url.pathname === "/health") return send(200, { ok: true });
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { error: "unauthorized" });
  const route = routes[url.pathname];
  return route ? send(200, route()) : send(404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`mock data API on http://127.0.0.1:${PORT}`));
