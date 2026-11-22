// Vercel serverless endpoint. Only public Supabase client settings are exposed.
module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const payload = JSON.stringify({ url, anonKey }).replace(/</g, "\\u003c");
  res.status(200).send("window.FIELDDESK_SUPABASE = " + payload + ";");
};
