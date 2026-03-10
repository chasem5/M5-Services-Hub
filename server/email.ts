import nodemailer from "nodemailer";

interface SpendEmailData {
  amount: string;
  category: string;
  date: Date | string;
  description?: string | null;
  loggedByName: string;
  clientName?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  meals_entertainment: "Meals & Entertainment",
  gifts: "Gifts",
  travel: "Travel",
  events: "Events",
  other: "Other",
};

function formatCurrency(amount: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export async function sendSpendReceiptEmail(
  toEmail: string,
  entry: SpendEmailData
): Promise<void> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpFrom = process.env.SMTP_FROM || `M5 CRM <${smtpUser}>`;

  if (!smtpUser || !smtpPass) {
    console.warn("[email] SMTP_USER or SMTP_PASS not set — skipping receipt email");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const categoryLabel = CATEGORY_LABELS[entry.category] ?? entry.category;
  const subject = `BD Spend Receipt — ${formatCurrency(entry.amount)} · ${categoryLabel}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { background: #ffffff; border-radius: 8px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #BE1916; color: #ffffff; padding: 24px 28px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .body { padding: 28px; }
    .amount { font-size: 36px; font-weight: 800; color: #111; margin: 0 0 20px; }
    .row { display: flex; align-items: baseline; border-bottom: 1px solid #f0f0f0; padding: 10px 0; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; width: 130px; flex-shrink: 0; }
    .value { font-size: 14px; color: #222; font-weight: 500; }
    .footer { background: #fafafa; border-top: 1px solid #eee; padding: 16px 28px; text-align: center; font-size: 11px; color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>BD Spend Receipt</h1>
      <p>M5 Services · Business Development</p>
    </div>
    <div class="body">
      <div class="amount">${formatCurrency(entry.amount)}</div>
      <div class="row">
        <span class="label">Category</span>
        <span class="value">${categoryLabel}</span>
      </div>
      <div class="row">
        <span class="label">Date</span>
        <span class="value">${formatDate(entry.date)}</span>
      </div>
      ${entry.clientName ? `
      <div class="row">
        <span class="label">Company</span>
        <span class="value">${entry.clientName}</span>
      </div>` : ""}
      ${entry.description ? `
      <div class="row">
        <span class="label">Description</span>
        <span class="value">${entry.description}</span>
      </div>` : ""}
      <div class="row">
        <span class="label">Logged By</span>
        <span class="value">${entry.loggedByName}</span>
      </div>
    </div>
    <div class="footer">Sent automatically from M5 Services CRM</div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: smtpFrom,
    to: toEmail,
    subject,
    html,
  });

  console.log(`[email] Spend receipt sent to ${toEmail}`);
}
