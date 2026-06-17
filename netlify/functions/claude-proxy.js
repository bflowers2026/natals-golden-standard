// ============================================================
// netlify/functions/claude-proxy.js
// Serverless proxy for Anthropic API calls.
// The ANTHROPIC_API_KEY is stored in Netlify environment
// variables — it never touches the browser.
// ============================================================

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Verify site password from request header
  const sitePassword = process.env.SITE_PASSWORD;
  const requestPassword = event.headers["x-site-password"];
  if (sitePassword && requestPassword !== sitePassword) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY not configured in Netlify environment variables. Go to Site Settings > Environment Variables and add it." })
    };
  }

  try {
    const body = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Proxy error: " + err.message }),
    };
  }
};
