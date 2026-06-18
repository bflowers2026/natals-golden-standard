// ============================================================
// netlify/functions/sheet-proxy.js  — hardened
// Serverless proxy for Google Apps Script (the SOP sheet).
// GOOGLE_SCRIPT_URL (+ SITE_PASSWORD) live in Netlify env vars,
// scoped to Functions / Runtime.
// ============================================================

const json = (statusCode, obj) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-site-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  const sitePassword = process.env.SITE_PASSWORD;
  const requestPassword = event.headers["x-site-password"];
  if (sitePassword && requestPassword !== sitePassword) {
    return json(401, { error: "Unauthorized" });
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl || !scriptUrl.trim()) {
    return json(503, {
      configError: true,
      error:
        "GOOGLE_SCRIPT_URL is not visible to this function. In Netlify, edit the variable so its Scopes " +
        "include 'Functions' (and 'Runtime'), Save, then redeploy. Confirm with /.netlify/functions/diag.",
    });
  }

  try {
    let response;

    if (event.httpMethod === "GET") {
      // Apps Script web apps 302-redirect to googleusercontent; fetch follows by default.
      response = await fetch(scriptUrl, { redirect: "follow" });
    } else if (event.httpMethod === "POST") {
      response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: event.body,
        redirect: "follow",
      });
    } else {
      return json(405, { error: "Method not allowed" });
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Apps Script returned HTML (often a login/permissions page) instead of JSON
      return json(502, {
        error:
          "Google Apps Script did not return JSON. Make sure the Web App is deployed with access " +
          "'Anyone' and the URL ends in /exec (not /dev).",
        preview: text.slice(0, 200),
      });
    }

    if (!response.ok) {
      return json(response.status, { error: "Apps Script error (HTTP " + response.status + ")", data });
    }

    return json(200, data);
  } catch (err) {
    return json(502, { error: "Sheet proxy network error: " + err.message });
  }
};
