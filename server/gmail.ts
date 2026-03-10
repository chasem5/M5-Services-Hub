// Per-user Gmail OAuth integration using Google OAuth2 with GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
import { google } from "googleapis";
import type { User } from "@shared/schema";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your Replit secrets."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret);
}

export function buildRedirectUri(host: string): string {
  if (process.env.GMAIL_REDIRECT_URI) {
    return process.env.GMAIL_REDIRECT_URI;
  }
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/api/auth/gmail/callback`;
}

export function getGmailAuthUrl(redirectUri: string, state: string): string {
  const oauth2Client = getOAuth2Client();
  oauth2Client.redirectUri = redirectUri;
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
    redirect_uri: redirectUri,
  });
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string | null;
  expiry_date: number | null;
  email: string;
}> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.redirectUri = redirectUri;

  const { tokens } = await oauth2Client.getToken({ code, redirect_uri: redirectUri });
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
    email: userInfo.data.email!,
  };
}

async function getGmailClientForUser(user: User) {
  if (!user.gmailConnected || !user.gmailAccessToken) {
    throw new Error("Gmail not connected. Please connect your Gmail account in Settings.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken ?? undefined,
    expiry_date: user.gmailTokenExpiry ? user.gmailTokenExpiry.getTime() : undefined,
  });

  const isExpired =
    user.gmailTokenExpiry && user.gmailTokenExpiry.getTime() < Date.now() + 60000;

  if (isExpired && user.gmailRefreshToken) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const { storage } = await import("./storage");
    await storage.updateGmailTokens(user.id, {
      gmailAccessToken: credentials.access_token ?? user.gmailAccessToken,
      gmailRefreshToken: credentials.refresh_token ?? user.gmailRefreshToken ?? null,
      gmailTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      gmailEmail: user.gmailEmail ?? null,
      gmailConnected: true,
    });
  }

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
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x200B;/g, "")
    .replace(/\u200B/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanEmailBody(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  let inSignature = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect signature delimiter lines (-- or ___ or ===) and stop
    if (/^[-_=]{2,}\s*$/.test(trimmed)) {
      inSignature = true;
      break;
    }

    // Skip if we're in signature territory
    if (inSignature) continue;

    // Skip lines that are purely a URL
    if (/^https?:\/\/\S+$/.test(trimmed)) continue;

    // Skip quoted reply lines
    if (trimmed.startsWith(">")) continue;

    // Skip "On [date], [Name] <email> wrote:" attribution lines (multiline pattern)
    if (/^On .{5,}, .+ wrote:?\s*$/.test(trimmed)) continue;
    if (/^On .{5,}$/.test(trimmed) && i + 1 < lines.length && lines[i + 1]?.trim().endsWith("wrote:")) {
      i++; // skip the next line too
      continue;
    }

    // Skip lines that are mostly special characters (tracking pixels, code artifacts)
    const specialCharRatio = (trimmed.match(/[^a-zA-Z0-9\s.,!?'"@#$%&*()-]/g) ?? []).length / Math.max(trimmed.length, 1);
    if (trimmed.length > 10 && specialCharRatio > 0.5) continue;

    // Skip lines that look like HTML artifacts leftover
    if (/^(={10,}|-{10,}|\*{10,})/.test(trimmed)) continue;

    // Skip cid: image references
    if (/^\[cid:/i.test(trimmed) || /^cid:/i.test(trimmed)) continue;

    cleaned.push(line);
  }

  // Collapse 3+ consecutive blank lines to 2
  return cleaned
    .join("\n")
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
  if (payload.parts) return extractBodyFromParts(payload.parts);
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

function parseEmailList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => parseFromHeader(t.trim()).email.toLowerCase())
    .filter(Boolean);
}

export interface ParsedEmail {
  gmailMessageId: string;
  gmailThreadId: string;
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  bodySnippet: string;
  fullBody: string;
  receivedAt: Date;
}

export async function getUserGmailAddress(user: User): Promise<string> {
  return user.gmailEmail ?? "";
}

export async function getGmailMessages(user: User, maxResults = 50): Promise<ParsedEmail[]> {
  const gmail = await getGmailClientForUser(user);

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
      const msgRes = await gmail.users.messages.get({ userId: "me", id, format: "full" });
      const msg = msgRes.data;
      const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];

      const fromRaw = parseHeader(headers, "from");
      const { email: fromEmail, name: fromName } = parseFromHeader(fromRaw);
      const toRaw = parseHeader(headers, "to");
      const toEmails = parseEmailList(toRaw);
      const ccRaw = parseHeader(headers, "cc");
      const ccEmails = parseEmailList(ccRaw);

      const subject = parseHeader(headers, "subject") || "(no subject)";
      const dateHeader = parseHeader(headers, "date");
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date(Number(msg.internalDate));

      const rawBody = parseEmailBody(msg.payload);
      const fullBody = cleanEmailBody(rawBody);
      const bodySnippet = (msg.snippet ?? fullBody.slice(0, 200)).replace(/\s+/g, " ").trim();

      results.push({
        gmailMessageId: msg.id!,
        gmailThreadId: msg.threadId!,
        fromEmail,
        fromName,
        toEmails,
        ccEmails,
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
