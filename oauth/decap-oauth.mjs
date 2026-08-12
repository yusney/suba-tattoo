import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { URL, URLSearchParams } from "node:url";

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const PORT = 3000;
const HOST = "127.0.0.1";
const STATE_TTL_MS = 5 * 60 * 1000;
// Optional: transactional email via Resend. If any of the three is missing
// the sidecar still boots (so Decap keeps working), but POST /api/contact
// will respond 503 until all three are set.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL;
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL;
const RESEND_API_URL = "https://api.resend.com/emails";
const REQUEST_BODY_LIMIT = 16_384;
// Per-IP sliding-window rate limit for POST /api/contact. OAuth routes are
// intentionally NOT rate-limited here.
const CONTACT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const CONTACT_RATE_LIMIT_MAX = 5;
/**
 * state -> { expiresAt: number, redirectUri: string }
 * We persist the redirectUri used at /auth GET so the callback GET and legacy
 * /auth POST can send the EXACT same redirect_uri to github.com.
 */
const states = new Map();
// ip -> array of request timestamps (ms). Pruned inline on each check.
const contactRateBuckets = new Map();

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing required environment variables: OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET");
  process.exit(1);
}

if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
  // Non-fatal: the CMS proxy still works. /api/contact will return 503.
  console.error(
    "Email route disabled: set RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL to enable POST /api/contact."
  );
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

function stripIpv6Scope(ip) {
  // IPv6 link-local addresses may carry a zone identifier (e.g.
  // `fe80::1%eth0`); without stripping it the same client with a
  // different scope gets bucketed separately and bypasses the rate
  // limit. Canonical form: substring before any `%`.
  const zoneIdx = ip.indexOf("%");
  return zoneIdx === -1 ? ip : ip.substring(0, zoneIdx);
}

function getClientIp(request) {
  // Trust the X-Forwarded-For first hop. The sidecar listens on 127.0.0.1
  // inside the container, so only the upstream proxy (nginx in front of the
  // site, which sets X-Forwarded-For itself before proxying to the sidecar)
  // can reach it. Direct external XFF spoofing is impossible because the
  // sidecar isn't internet-facing. Fall back to socket.remoteAddress if
  // the header is missing (e.g., during local `astro dev` with vite proxy).
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return stripIpv6Scope(first);
  }
  return stripIpv6Scope(request.socket?.remoteAddress ?? "unknown");
}

