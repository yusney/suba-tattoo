import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { URL, URLSearchParams } from "node:url";

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const PORT = 3000;
const HOST = "127.0.0.1";
const STATE_TTL_MS = 5 * 60 * 1000;
/**
 * state -> { expiresAt: number, redirectUri: string }
 * We persist the redirectUri used at /auth GET so the /auth POST can send
 * the EXACT same redirect_uri back to github.com (GitHub rejects mismatches).
 */
const states = new Map();

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing required environment variables: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET");
  process.exit(1);
}

function respond(response, status, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(status, { "Content-Type": contentType });
  response.end(body);
}

function pruneStates() {
  const now = Date.now();
  for (const [state, entry] of states) {
    if (entry.expiresAt <= now) states.delete(state);
  }
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request body too large");
  }
  return body;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? HOST}`);
  console.error(`${new Date().toISOString()} ${request.method} ${url.pathname}`);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return respond(response, 200, "ok");
    }

    if (request.method === "GET" && url.pathname === "/auth") {
      pruneStates();
      const state = randomBytes(32).toString("hex");
      const proto = request.headers["x-forwarded-proto"] ?? "https";
      const host = request.headers["x-forwarded-host"] ?? request.headers.host;
      const redirectUri = `${proto}://${host}/admin/callback`;
      states.set(state, { expiresAt: Date.now() + STATE_TTL_MS, redirectUri });
      const target = new URL("https://github.com/login/oauth/authorize");
      target.search = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: redirectUri, scope: "repo", state }).toString();
      response.writeHead(302, { Location: target.toString() });
      return response.end();
    }

    if (request.method === "POST" && url.pathname === "/auth") {
      pruneStates();
      const contentType = request.headers["content-type"] ?? "";
      const body = await readBody(request);
      const params = contentType.includes("application/json")
        ? Object.fromEntries(Object.entries(JSON.parse(body)))
        : Object.fromEntries(new URLSearchParams(body));
      const code = params.code;
      const state = params.state;
      const stored = state && states.get(state);
      if (!code || !state || !stored) return respond(response, 400, JSON.stringify({ error: "invalid_request" }), "application/json");
      states.delete(state);
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: stored.redirectUri,
        }),
      });
      const result = await tokenResponse.json();
      if (!tokenResponse.ok || !result.access_token) return respond(response, 502, JSON.stringify({ error: result.error ?? "token_exchange_failed", error_description: result.error_description }), "application/json");
      return respond(response, 200, JSON.stringify({ token: result.access_token, provider: "github" }), "application/json");
    }

    return respond(response, 404, "not found");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return respond(response, 500, JSON.stringify({ error: "internal_server_error" }), "application/json");
  }
});

server.listen(PORT, HOST, () => console.error(`Decap OAuth listening on http://${HOST}:${PORT}`));
