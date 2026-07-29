import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { URL, URLSearchParams } from "node:url";

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const PORT = 3000;
const HOST = "127.0.0.1";
const STATE_TTL_MS = 5 * 60 * 1000;
/**
 * state -> { expiresAt: number, redirectUri: string }
 * We persist the redirectUri used at /auth GET so the callback GET and legacy
 * /auth POST can send the EXACT same redirect_uri to github.com.
 */
const states = new Map();

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing required environment variables: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET");
  process.exit(1);
}

function respond(response, status, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  response.writeHead(status, { "Content-Type": contentType, ...headers });
  response.end(body);
}

function stateFingerprint(state) {
  return typeof state === "string" && state
    ? createHash("sha256").update(state).digest("hex").slice(0, 12)
    : undefined;
}

function sanitizeLogValue(value) {
  if (typeof value !== "string") return value;
  return value.replace(/[\r\n\t]/g, " ").slice(0, 500);
}

function logEvent(event, fields = {}) {
  console.error(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields }));
}

function pruneStates() {
  const now = Date.now();
  for (const [state, entry] of states) {
    if (entry.expiresAt <= now) states.delete(state);
  }
}

function getPublicOrigin(request) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];
  const proto = typeof forwardedProto === "string" && forwardedProto.trim()
    ? forwardedProto.split(",")[0].trim()
    : "https";
  const host = typeof forwardedHost === "string" && forwardedHost.trim()
    ? forwardedHost.trim()
    : request.headers.host;

  if (typeof host !== "string" || !host) throw new Error("Missing public host");
  return `${proto}://${host}`;
}

function callbackMessage(status, payload) {
  return `authorization:github:${status}:${JSON.stringify(payload)}`;
}

