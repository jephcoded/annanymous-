const RESEND_API_URL = "https://api.resend.com/emails";

const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set; skipping email to ${to}: ${subject}`);
    return;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Ananymous <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
};

const wrapEmailHtml = (heading, bodyHtml) => `
  <div style="background:#050505;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:420px;margin:0 auto;background:#0B0B10;border:1px solid #241B35;border-radius:20px;padding:28px;">
      <p style="color:#8B3DFF;font-weight:800;letter-spacing:2px;font-size:13px;margin:0 0 18px;">ANON</p>
      <h1 style="color:#F7F2FF;font-size:20px;margin:0 0 12px;">${heading}</h1>
      ${bodyHtml}
      <p style="color:#A89DBB;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
`;

exports.sendPasswordResetEmail = async (to, code) => {
  await sendEmail({
    to,
    subject: "Reset your Ananymous password",
    html: wrapEmailHtml(
      "Reset your password",
      `<p style="color:#A89DBB;font-size:14px;line-height:1.6;margin:0 0 18px;">Enter this code in the app to reset your password. It expires in 15 minutes.</p>
       <p style="color:#F7F2FF;font-size:32px;font-weight:800;letter-spacing:6px;text-align:center;margin:0 0 8px;">${code}</p>`,
    ),
  });
};

exports.sendVerificationEmail = async (to, code) => {
  await sendEmail({
    to,
    subject: "Verify your Ananymous email",
    html: wrapEmailHtml(
      "Confirm your email",
      `<p style="color:#A89DBB;font-size:14px;line-height:1.6;margin:0 0 18px;">Enter this code in the app to verify your email. It expires in 15 minutes.</p>
       <p style="color:#F7F2FF;font-size:32px;font-weight:800;letter-spacing:6px;text-align:center;margin:0 0 8px;">${code}</p>`,
    ),
  });
};