function checkContactRateLimit(ip, requestId) {
  const now = Date.now();
  // Prune expired entries inline.
  for (const [key, timestamps] of contactRateBuckets) {
    const fresh = timestamps.filter((t) => now - t < CONTACT_RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) contactRateBuckets.delete(key);
    else contactRateBuckets.set(key, fresh);
  }
  const prior = contactRateBuckets.get(ip) ?? [];
  const fresh = prior.filter((t) => now - t < CONTACT_RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= CONTACT_RATE_LIMIT_MAX) {
    contactRateBuckets.set(ip, fresh);
    logEvent("contact_rate_limited", { requestId, ip: sanitizeLogValue(ip) });
    return { ok: false, status: 429, error: "rate_limited" };
  }
  fresh.push(now);
  contactRateBuckets.set(ip, fresh);
  return { ok: true };
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
  // Decode each chunk as UTF-8 BEFORE concatenation. Without this, Node
  // delivers Buffer chunks that we coerce to string via `body += chunk`,
  // and multi-byte chars (á é ñ ç ...) split across chunk boundaries are
  // corrupted by the default decoder.
  request.setEncoding("utf8");
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

// =============================================================================
// /api/contact — transactional email via Resend
// =============================================================================
// Accepts two payload shapes:
//   - contact:  { form: "contact", name, email, body, style, description, website }
//   - booking:  { form: "booking", nombre, email, telefono, estilo, zona,
//                            tamano, fecha, descripcion, sitio_web }
// `website` / `sitio_web` are honeypots — any non-empty value silently returns
// 200 without sending. Reply-To is set to the sender's email so the studio can
// hit "Reply" in their mail client and reach the customer directly.

const FORBIDDEN_PAYLOAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// mirrors src/lib/forms.ts (sidecar is plain Node, no TS transpilation)
const PHONE_STRIP_RE = /[\s+\-()]/g;
const PHONE_DIGIT_RE = /\d/g;
function isValidPhone(value) {
  const stripped = value.replace(PHONE_STRIP_RE, "");
  const digitCount = (stripped.match(PHONE_DIGIT_RE) ?? []).length;
  return digitCount >= 6;
}
function isValidDateString(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return !Number.isNaN(Date.parse(trimmed));
}

const CONTACT_FIELD_CONFIG = {
  contact: {
    required: ["name", "email"],
    optional: ["body", "style", "description", "website"],
    maxLengths: { name: 100, email: 200, body: 5000, style: 200, description: 5000, website: 500 },
    subjectPrefix: "Contacto web",
    honeypot: "website",
  },
  booking: {
    required: ["nombre", "email", "telefono"],
    optional: ["estilo", "zona", "tamano", "fecha", "descripcion", "sitio_web"],
    maxLengths: {
      nombre: 100, email: 200, telefono: 50,
      estilo: 200, zona: 200, tamano: 200, fecha: 50,
      descripcion: 5000, sitio_web: 500,
    },
    subjectPrefix: "Reserva web",
    honeypot: "sitio_web",
  },
};

function escapeHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detectContactKind(payload) {
  if (payload.form === "contact" || payload.form === "booking") return payload.form;
  if (typeof payload.nombre === "string") return "booking";
  if (typeof payload.name === "string") return "contact";
  return undefined;
}

function validateContactPayload(kind, payload) {
  const config = CONTACT_FIELD_CONFIG[kind];
  const errors = [];

  const checkField = (field, { required, maxLength }) => {
    const value = payload[field];
    if (value === undefined || value === null) {
      if (required) errors.push({ field, reason: "missing" });
      return;
    }
    if (typeof value !== "string") {
      errors.push({ field, reason: "invalid_type" });
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      if (required) errors.push({ field, reason: "missing" });
      return;
    }
    if (typeof maxLength === "number" && trimmed.length > maxLength) {
      errors.push({ field, reason: "too_long", max: maxLength });
    }
  };

  for (const field of config.required) {
    checkField(field, { required: true, maxLength: config.maxLengths[field] });
  }
  for (const field of config.optional) {
    checkField(field, { required: false, maxLength: config.maxLengths[field] });
  }

  if (typeof payload.email === "string" && payload.email.trim() && !EMAIL_REGEX.test(payload.email.trim())) {
    if (!errors.some(e => e.field === "email")) errors.push({ field: "email", reason: "invalid_format" });
  }

  if (kind === "booking") {
    if (typeof payload.telefono === "string" && payload.telefono.trim() && !isValidPhone(payload.telefono)) {
      if (!errors.some(e => e.field === "telefono")) errors.push({ field: "telefono", reason: "invalid_format" });
    }
    if (typeof payload.fecha === "string" && payload.fecha.trim() && !isValidDateString(payload.fecha)) {
      if (!errors.some(e => e.field === "fecha")) errors.push({ field: "fecha", reason: "invalid_format" });
    }
  }

  return errors;
}

function honeypotTripped(kind, payload) {
  const field = CONTACT_FIELD_CONFIG[kind].honeypot;
  const value = payload[field];
  return typeof value === "string" && value.trim() !== "";
}

function buildContactEmailHtml(kind, payload) {
  const config = CONTACT_FIELD_CONFIG[kind];
  const fields = [...config.required, ...config.optional].filter(f => f !== config.honeypot);
  const rows = fields
    .filter(f => f !== "email")
    .map((field) => {
      const value = payload[field];
      if (typeof value !== "string" || !value.trim()) return "";
      return `<tr><td style="padding:6px 12px;font-weight:bold;text-transform:uppercase;color:#555;border-bottom:1px solid #eee;font-size:12px;letter-spacing:0.05em;">${escapeHtml(field)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:14px;">${escapeHtml(value)}</td></tr>`;
    })
    .filter(Boolean)
    .join("");

  return `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#111;background:#fafafa;padding:24px;margin:0;">
<div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border:1px solid #e5e5e5;">
<h2 style="margin:0 0 16px;font-size:16px;text-transform:uppercase;letter-spacing:0.05em;color:#000;">${escapeHtml(config.subjectPrefix)}</h2>
<p style="margin:0 0 16px;color:#666;font-size:13px;">Nuevo mensaje desde el formulario web del sitio.</p>
<table style="width:100%;border-collapse:collapse;">${rows ? `<tbody>${rows}</tbody>` : ""}</table>
<p style="margin-top:24px;font-size:12px;color:#999;">Remitente: <a href="mailto:${escapeHtml(payload.email)}" style="color:#999;">${escapeHtml(payload.email)}</a></p>
</div></body></html>`;
}

function bodyFingerprint(rawBody) {
  return createHash("sha256").update(rawBody).digest("hex");
}

async function sendContactEmail({ kind, payload, rawBody, requestId }) {
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    logEvent("contact_not_configured", { requestId });
    return { ok: false, status: 503, error: "email_not_configured" };
  }
  const html = buildContactEmailHtml(kind, payload);
  const subject = `${CONTACT_FIELD_CONFIG[kind].subjectPrefix} · ${payload.email}`;
  const idempotencyKey = bodyFingerprint(rawBody);
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: payload.email,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const upstreamBody = await res.text().catch(() => "");
      return { ok: false, status: 502, error: "email_send_failed", upstreamStatus: res.status, upstreamBody };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, status: 502, error: "email_send_failed", errorMessage: error instanceof Error ? error.message : String(error) };
  }
}

