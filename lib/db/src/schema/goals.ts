import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const goalsTable = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  calories: integer("calories").notNull().default(2100),
  protein: integer("protein").notNull().default(120),
  carbs: integer("carbs").notNull().default(230),
  fat: integer("fat").notNull().default(70),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({
  id: true,
  userId: true,
  updatedAt: true,
});

export const goalsSchema = z.object({
  calories: z.number().min(0).max(99999),
  protein: z.number().min(0).max(9999),
  carbs: z.number().min(0).max(9999),
  fat: z.number().min(0).max(9999),
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
