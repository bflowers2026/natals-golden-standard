// ============================================================
// netlify/functions/diag.js  — NEW diagnostics endpoint
// The Golden Standard · Natal's AC, Plumbing & Electric
//
// Visit  https://YOUR-SITE.netlify.app/.netlify/functions/diag
// (or /api/diag once the redirect below is added).
//
// Reports WHICH environment variables the FUNCTION RUNTIME can
// actually see — never the values. This is the fastest way to
// prove whether "env vars can't be read" is a scope/redeploy
// problem (vars missing here) or an API problem (vars present
// here but the key/URL is wrong).
// ============================================================

exports.handler = async () => {
  const present = (name) =>
    typeof process.env[name] === "string" && process.env[name].trim().length > 0;

  const len = (name) => (process.env[name] || "").length;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(
      {
        ok: true,
        runtime: {
          node: process.version,            // confirms the function actually ran
          deployContext: process.env.CONTEXT || null, // production / deploy-preview / branch-deploy
        },
        // true  = the runtime can read it  → scope is correct
        // false = NOT visible to functions → fix the scope, then redeploy
        envVisibleToFunctions: {
          ANTHROPIC_API_KEY: present("ANTHROPIC_API_KEY"),
          GOOGLE_SCRIPT_URL: present("GOOGLE_SCRIPT_URL"),
          SITE_PASSWORD: present("SITE_PASSWORD"),
        },
        // lengths let you sanity-check a value got pasted fully,
        // without ever exposing the secret itself
        lengths: {
          ANTHROPIC_API_KEY: len("ANTHROPIC_API_KEY"),
          GOOGLE_SCRIPT_URL: len("GOOGLE_SCRIPT_URL"),
          SITE_PASSWORD: len("SITE_PASSWORD"),
        },
        hint:
          "If any value above is false, the variable is NOT scoped to Functions (or you haven't redeployed). " +
          "Netlify > Site configuration > Environment variables > edit each var > set Scopes to include 'Functions' " +
          "(and 'Runtime'), Save, then Deploys > Trigger deploy > Clear cache and deploy site.",
      },
      null,
      2
    ),
  };
};
