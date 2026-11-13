/** Sends mail through Resend when configured; otherwise logs it (development). */
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email disabled] to=${to} subject=${subject}\n${text}`);
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "MEGHAM <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  if (!response.ok) console.error("Email delivery failed", response.status);
  return response.ok;
}
