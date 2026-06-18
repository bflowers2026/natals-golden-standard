// ============================================================
// netlify/functions/claude-proxy.js  — hardened
// Serverless proxy for Anthropic API calls.
// ANTHROPIC_API_KEY (+ SITE_PASSWORD) live in Netlify env vars,
// scoped to Functions / Runtime. They never touch the browser.
// ============================================================

const json = (statusCode, obj) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-site-password",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // --- gate on site password (skip only if SITE_PASSWORD is intentionally unset) ---
  const sitePassword = process.env.SITE_PASSWORD;
  const requestPassword = event.headers["x-site-password"];
  if (sitePassword && requestPassword !== sitePassword) {
    return json(401, { error: "Unauthorized" });
  }

  // --- env var must be visible to the function runtime ---
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return json(503, {
      configError: true,
      error:
        "ANTHROPIC_API_KEY is not visible to this function. In Netlify, edit the variable so its Scopes " +
        "include 'Functions' (and 'Runtime'), Save, then Deploys > Trigger deploy. " +
        "Confirm with /.netlify/functions/diag.",
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: "Bad request body" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }

    // Surface Anthropic's own error clearly so a bad KEY or a bad MODEL
    // is never mistaken for "env var not configured".
    if (!response.ok) {
      const apiMsg = (data && data.error && data.error.message) || text || "Unknown error";
      return json(response.status, {
        error: "Anthropic API rejected the request (HTTP " + response.status + "): " + apiMsg,
        anthropicType: data && data.error && data.error.type,
      });
    }

    return json(200, data);
  } catch (err) {
    return json(502, { error: "Proxy network error: " + err.message });
  }
};
