import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const passwordResetTokensTable = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ userIdx: index("password_reset_tokens_user_id_idx").on(table.userId) }),
);

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
