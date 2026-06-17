// ============================================================
// netlify/functions/auth.js
// Validates the site password on login.
// SITE_PASSWORD is set in Netlify environment variables.
// ============================================================

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { password } = JSON.parse(event.body);
    const sitePassword = process.env.SITE_PASSWORD;

    if (!sitePassword) {
      // No password set — allow all (open internal tool)
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (password === sitePassword) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ ok: false, error: "Incorrect password" }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
