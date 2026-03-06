import { google } from "googleapis";
import type { User } from "@shared/schema";

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getCalendarOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret);
}

export function buildCalendarRedirectUri(host: string): string {
  if (process.env.GOOGLE_CALENDAR_REDIRECT_URI) {
    return process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  }
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/api/auth/calendar/callback`;
}

export function getCalendarAuthUrl(redirectUri: string, state: string): string {
  const oauth2Client = getCalendarOAuth2Client();
  oauth2Client.redirectUri = redirectUri;
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPES,
    state,
    redirect_uri: redirectUri,
  });
}

export async function exchangeCalendarCode(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string | null;
  expiry_date: number | null;
  email: string;
}> {
  const oauth2Client = getCalendarOAuth2Client();
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

export async function getCalendarClient(user: User) {
  if (!user.calendarConnected || !user.calendarAccessToken) {
    throw new Error("Google Calendar not connected.");
  }

  const oauth2Client = getCalendarOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.calendarAccessToken,
    refresh_token: user.calendarRefreshToken ?? undefined,
    expiry_date: user.calendarTokenExpiry ? user.calendarTokenExpiry.getTime() : undefined,
  });

  const isExpired =
    user.calendarTokenExpiry && user.calendarTokenExpiry.getTime() < Date.now() + 60000;

  if (isExpired && user.calendarRefreshToken) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    const { storage } = await import("./storage");
    await storage.updateCalendarTokens(user.id, {
      calendarAccessToken: credentials.access_token ?? user.calendarAccessToken,
      calendarRefreshToken: credentials.refresh_token ?? user.calendarRefreshToken ?? null,
      calendarTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      calendarEmail: user.calendarEmail ?? null,
      calendarConnected: true,
    });
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  htmlLink: string | null;
  allDay: boolean;
}

export async function listUpcomingEvents(user: User, days = 7): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(user);

  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 20,
  });

  return (res.data.items ?? []).map((e) => ({
    id: e.id ?? "",
    title: e.summary ?? "(No title)",
    description: e.description ?? null,
    startTime: e.start?.dateTime ?? e.start?.date ?? "",
    endTime: e.end?.dateTime ?? e.end?.date ?? "",
    htmlLink: e.htmlLink ?? null,
    allDay: !e.start?.dateTime,
  }));
}

export async function createCalendarEvent(
  user: User,
  event: { title: string; description?: string; startTime: Date; endTime: Date }
): Promise<{ eventId: string; htmlLink: string }> {
  const calendar = await getCalendarClient(user);

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startTime.toISOString() },
      end: { dateTime: event.endTime.toISOString() },
    },
  });

  return {
    eventId: res.data.id ?? "",
    htmlLink: res.data.htmlLink ?? "",
  };
}
