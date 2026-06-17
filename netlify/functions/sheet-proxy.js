// ============================================================
// netlify/functions/sheet-proxy.js
// Serverless proxy for Google Apps Script calls.
// The GOOGLE_SCRIPT_URL is stored in Netlify environment
// variables — managers never see the raw sheet URL.
// ============================================================

exports.handler = async (event) => {
  const sitePassword = process.env.SITE_PASSWORD;
  const requestPassword = event.headers["x-site-password"];
  if (sitePassword && requestPassword !== sitePassword) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GOOGLE_SCRIPT_URL not configured in Netlify environment variables." })
    };
  }

  try {
    if (event.httpMethod === "GET") {
      // Read all SOPs from sheet
      const response = await fetch(scriptUrl);
      const data = await response.json();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data),
      };
    }

    if (event.httpMethod === "POST") {
      // Write (upsert or delete) SOP to sheet
      const body = event.body;
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await response.json();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data),
      };
    }

    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Sheet proxy error: " + err.message }),
    };
  }
};
