import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("member").notNull(),
  gmailAccessToken: varchar("gmail_access_token", { length: 2048 }),
  gmailRefreshToken: varchar("gmail_refresh_token", { length: 2048 }),
  gmailTokenExpiry: timestamp("gmail_token_expiry"),
  gmailEmail: varchar("gmail_email"),
  gmailConnected: boolean("gmail_connected").default(false).notNull(),
  calendarAccessToken: varchar("calendar_access_token", { length: 2048 }),
  calendarRefreshToken: varchar("calendar_refresh_token", { length: 2048 }),
  calendarTokenExpiry: timestamp("calendar_token_expiry"),
  calendarEmail: varchar("calendar_email"),
  calendarConnected: boolean("calendar_connected").default(false).notNull(),
  dashboardFilter: varchar("dashboard_filter").default("all"),
  buildopsRepId: varchar("buildops_rep_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
