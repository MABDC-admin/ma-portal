// Server-only mail helper for the MABDC mail API.
// Never import from browser modules.

const MAIL_URL = "https://api-mail.mabdc.com/v1/emails";
const FROM_ADDRESS = "notifications@mabdc.org";

export type MailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendMabdcEmail({ to, subject, html }: MailInput): Promise<void> {
  const apiKey = process.env.MABDC_MAIL_API_KEY;
  if (!apiKey) {
    throw new Error("Email delivery is not configured");
  }

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    throw new Error("Email recipient is required");
  }

  for (const recipient of recipients) {
    const res = await fetch(MAIL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: recipient, from: FROM_ADDRESS, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[mail] send failed ${res.status} to=${recipient}: ${body}`);
      throw new Error("Email delivery failed");
    }
  }
}

export function renderEmail(opts: {
  title: string;
  intro: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const { title, intro, bodyHtml = "", ctaLabel, ctaUrl } = opts;
  const cta =
    ctaLabel && ctaUrl
      ? `<p style="margin:24px 0"><a href="${ctaUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${escapeHtml(ctaLabel)}</a></p>`
      : "";
  return `<!doctype html>
<html><body style="margin:0;background:#f5f6f8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      <h1 style="margin:0 0 8px;font-size:20px;color:#111827">${escapeHtml(title)}</h1>
      <p style="margin:0 0 16px;color:#4b5563;line-height:1.5">${escapeHtml(intro)}</p>
      ${bodyHtml}
      ${cta}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
      <p style="margin:0;font-size:12px;color:#9ca3af">AttendCloud · MABDC</p>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
