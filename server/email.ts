import nodemailer from "nodemailer";

interface SpendEmailData {
  amount: string;
  category: string;
  date: Date | string;
  description?: string | null;
  loggedByName: string;
  clientName?: string | null;
  receiptUrl?: string | null;
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

  const isImage = entry.receiptUrl && !entry.receiptUrl.toLowerCase().endsWith(".pdf");
  const isPdf = entry.receiptUrl && entry.receiptUrl.toLowerCase().endsWith(".pdf");

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
    .receipt-section { padding: 20px 28px; border-top: 1px solid #eee; }
    .receipt-section h3 { margin: 0 0 12px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .receipt-img { width: 100%; max-width: 460px; border-radius: 6px; border: 1px solid #eee; display: block; }
    .receipt-link { display: inline-block; padding: 10px 20px; background: #BE1916; color: #fff; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; }
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
    ${entry.receiptUrl ? `
    <div class="receipt-section">
      <h3>Attached Receipt</h3>
      ${isImage ? `<img src="${entry.receiptUrl}" alt="Receipt" class="receipt-img" />` : ""}
      ${isPdf ? `<a href="${entry.receiptUrl}" class="receipt-link" target="_blank">View PDF Receipt</a>` : ""}
    </div>` : ""}
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailLayout(headerTitle: string, headerSubtitle: string, bodyHtml: string): string {
  return `
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
    .body { padding: 28px; color: #222; font-size: 14px; line-height: 1.6; }
    .body h2 { margin: 0 0 12px; font-size: 18px; color: #111; }
    .body p { margin: 0 0 10px; }
    .meta { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 14px 16px; margin-top: 16px; font-size: 13px; color: #555; }
    .meta strong { color: #333; }
    .footer { background: #fafafa; border-top: 1px solid #eee; padding: 16px 28px; text-align: center; font-size: 11px; color: #aaa; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${headerTitle}</h1>
      <p>${headerSubtitle}</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">Sent automatically from M5 Services CRM</div>
  </div>
</body>
</html>`.trim();
}

function getTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  if (!smtpUser || !smtpPass) return null;
  return {
    transport: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    }),
    from: process.env.SMTP_FROM || `M5 CRM <${smtpUser}>`,
  };
}

export async function sendTaskAssignedEmail(
  toEmail: string,
  data: { taskTitle: string; assignedByName: string; dueDate?: Date | string | null; description?: string | null }
): Promise<void> {
  const t = getTransporter();
  if (!t) { console.warn("[email] SMTP not configured — skipping task assigned email"); return; }
  const dueLine = data.dueDate ? `<p><strong>Due:</strong> ${escapeHtml(formatDate(data.dueDate))}</p>` : "";
  const descLine = data.description ? `<p><strong>Description:</strong> ${escapeHtml(data.description)}</p>` : "";
  const html = buildEmailLayout(
    "Task Assigned to You",
    "M5 Services · Tasks",
    `<h2>${escapeHtml(data.taskTitle)}</h2><p>You have been assigned a new task by <strong>${escapeHtml(data.assignedByName)}</strong>.</p><div class="meta">${dueLine}${descLine}</div>`
  );
  await t.transport.sendMail({ from: t.from, to: toEmail, subject: `Task Assigned: ${data.taskTitle}`, html });
  console.log(`[email] Task assigned email sent to ${toEmail}`);
}

export async function sendTaskDueEmail(
  toEmail: string,
  data: { tasks: { title: string; dueDate: Date | string }[] }
): Promise<void> {
  const t = getTransporter();
  if (!t) { console.warn("[email] SMTP not configured — skipping task due email"); return; }
  const taskRows = data.tasks.map(task => `<p>• <strong>${escapeHtml(task.title)}</strong> — due ${escapeHtml(formatDate(task.dueDate))}</p>`).join("");
  const html = buildEmailLayout(
    "Tasks Due Today",
    "M5 Services · Tasks",
    `<h2>You have ${data.tasks.length} task${data.tasks.length !== 1 ? "s" : ""} due today</h2><div class="meta">${taskRows}</div>`
  );
  await t.transport.sendMail({ from: t.from, to: toEmail, subject: `Reminder: ${data.tasks.length} Task${data.tasks.length !== 1 ? "s" : ""} Due Today`, html });
  console.log(`[email] Task due email sent to ${toEmail}`);
}

export async function sendAnnouncementEmail(
  toEmail: string,
  data: { title: string; message?: string | null; priority?: string; type?: string }
): Promise<void> {
  const t = getTransporter();
  if (!t) { console.warn("[email] SMTP not configured — skipping announcement email"); return; }
  const priorityBadge = data.priority === "urgent" ? `<p style="color:#BE1916;font-weight:bold;">⚠ Urgent</p>` : "";
  const messagePart = data.message ? `<p>${escapeHtml(data.message)}</p>` : "";
  const html = buildEmailLayout(
    "New Announcement",
    "M5 Services · Announcements",
    `<h2>${escapeHtml(data.title)}</h2>${priorityBadge}${messagePart}`
  );
  await t.transport.sendMail({ from: t.from, to: toEmail, subject: `Announcement: ${data.title}`, html });
  console.log(`[email] Announcement email sent to ${toEmail}`);
}

export async function sendReminderEmail(
  toEmail: string,
  data: { title: string; message?: string | null; dueAt: Date | string }
): Promise<void> {
  const t = getTransporter();
  if (!t) { console.warn("[email] SMTP not configured — skipping reminder email"); return; }
  const messagePart = data.message ? `<p>${escapeHtml(data.message)}</p>` : "";
  const html = buildEmailLayout(
    "New Reminder",
    "M5 Services · Reminders",
    `<h2>${escapeHtml(data.title)}</h2>${messagePart}<div class="meta"><p><strong>Due:</strong> ${escapeHtml(formatDate(data.dueAt))}</p></div>`
  );
  await t.transport.sendMail({ from: t.from, to: toEmail, subject: `Reminder: ${data.title}`, html });
  console.log(`[email] Reminder email sent to ${toEmail}`);
}
