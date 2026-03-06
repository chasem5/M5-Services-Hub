// Gmail integration via Replit connector: google-mail
import { google } from "googleapis";

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (
    connectionSettings &&
    connectionSettings.settings?.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("Gmail not connected — X-Replit-Token not found.");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=google-mail",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error(
      "Gmail not connected. Please authorize Gmail in your Replit integrations."
    );
  }

  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
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
  const gmail = await getUncachableGmailClient();
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.emailAddress ?? "";
}

export async function getGmailMessages(maxResults = 50): Promise<ParsedEmail[]> {
  const gmail = await getUncachableGmailClient();

  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "newer_than:30d",
  });

  const messageIds = listRes.data.messages ?? [];
  const results: ParsedEmail[] = [];

  for (const { id } of messageIds) {
    if (!id) continue;
    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });
      const msg = msgRes.data;
      const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];

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
      const receivedAt = dateHeader
        ? new Date(dateHeader)
        : new Date(Number(msg.internalDate));

      const fullBody = parseEmailBody(msg.payload);
      const bodySnippet = (msg.snippet ?? fullBody.slice(0, 200))
        .replace(/\s+/g, " ")
        .trim();

      results.push({
        gmailMessageId: msg.id!,
        gmailThreadId: msg.threadId!,
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