async function handleContact(request, response, requestId) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return respond(response, 405, JSON.stringify({ error: "method_not_allowed" }), "application/json", { "Allow": "POST" });
  }

  const rate = checkContactRateLimit(getClientIp(request), requestId);
  if (!rate.ok) {
    return respond(response, rate.status, JSON.stringify({ error: rate.error }), "application/json");
  }

  let rawBody;
  try {
    rawBody = await readBody(request);
  } catch (error) {
    logEvent("contact_body_too_large", { requestId, errorType: error instanceof Error ? error.name : "UnknownError" });
    return respond(response, 413, JSON.stringify({ error: "payload_too_large" }), "application/json");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    logEvent("contact_invalid_json", { requestId });
    return respond(response, 400, JSON.stringify({ error: "invalid_request", details: [{ reason: "invalid_json" }] }), "application/json");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    logEvent("contact_invalid_request", { requestId, reason: "invalid_payload" });
    return respond(response, 400, JSON.stringify({ error: "invalid_request", details: [{ reason: "invalid_payload" }] }), "application/json");
  }

  for (const key of Object.keys(parsed)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(key)) {
      logEvent("contact_invalid_request", { requestId, reason: "forbidden_key", key: sanitizeLogValue(key) });
      // 400 without details — we don't reveal which reserved key tripped.
      return respond(response, 400, JSON.stringify({ error: "invalid_request" }), "application/json");
    }
  }

  const kind = detectContactKind(parsed);
  if (!kind) {
    logEvent("contact_invalid_request", { requestId, reason: "unknown_form_kind" });
    return respond(response, 400, JSON.stringify({ error: "invalid_request", details: [{ reason: "unknown_form_kind" }] }), "application/json");
  }

  const errors = validateContactPayload(kind, parsed);
  if (errors.length > 0) {
    logEvent("contact_invalid_request", {
      requestId,
      kind,
      errors: errors.map(e => sanitizeLogValue(JSON.stringify(e))),
    });
    return respond(response, 400, JSON.stringify({ error: "invalid_request", details: errors }), "application/json");
  }

  if (honeypotTripped(kind, parsed)) {
    // Silently accept. Do not log as an error — don't tip off spammers.
    return respond(response, 200, JSON.stringify({ ok: true }), "application/json");
  }

  const send = await sendContactEmail({ kind, payload: parsed, rawBody, requestId });
  if (!send.ok) {
    logEvent("contact_send_failed", {
      requestId,
      kind,
      upstreamStatus: send.upstreamStatus,
      upstreamBody: sanitizeLogValue(send.upstreamBody),
      errorMessage: sanitizeLogValue(send.errorMessage),
    });
    return respond(response, send.status, JSON.stringify({ error: send.error }), "application/json");
  }

  logEvent("contact_send_succeeded", { requestId, kind });
  return respond(response, 200, JSON.stringify({ ok: true }), "application/json");
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

    // Contact / booking form submission → transactional email via Resend.
    // All methods handled inside (returns 405 for non-POST).
    if (url.pathname === "/api/contact") {
      return handleContact(request, response, requestId);
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
