// ============================================================
// netlify/functions/auth.js  — hardened
// Validates the site password on login.
// SITE_PASSWORD is set in Netlify environment variables
// (Scopes MUST include Functions / Runtime).
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
  // CORS preflight (harmless for same-origin; needed if ever called cross-origin)
  if (event.httpMethod === "OPTIONS") return json(204, {});

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const sitePassword = process.env.SITE_PASSWORD;

  // IMPORTANT CHANGE vs. the original:
  // The old code returned { ok: true } when SITE_PASSWORD was missing,
  // which made login SUCCEED even when env vars weren't being read —
  // hiding the real problem. We now report the misconfiguration instead.
  if (!sitePassword || !sitePassword.trim()) {
    return json(503, {
      ok: false,
      configError: true,
      error:
        "SITE_PASSWORD is not visible to this function. Set it in Netlify > Environment variables " +
        "with Scopes including 'Functions', then redeploy. Check /.netlify/functions/diag to confirm.",
    });
  }

  let password;
  try {
    ({ password } = JSON.parse(event.body || "{}"));
  } catch (err) {
    return json(400, { ok: false, error: "Bad request body" });
  }

  if (password === sitePassword) {
    return json(200, { ok: true });
  }
  return json(401, { ok: false, error: "Incorrect password" });
};