function callbackPage(message) {
  // Escape characters that could terminate the inline script if a future
  // provider ever returns a token containing HTML-significant characters.
  const serializedMessage = JSON.stringify(message).replace(/[<>&]/g, character => ({
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
  })[character]);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Authorizing Decap</title>
  </head>
  <body>
    <p>Authorizing Decap...</p>
    <script>
      const opener = window.opener;
      const openerOrigin = window.location.origin;
      const message = ${serializedMessage};
      const receiveMessage = event => {
        if (event.source !== opener || event.origin !== openerOrigin || event.data !== "authorizing:github") {
          return;
        }
        window.removeEventListener("message", receiveMessage, false);
        opener.postMessage(message, openerOrigin);
        window.close();
      };

      if (opener && !opener.closed) {
        window.addEventListener("message", receiveMessage, false);
        opener.postMessage("authorizing:github", openerOrigin);
        window.setTimeout(() => {
          window.removeEventListener("message", receiveMessage, false);
          window.close();
        }, 10000);
      } else {
        window.close();
      }
    </script>
  </body>
</html>`;
}

function respondCallback(response, status, message) {
  return respond(response, status, callbackPage(message), "text/html; charset=utf-8", {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
  });
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new Error("Request body too large");
  }
  return body;
}

async function exchangeCode({ code, state, requestId }) {
  pruneStates();
  const fingerprint = stateFingerprint(state);
  logEvent("oauth_token_exchange_received", {
    requestId,
    stateFingerprint: fingerprint,
    hasCode: Boolean(code),
    hasState: Boolean(state),
  });
  if (!code || !state) {
    const reason = !code && !state ? "missing_code_and_state" : !code ? "missing_code" : "missing_state";
    logEvent("oauth_invalid_request", { requestId, stateFingerprint: fingerprint, reason });
    return { ok: false, status: 400, error: "invalid_request" };
  }
  const stored = states.get(state);
  if (!stored) {
    logEvent("oauth_invalid_request", { requestId, stateFingerprint: fingerprint, reason: "unknown_or_expired_state" });
    return { ok: false, status: 400, error: "invalid_request" };
  }
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
  const result = await tokenResponse.json().catch(() => ({}));
  const accessToken = result && typeof result === "object" ? result.access_token : undefined;
  const githubError = result && typeof result === "object" ? result.error : undefined;
  const githubErrorDescription = result && typeof result === "object" ? result.error_description : undefined;
  if (!tokenResponse.ok || typeof accessToken !== "string" || !accessToken) {
    logEvent("oauth_github_token_exchange_failed", {
      requestId,
      stateFingerprint: fingerprint,
      githubStatus: tokenResponse.status,
      githubError: sanitizeLogValue(githubError),
      githubErrorDescription: sanitizeLogValue(githubErrorDescription),
    });
    return {
      ok: false,
      status: 502,
      error: typeof githubError === "string" ? githubError : "token_exchange_failed",
      errorDescription: typeof githubErrorDescription === "string" ? githubErrorDescription : undefined,
    };
  }
  logEvent("oauth_token_exchange_succeeded", {
    requestId,
    stateFingerprint: fingerprint,
    githubStatus: tokenResponse.status,
  });
  return { ok: true, token: accessToken };
}

async function handleTokenExchange(request, response, requestId) {
  const contentType = request.headers["content-type"] ?? "";
  const body = await readBody(request);
  const params = contentType.includes("application/json")
    ? Object.fromEntries(Object.entries(JSON.parse(body)))
    : Object.fromEntries(new URLSearchParams(body));
  const exchange = await exchangeCode({ code: params.code, state: params.state, requestId });

  if (!exchange.ok) {
    return respond(
      response,
      exchange.status,
      JSON.stringify({ error: exchange.error, error_description: exchange.errorDescription }),
      "application/json"
    );
  }

  return respond(
    response,
    200,
    JSON.stringify({
      access_token: exchange.token,
      provider: "github",
      token_type: "bearer",
      scope: "repo"
    }),
    "application/json"
  );
}

async function handleCallback(url, response, requestId) {
  const provider = url.searchParams.get("provider");
  if (provider !== "github") {
    logEvent("oauth_invalid_request", { requestId, reason: "invalid_provider" });
    return respondCallback(response, 400, callbackMessage("error", { error: "invalid_provider" }));
  }

  const exchange = await exchangeCode({
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    requestId,
  });
  if (!exchange.ok) {
    return respondCallback(response, exchange.status, callbackMessage("error", { error: exchange.error }));
  }

  return respondCallback(response, 200, callbackMessage("success", { token: exchange.token }));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? HOST}`);
  const requestId = randomBytes(6).toString("hex");
  logEvent("oauth_request_received", { requestId, method: request.method, path: url.pathname });

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      return respond(response, 200, "ok");
    }

    if (request.method === "GET" && url.pathname === "/auth") {
      pruneStates();
      // Decap 3.x's popup-side completeAuth parses the `state` URL parameter
      // as JSON and reads the `.nonce` field. A plain string causes the
      // parse to fail silently, no token exchange POST is made, and the
      // popup closes back to the Login screen. Generate state as a JSON
      // object with a `nonce` field. (GitHub echoes whatever we put in
      // the authorize URL back to us unchanged in /admin/callback.)
      const stateString = JSON.stringify({ nonce: randomBytes(32).toString("hex") });
      // X-Forwarded-Proto may be empty if nginx didn't preserve the incoming
      // header (container-internal port is http://). The public scheme is
      // always https when reached through Cloudflare/Traefik; we default to
      // https so the redirect_uri we hand to GitHub matches the OAuth App's
      // registered callback URL.
      // Keep the callback path already registered in the GitHub OAuth App.
      const redirectUri = `${getPublicOrigin(request)}/admin/callback?provider=github`;
      states.set(stateString, { expiresAt: Date.now() + STATE_TTL_MS, redirectUri });
      logEvent("oauth_authorization_started", {
        requestId,
        stateFingerprint: stateFingerprint(stateString),
        redirectOrigin: new URL(redirectUri).origin,
        stateTtlMs: STATE_TTL_MS,
      });
      const target = new URL("https://github.com/login/oauth/authorize");
      target.search = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: redirectUri, scope: "repo", state: stateString }).toString();
      response.writeHead(302, { Location: target.toString() });
      return response.end();
    }

    if (request.method === "GET" && (url.pathname === "/callback" || url.pathname === "/admin/callback")) {
      return handleCallback(url, response, requestId);
    }

    // Token exchange. Decap calls both /auth (legacy) and /auth/authorize
    // (current v3.x) depending on apiURL form. We accept either.
    if (request.method === "POST" && (url.pathname === "/auth" || url.pathname === "/auth/authorize")) {
      return handleTokenExchange(request, response, requestId);
    }

    return respond(response, 404, "not found");
  } catch (error) {
    logEvent("oauth_unexpected_internal_error", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return respond(response, 500, JSON.stringify({ error: "internal_server_error" }), "application/json");
  }
});

server.listen(PORT, HOST, () => console.error(`Decap OAuth listening on http://${HOST}:${PORT}`));
