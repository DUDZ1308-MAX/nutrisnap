import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const bodyPhotosTable = pgTable("body_photos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weight: integer("weight"),
  imageDataUrl: text("image_data_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBodyPhotoSchema = createInsertSchema(bodyPhotosTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertBodyPhoto = z.infer<typeof insertBodyPhotoSchema>;
export type BodyPhoto = typeof bodyPhotosTable.$inferSelect;
