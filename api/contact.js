// Vercel serverless function: POST /api/contact
//
// Sends contact-form submissions by email through Resend (https://resend.com).
// Required environment variables (set them in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY      your Resend API key
//   CONTACT_TO_EMAIL    where inquiries go, e.g. mergeconsulting.mla@gmail.com
// Optional:
//   CONTACT_FROM_EMAIL  a sender on a domain verified in Resend (defaults to Resend's test sender)
//
// If the variables are missing, the endpoint answers 503 with { fallback: true }
// and the browser falls back to opening the visitor's email app.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const clip = (value, max) => String(value || "").trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }
  body = body || {};

  // Honeypot: real visitors never fill this in. Pretend success so bots move on.
  if (body.company_site) return res.status(200).json({ ok: true });

  const data = {
    name: clip(body.name, 120),
    email: clip(body.email, 200),
    phone: clip(body.phone, 40),
    service: clip(body.service, 80),
    message: clip(body.message, 5000),
  };

  if (!EMAIL_RE.test(data.email)) return res.status(400).json({ error: "A valid email is required." });
  if (data.message.length < 10) return res.status(400).json({ error: "Message is too short." });

  const { RESEND_API_KEY, CONTACT_TO_EMAIL } = process.env;
  const from = process.env.CONTACT_FROM_EMAIL || "Merge Consulting Website <onboarding@resend.dev>";

  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
    return res.status(503).json({ error: "Email delivery is not configured.", fallback: true });
  }

  const rows = [
    ["Name", data.name || "—"],
    ["Email", data.email],
    ["Phone", data.phone || "—"],
    ["Service", data.service || "—"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#586a62">${k}</td><td style="padding:4px 0"><strong>${escapeHtml(v)}</strong></td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#17231e">
      <h2 style="margin:0 0 16px">New website inquiry</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">${rows}</table>
      <p style="white-space:pre-wrap;margin:0">${escapeHtml(data.message)}</p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: CONTACT_TO_EMAIL.split(",").map((s) => s.trim()),
        reply_to: data.email,
        subject: `Website inquiry${data.service ? ` — ${data.service}` : ""}${data.name ? ` from ${data.name}` : ""}`,
        html,
      }),
    });

    if (!r.ok) {
      console.error("Resend error", r.status, await r.text());
      return res.status(502).json({ error: "Could not send message.", fallback: true });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "Could not send message.", fallback: true });
  }
};
