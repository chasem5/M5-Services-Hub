const GMAIL_CONNECTOR_ID = "ccfg_google-mail_B959E7249792448ABBA58D46AF";

async function getGmailAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error("Gmail not connected. Please authorize your Gmail account in Settings.");
  }
  const identity = process.env.REPL_IDENTITY ?? "";
  const renewal = process.env.WEB_REPL_RENEWAL ?? "";
  const res = await fetch(`https://${hostname}/v1/token/${GMAIL_CONNECTOR_ID}`, {
    headers: {
      "X-Replit-Identity": identity,
      "X-Replit-Renewal": renewal,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail token error (${res.status}): ${text}. Please reconnect Gmail in Settings.`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBodyFromParts(parts: any[]): string {
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  for (const part of parts) {
    if (part.parts) {
      const nested = extractBodyFromParts(part.parts);
      if (nested) return nested;
    }
  }
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return stripHtml(decodeBase64Url(part.body.data));
    }
  }
  return "";
}

function parseEmailBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" ? stripHtml(decoded) : decoded;
  }
  if (payload.parts) {
    return extractBodyFromParts(payload.parts);
  }
  return "";
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFromHeader(from: string): { email: string; name: string } {
  const match = from.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim() || match[1].trim();
    return { name: name || email, email };
  }
  return { name: from, email: from };
}

export interface ParsedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  subject: string;
  bodySnippet: string;
  fullBody: string;
  receivedAt: Date;
}

export async function getUserGmailAddress(): Promise<string> {
  const token = await getGmailAccessToken();
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gmail profile error: ${res.status}`);
  const data = (await res.json()) as { emailAddress: string };
  return data.emailAddress;
}

export async function getGmailMessages(maxResults = 50): Promise<ParsedEmail[]> {
  const token = await getGmailAccessToken();

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=newer_than:30d`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.status}`);
  const listData = (await listRes.json()) as { messages?: { id: string }[] };
  const messageIds = listData.messages ?? [];

  const results: ParsedEmail[] = [];

  for (const { id } of messageIds) {
    try {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!msgRes.ok) continue;
      const msg = (await msgRes.json()) as any;

      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const fromRaw = parseHeader(headers, "from");
      const { email: fromEmail, name: fromName } = parseFromHeader(fromRaw);
      const toRaw = parseHeader(headers, "to");
      const toEmails = toRaw
        .split(",")
        .map((t) => {
          const { email } = parseFromHeader(t.trim());
          return email;
        })
        .filter(Boolean);
      const subject = parseHeader(headers, "subject") || "(no subject)";
      const dateHeader = parseHeader(headers, "date");
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date(Number(msg.internalDate));

      const fullBody = parseEmailBody(msg.payload);
      const bodySnippet = (msg.snippet ?? fullBody.slice(0, 200)).replace(/\s+/g, " ").trim();

      results.push({
        gmailMessageId: msg.id,
        gmailThreadId: msg.threadId,
        fromEmail,
        fromName,
        toEmails,
        subject,
        bodySnippet,
        fullBody: fullBody.slice(0, 8000),
        receivedAt,
      });
    } catch {
      // skip malformed messages
    }
  }

  return results;
}
